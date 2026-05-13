// DEV-ONLY: one-click test login. Idempotently provisions a fixed test user
// with a known password, signs in via signInWithPassword, and returns an
// HTML page that calls supabase.auth.setSession() then redirects to /.
//
// Usage:  GET /api/dev/test-login?token=$DEV_TEST_LOGIN_TOKEN
//
// Fully disabled when DEV_TEST_LOGIN_TOKEN env var is unset.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServiceSupabase } from '@/lib/supabase';

const TEST_EMAIL = 'dev-test@caribpredict.com';
const TEST_USERNAME = 'devtester';
const TEST_BALANCE_SATS = 1_000_000_000;
const TEST_BALANCE_CENTS = 5000;

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const required = process.env.DEV_TEST_LOGIN_TOKEN;
  if (!required) {
    return NextResponse.json({ error: 'dev test login is disabled' }, { status: 404 });
  }
  if (req.nextUrl.searchParams.get('token') !== required) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Password is deterministic from the token so we never need to store it.
  const testPassword = 'dev_' + required.slice(0, 32) + '_TEST';
  const admin = getServiceSupabase();

  // 1. Find or create the test auth user.
  let userId: string | null = null;
  try {
    const created = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      email_confirm: true,
      password: testPassword,
      user_metadata: { username: TEST_USERNAME, dev_test: true },
    });
    if (!created.error) {
      userId = created.data.user!.id;
    } else if (/already been registered|already exists/i.test(created.error.message)) {
      let page = 1;
      while (page < 50 && !userId) {
        const list = await admin.auth.admin.listUsers({ page, perPage: 200 });
        const hit = list.data?.users.find(u => u.email?.toLowerCase() === TEST_EMAIL);
        if (hit) { userId = hit.id; break; }
        if (!list.data?.users.length || list.data.users.length < 200) break;
        page++;
      }
      if (!userId) throw new Error('user exists but listUsers could not find it');
      // Reset password on the existing user so signInWithPassword works deterministically.
      await admin.auth.admin.updateUserById(userId, { password: testPassword, email_confirm: true });
    } else {
      throw created.error;
    }
  } catch (e: any) {
    return NextResponse.json({ error: 'provision_failed', detail: e?.message }, { status: 500 });
  }

  // 2. Ensure public.users row + top up balance.
  try {
    const { data: existingRow } = await admin
      .from('users').select('id, balance_satoshis')
      .eq('id', userId).maybeSingle();
    if (!existingRow) {
      await admin.from('users').insert({
        id: userId,
        username: TEST_USERNAME,
        balance_satoshis: TEST_BALANCE_SATS,
        balance_cents: TEST_BALANCE_CENTS,
      });
    } else if ((existingRow.balance_satoshis || 0) < TEST_BALANCE_SATS / 10) {
      await admin.from('users')
        .update({ balance_satoshis: TEST_BALANCE_SATS, balance_cents: TEST_BALANCE_CENTS })
        .eq('id', userId);
    }
  } catch (e: any) {
    console.warn('[dev/test-login] users row warning:', e?.message);
  }

  // 3. signInWithPassword to mint a real session.
  let accessToken = '';
  let refreshToken = '';
  try {
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await anon.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: testPassword,
    });
    if (error) throw error;
    accessToken = data.session?.access_token || '';
    refreshToken = data.session?.refresh_token || '';
    if (!accessToken || !refreshToken) throw new Error('no session returned');
  } catch (e: any) {
    return NextResponse.json({ error: 'signin_failed', detail: e?.message }, { status: 500 });
  }

  // 4. Hand the tokens to the browser via a tiny HTML bootstrap.
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Signing in…</title>
<style>
  body { background:#0B1F2E; color:#F3EFE7; font:14px/1.55 system-ui,Segoe UI,sans-serif;
         display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
  .card { text-align:center; padding:24px 32px; border:1px solid rgba(255,255,255,0.1);
          border-radius:14px; background:rgba(255,255,255,0.04); }
  h1 { font-family:Georgia,serif; font-weight:400; margin:0 0 8px; font-size:22px; }
  small { color:#cfc8b8; opacity:0.7; }
</style></head>
<body>
  <div class="card">
    <h1>Signing you in…</h1>
    <small>Redirecting to CaribPredict</small>
  </div>
  <script type="module">
    import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
    const sb = createClient(${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL)}, ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)});
    try {
      const { error } = await sb.auth.setSession({
        access_token: ${JSON.stringify(accessToken)},
        refresh_token: ${JSON.stringify(refreshToken)},
      });
      if (error) throw error;
      location.replace('/?dev=1');
    } catch (e) {
      document.body.innerText = 'setSession failed: ' + (e && e.message || e);
    }
  </script>
</body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
