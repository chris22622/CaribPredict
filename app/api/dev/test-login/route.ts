// DEV-ONLY: one-click test login. Provisions a fixed test user idempotently
// and returns a one-time magic-link redirect so the browser lands in an
// authenticated session.
//
// Usage:  GET /api/dev/test-login?token=$DEV_TEST_LOGIN_TOKEN
//
// Disabled if DEV_TEST_LOGIN_TOKEN env var isn't set. Remove the env var
// from Vercel to fully shut this off. Test user has balance pre-credited
// so the games and wallet flows can be exercised end-to-end.

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const TEST_EMAIL = 'dev-test@caribpredict.com';
const TEST_USERNAME = 'devtester';
const TEST_BALANCE_SATS = 1_000_000_000; // ~10 USDT-ish for play-money testing
const TEST_BALANCE_CENTS = 5000;          // 50 USDT for new-money columns

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const required = process.env.DEV_TEST_LOGIN_TOKEN;
  if (!required) {
    return NextResponse.json({ error: 'dev test login is disabled' }, { status: 404 });
  }
  const token = req.nextUrl.searchParams.get('token');
  if (token !== required) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = getServiceSupabase();

  // 1. Provision the auth user if missing.
  let userId: string | null = null;
  try {
    // listUsers is paginated; for a single fixed email this is fine.
    const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list.data?.users.find(u => u.email?.toLowerCase() === TEST_EMAIL);
    if (existing) {
      userId = existing.id;
    } else {
      const created = await admin.auth.admin.createUser({
        email: TEST_EMAIL,
        email_confirm: true,
        password: cryptoRandom(),
        user_metadata: { username: TEST_USERNAME, dev_test: true },
      });
      if (created.error) throw created.error;
      userId = created.data.user!.id;
    }
  } catch (e: any) {
    return NextResponse.json({ error: 'provision_failed', detail: e?.message }, { status: 500 });
  }

  // 2. Ensure the public users row exists with a play balance.
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
      // top up if it ran dry from previous testing
      await admin.from('users')
        .update({ balance_satoshis: TEST_BALANCE_SATS, balance_cents: TEST_BALANCE_CENTS })
        .eq('id', userId);
    }
  } catch (e: any) {
    // non-fatal — auth user can still log in
    console.warn('[dev/test-login] users row provisioning warning:', e?.message);
  }

  // 3. Generate a one-time magic link and redirect to it.
  try {
    const origin = req.nextUrl.origin;
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: TEST_EMAIL,
      options: { redirectTo: `${origin}/?dev=1` },
    });
    if (error || !data?.properties?.action_link) {
      throw error || new Error('no action_link returned');
    }
    return NextResponse.redirect(data.properties.action_link, { status: 302 });
  } catch (e: any) {
    return NextResponse.json({ error: 'magiclink_failed', detail: e?.message }, { status: 500 });
  }
}

function cryptoRandom() {
  // 32-byte hex; we never need to know this — magic link is the entry path.
  const arr = new Uint8Array(32);
  (globalThis.crypto || require('crypto').webcrypto).getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}
