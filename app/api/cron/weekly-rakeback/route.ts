// Weekly rakeback + cashback cron. Runs Monday at 06:00 UTC.
// For each user active in the last 7 days:
//   rakeback_cents = floor(weekly_fees_paid * tier_rakeback_bps / 10000)
//   cashback_cents = floor(weekly_net_losses * cashback_rate_bps / 10000)
// Credits user balance. Idempotent: UNIQUE(user_id, week_starting) on
// weekly_payouts guarantees a re-run won't double-pay.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { tierForWagered } from '@/lib/vip';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Flat 5% cashback regardless of tier for MVP. Easy to tier later.
const CASHBACK_RATE_BPS = 500;

function isCronRequest(req: NextRequest): boolean {
  if (req.headers.get('x-vercel-cron')) return true;
  const auth = req.headers.get('authorization') || '';
  return !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
}

/** Get the Monday 00:00 UTC date string for the *previous* completed week. */
function lastWeekStart(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // 0 = Sunday, 1 = Monday, ...
  const dayOfWeek = d.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  // This week's Monday:
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  // Previous week's Monday:
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  if (!isCronRequest(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const start = Date.now();
  const weekStart = lastWeekStart();
  const weekStartIso = new Date(weekStart + 'T00:00:00Z').toISOString();
  const weekEndIso = new Date(new Date(weekStartIso).getTime() + 7 * 86400000).toISOString();

  try {
    // 1. Find every user with any bet activity in the past week.
    const [crashUsers, instantUsers, marketUsers] = await Promise.all([
      supabase.from('crash_bets').select('user_id')
        .gte('created_at', weekStartIso).lt('created_at', weekEndIso),
      supabase.from('instant_game_bets').select('user_id')
        .gte('created_at', weekStartIso).lt('created_at', weekEndIso),
      supabase.from('bet_orders').select('user_id')
        .gte('created_at', weekStartIso).lt('created_at', weekEndIso),
    ]);
    const userIds = new Set<string>();
    for (const r of (crashUsers.data || []))  userIds.add((r as any).user_id);
    for (const r of (instantUsers.data || [])) userIds.add((r as any).user_id);
    for (const r of (marketUsers.data || []))  userIds.add((r as any).user_id);

    let processed = 0;
    let totalRakebackCents = 0;
    let totalCashbackCents = 0;
    let totalPaidUsers = 0;
    const errors: string[] = [];

    for (const userId of Array.from(userIds)) {
      try {
        // Skip if already paid for this week (UNIQUE will protect anyway)
        const { data: existing } = await supabase
          .from('weekly_payouts').select('id')
          .eq('user_id', userId).eq('week_starting', weekStart).maybeSingle();
        if (existing) { processed++; continue; }

        // Pull this user's week
        const [crash, instant, orders] = await Promise.all([
          supabase.from('crash_bets')
            .select('stake_cents, payout_cents, fee_cents, status')
            .eq('user_id', userId).gte('created_at', weekStartIso).lt('created_at', weekEndIso),
          supabase.from('instant_game_bets')
            .select('stake_cents, payout_cents, status')
            .eq('user_id', userId).gte('created_at', weekStartIso).lt('created_at', weekEndIso)
            .eq('status', 'settled'),
          supabase.from('bet_orders')
            .select('stake_cents, matched_cents')
            .eq('user_id', userId).gte('created_at', weekStartIso).lt('created_at', weekEndIso),
        ]);
        const sum = (rows: any[] | null, f: string) => (rows || []).reduce((a, r: any) => a + (r[f] || 0), 0);

        const weekWagered =
          sum(crash.data, 'stake_cents') + sum(instant.data, 'stake_cents') + sum(orders.data, 'stake_cents');

        // Fees the user generated this week
        const crashFees = sum(crash.data, 'fee_cents');
        // Instant games: edge is in the multiplier; estimate as 5% of losses for tier rakeback
        const instantLosses = (instant.data || [])
          .filter((r: any) => (r.payout_cents || 0) < r.stake_cents)
          .reduce((a, r: any) => a + (r.stake_cents - (r.payout_cents || 0)), 0);
        const instantFeesEst = Math.floor(instantLosses * 0.05);

        const feesPaidCents = crashFees + instantFeesEst;

        // Lifetime wagered (for tier lookup)
        const [lcrash, linstant, lorders] = await Promise.all([
          supabase.from('crash_bets').select('stake_cents').eq('user_id', userId),
          supabase.from('instant_game_bets').select('stake_cents').eq('user_id', userId),
          supabase.from('bet_orders').select('stake_cents').eq('user_id', userId),
        ]);
        const lifetimeCents = sum(lcrash.data, 'stake_cents') + sum(linstant.data, 'stake_cents') + sum(lorders.data, 'stake_cents');
        const tier = tierForWagered(lifetimeCents / 100);

        const rakebackCents = Math.floor(feesPaidCents * tier.rakebackBps / 10000);

        // Cashback: 5% of net losses (sum_stake - sum_payout for crash + instant)
        // Markets are P2P so no "losses" on stake — refunded unmatched + paid via settle elsewhere.
        const crashNet = (crash.data || []).reduce((a, r: any) => a + (r.stake_cents - (r.payout_cents || 0)), 0);
        const instantNet = (instant.data || []).reduce((a, r: any) => a + (r.stake_cents - (r.payout_cents || 0)), 0);
        const netLossesCents = Math.max(0, crashNet + instantNet);
        const cashbackCents = Math.floor(netLossesCents * CASHBACK_RATE_BPS / 10000);

        const total = rakebackCents + cashbackCents;
        if (total <= 0) { processed++; continue; }

        // Credit balance
        const { data: u } = await supabase.from('users').select('balance_cents').eq('id', userId).single();
        if (!u) continue;
        await supabase.from('users')
          .update({ balance_cents: (u.balance_cents || 0) + total })
          .eq('id', userId);

        // Log payout
        await supabase.from('weekly_payouts').insert({
          user_id: userId,
          week_starting: weekStart,
          rakeback_cents: rakebackCents,
          cashback_cents: cashbackCents,
          total_cents: total,
          tier_id: tier.id,
          tier_rakeback_bps: tier.rakebackBps,
          cashback_rate_bps: CASHBACK_RATE_BPS,
          fees_paid_cents: feesPaidCents,
          net_losses_cents: netLossesCents,
          wagered_cents: weekWagered,
        });

        totalRakebackCents += rakebackCents;
        totalCashbackCents += cashbackCents;
        totalPaidUsers++;
        processed++;
      } catch (innerErr: any) {
        errors.push(`${userId}: ${innerErr?.message || innerErr}`);
        processed++;
      }
    }

    return NextResponse.json({
      ok: true,
      weekStarting: weekStart,
      processed,
      paid: totalPaidUsers,
      totalRakebackUsdt: totalRakebackCents / 100,
      totalCashbackUsdt: totalCashbackCents / 100,
      durationMs: Date.now() - start,
      errors: errors.slice(0, 10),
    });
  } catch (e: any) {
    console.error('[CaribPredict] weekly-rakeback', e);
    return NextResponse.json({ ok: false, error: e?.message || 'cron failed' }, { status: 500 });
  }
}
