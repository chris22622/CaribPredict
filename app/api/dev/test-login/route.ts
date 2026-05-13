// DEV-ONLY: one-click test login. Provisions a fixed test user idempotently
// and returns a self-contained HTML page that calls supabase.auth.setSession()
// with admin-minted tokens, then redirects to /. This avoids needing
// caribpredict.com whitelisted in Supabase's redirect URL list.
//
// Usage:  GET /api/dev/test-login?token=$DEV_TEST_LOGIN_TOKEN
//
// Fully disabled when DEV_TEST_LOGIN_TOKEN env var is unset.

import { NextRequest, NextResponse } from 'next/server';
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

  const admin = getServiceSupabase();

  // 1. Find or create the test auth user.
  let userId: string | null = null;
  try {
    const created = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      email_confirm: true,
      password: cryptoRandom(),
      user_metadata: { username: TEST_USERNAME, dev_test: true },
    });
    if (!created.error) {
      userId = created.data.user!.id;
    } else if (/already been registered|already exists/i.test(created.error.message)) {
      // Walk paginated list to find the existing one.
      let page = 1;
      while (page < 50 && !userId) {
        const list = await admin.auth.admin.listUsers({ page, perPage: 200 });
        const hit = list.data?.users.find(u => u.email?.toLowerCase() === TEST_EMAIL);
        if (hit) { userId = hit.id; break; }
        if (!list.data?.users.length || list.data.users.length < 200) break;
        page++;
      }
      if (!userId) throw new Error('user exists but could not be located in listUsers pages');
    } else {
      throw created.error;
    }
  } catch (e: any) {
    return NextResponse.json({ error: 'provision_failed', detail: e?.message }, { status: 500 });
  }

  // 2. Ensure public.users row exists with a play balance.
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

  // 3. Mint a magic link, extract its access + refresh tokens, and hand them
  //    to the browser inside an HTML page that calls setSession().
  let accessToken = '';
  let refreshToken = '';
  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: TEST_EMAIL,
    });
    if (error) throw error;
    // generateLink returns the action_link with #access_token=...&refresh_token=...
    // in newer versions OR it returns them as ?token= verify links. Handle both.
    const action = data?.properties?.action_link || '';
    const u = new URL(action);
    const hash = u.hash.startsWith('#') ? u.hash.slice(1) : u.hash;
    const hashParams = new URLSearchParams(hash);
    accessToken = hashParams.get('access_token') || '';
    refreshToken = hashParams.get('refresh_token') || '';
    // If the action_link is the verify-token style, fall back to verifyOtp here.
    if (!accessToken) {
      const verifyToken = u.searchParams.get('token');
      if (verifyToken) {
        // Use the public anon client to verify; service role can't be used for OTP verify.
        const anonUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const verifyRes = await fetch(`${anonUrl}/auth/v1/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: anonKey },
          body: JSON.stringify({ type: 'magiclink', token: verifyToken, email: TEST_EMAIL }),
        });
        const verifyJson = await verifyRes.json();
        accessToken = verifyJson.access_token || '';
        refreshToken = verifyJson.refresh_token || '';
      }
    }
    if (!accessToken || !refreshToken) throw new Error('failed to extract session tokens');
  } catch (e: any) {
    return NextResponse.json({ error: 'tokens_failed', detail: e?.message }, { status: 500 });
  }

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
      await sb.auth.setSession({
        access_token: ${JSON.stringify(accessToken)},
        refresh_token: ${JSON.stringify(refreshToken)},
      });
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

function cryptoRandom() {
  const arr = new Uint8Array(32);
  (globalThis.crypto || require('crypto').webcrypto).getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}
