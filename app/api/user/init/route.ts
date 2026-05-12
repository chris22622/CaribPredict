// Idempotent: call on every page load for an authenticated user.
// - Credits a 3 USDT welcome bonus if not already credited
// - Generates a referral code if missing
// - Optionally records a referrer (one-time, only before first deposit)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  WELCOME_BONUS_CENTS, WELCOME_BONUS_WAGERING_MULT, isLikelyReferralCode,
} from '@/lib/referrals';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, referredByCode } = body as { userId?: string; referredByCode?: string };
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    // 1. Load user (also confirms existence)
    const { data: user } = await supabase
      .from('users')
      .select('id, balance_cents, bonus_balance_cents, welcome_bonus_credited, referral_code, referred_by_user_id')
      .eq('id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const updates: Record<string, any> = {};

    // 2. Ensure referral_code exists. Generate via DB function if missing.
    if (!user.referral_code) {
      const { data: codeRow } = await supabase.rpc('cp_generate_referral_code');
      if (codeRow && typeof codeRow === 'string') {
        updates.referral_code = codeRow;
      }
    }

    // 3. Claim a referrer if the user has none and a valid code was supplied.
    let referrerInfo: { id: string; code: string } | null = null;
    if (!user.referred_by_user_id && referredByCode && isLikelyReferralCode(referredByCode)) {
      const code = referredByCode.toUpperCase();
      const { data: ref } = await supabase
        .from('users').select('id, referral_code').eq('referral_code', code).maybeSingle();
      if (ref && ref.id !== userId) {
        updates.referred_by_user_id = ref.id;
        referrerInfo = { id: ref.id, code };
      }
    }

    // 4. Credit welcome bonus if not yet credited.
    let bonusCredited = false;
    if (!user.welcome_bonus_credited) {
      updates.welcome_bonus_credited = true;
      updates.bonus_balance_cents = (user.bonus_balance_cents || 0) + WELCOME_BONUS_CENTS;
      updates.bonus_wagering_required_cents = WELCOME_BONUS_CENTS * WELCOME_BONUS_WAGERING_MULT;
      updates.bonus_wagering_completed_cents = 0;
      bonusCredited = true;
    }

    if (Object.keys(updates).length > 0) {
      const { error: upErr } = await supabase
        .from('users').update(updates).eq('id', userId);
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    if (bonusCredited) {
      await supabase.from('bonus_grants').insert({
        user_id: userId,
        amount_cents: WELCOME_BONUS_CENTS,
        reason: 'welcome',
        wagering_multiplier: WELCOME_BONUS_WAGERING_MULT,
      });
    }

    // 5. Re-fetch the user for the response
    const { data: refreshed } = await supabase
      .from('users')
      .select('id, balance_cents, bonus_balance_cents, bonus_wagering_required_cents, bonus_wagering_completed_cents, welcome_bonus_credited, referral_code, referred_by_user_id')
      .eq('id', userId).single();

    return NextResponse.json({
      ok: true,
      bonusJustCredited: bonusCredited,
      bonusAmountUsdt: bonusCredited ? WELCOME_BONUS_CENTS / 100 : 0,
      referrer: referrerInfo,
      user: refreshed,
    });
  } catch (e: any) {
    console.error('[CaribPredict] /api/user/init error', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
