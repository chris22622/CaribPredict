// Idempotent: call on every page load for an authenticated user.
// - Credits a 3 USDT welcome bonus if not already credited
// - Generates a referral code if missing
// - Optionally records a referrer (one-time, only before first deposit)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  WELCOME_BONUS_CENTS, WELCOME_BONUS_WAGERING_MULT, isLikelyReferralCode,
} from '@/lib/referrals';
import { sendEmail, welcomeBonusEmail } from '@/lib/email';

// Daily login bonus schedule (cents). Resets if user misses a day.
const DAILY_BONUS_CENTS: Record<number, number> = {
  1: 50, 2: 75, 3: 100, 4: 150, 5: 200, 6: 300, 7: 500,
};
function bonusForStreakDay(day: number): number {
  return DAILY_BONUS_CENTS[Math.min(7, Math.max(1, day))] || 500;
}
function utcDateString(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}
function dateDiffDays(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

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
      .select('id, balance_cents, bonus_balance_cents, welcome_bonus_credited, referral_code, referred_by_user_id, current_streak_days, last_login_bonus_date, lifetime_streak_high')
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
      // Email receipt for the welcome bonus (best-effort)
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(userId);
        const email = authUser?.user?.email;
        if (email) {
          await sendEmail({
            userId, toEmail: email,
            template: 'welcome-bonus',
            subject: `Welcome bonus credited · ${(WELCOME_BONUS_CENTS / 100).toFixed(2)} USDT free play`,
            html: welcomeBonusEmail(WELCOME_BONUS_CENTS / 100),
            payload: { amountCents: WELCOME_BONUS_CENTS },
          });
        }
      } catch {/* ignore */}
    }

    // ──────────────────────────────────────────────
    // Daily login bonus
    // ──────────────────────────────────────────────
    let dailyBonusCredited = false;
    let dailyBonusAmountUsdt = 0;
    let streakDay = 0;
    const today = utcDateString();
    if (user.last_login_bonus_date !== today) {
      // Determine new streak day
      let newStreak = 1;
      if (user.last_login_bonus_date) {
        const diff = dateDiffDays(user.last_login_bonus_date, today);
        if (diff === 1) newStreak = (user.current_streak_days || 0) + 1;
        else if (diff === 0) newStreak = user.current_streak_days || 1; // shouldn't happen
        else newStreak = 1; // missed at least one day
      }
      const cents = bonusForStreakDay(newStreak);
      const newHigh = Math.max(user.lifetime_streak_high || 0, newStreak);

      // Insert one-per-day row (idempotent via UNIQUE)
      const { error: dErr } = await supabase.from('daily_login_bonuses').insert({
        user_id: userId, bonus_date: today, amount_cents: cents, streak_day: newStreak,
      });
      if (!dErr) {
        // Credit bonus_balance with 10x wagering on bonus portion
        const fresh = await supabase.from('users').select('bonus_balance_cents, bonus_wagering_required_cents').eq('id', userId).single();
        const curBonusBal = fresh.data?.bonus_balance_cents || 0;
        const curBonusReq = fresh.data?.bonus_wagering_required_cents || 0;
        await supabase.from('users').update({
          bonus_balance_cents: curBonusBal + cents,
          bonus_wagering_required_cents: curBonusReq + cents * 10,
          current_streak_days: newStreak,
          last_login_bonus_date: today,
          lifetime_streak_high: newHigh,
        }).eq('id', userId);
        await supabase.from('bonus_grants').insert({
          user_id: userId, amount_cents: cents,
          reason: `daily-login-day-${newStreak}`, wagering_multiplier: 10,
        });
        dailyBonusCredited = true;
        dailyBonusAmountUsdt = cents / 100;
        streakDay = newStreak;
      }
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
      dailyBonus: {
        credited: dailyBonusCredited,
        amountUsdt: dailyBonusAmountUsdt,
        streakDay,
      },
      referrer: referrerInfo,
      user: refreshed,
    });
  } catch (e: any) {
    console.error('[CaribPredict] /api/user/init error', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
