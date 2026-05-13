// DEV-ONLY: one-click test login. Idempotently provisions a fixed test user,
// signs them in via the SSR-aware Supabase client so the session is written
// to cookies (the format @supabase/ssr expects on subsequent SSR/RSC reads),
// then redirects to /.
//
// Usage:  GET /api/dev/test-login?token=$DEV_TEST_LOGIN_TOKEN
//
// Fully disabled when DEV_TEST_LOGIN_TOKEN env var is unset.

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
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

  const testPassword = 'dev_' + required.slice(0, 32) + '_TEST';
  const admin = getServiceSupabase();

  // 1. Find or create test auth user (idempotent).
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
      // Reset password so signInWithPassword is deterministic.
      await admin.auth.admin.updateUserById(userId, { password: testPassword, email_confirm: true });
    } else {
      throw created.error;
    }
  } catch (e: any) {
    return NextResponse.json({ error: 'provision_failed', detail: e?.message }, { status: 500 });
  }

  // 2. Ensure public.users row + top up play balance.
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

  // 3. Sign in via the SSR-aware client so cookies are written in the
  //    exact format @supabase/ssr expects.
  const cookieStore = cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {/* outside response phase — ignore */}
          });
        },
      },
    },
  );

  try {
    const { error } = await sb.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: testPassword,
    });
    if (error) throw error;
  } catch (e: any) {
    return NextResponse.json({ error: 'signin_failed', detail: e?.message }, { status: 500 });
  }

  // 4. Cookies are now set on the response. Redirect to home.
  return NextResponse.redirect(new URL('/?dev=1', req.nextUrl.origin), { status: 302 });
}
