import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { tierForWagered, nextTier, tierProgress, VIP_TIERS } from '@/lib/vip';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  try {
    const userId = new URL(req.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const sinceWeek = new Date(Date.now() - 7 * 86400000).toISOString();

    // Pull all wagering rows for this user across the three bet surfaces.
    const [orders, crash, instant] = await Promise.all([
      supabase.from('bet_orders').select('stake_cents, created_at').eq('user_id', userId),
      supabase.from('crash_bets').select('stake_cents, fee_cents, created_at').eq('user_id', userId),
      supabase.from('instant_game_bets').select('stake_cents, payout_cents, created_at').eq('user_id', userId),
    ]);
    const sum = (rows: any[] | null, field: string) =>
      (rows || []).reduce((a, r: any) => a + (r[field] || 0), 0);

    const lifetimeWageredCents =
      sum(orders.data, 'stake_cents') + sum(crash.data, 'stake_cents') + sum(instant.data, 'stake_cents');
    const lifetimeWageredUsdt = lifetimeWageredCents / 100;

    // House fee paid by this user (rough proxy): crash fees + instant losses × 5% +
    // markets matched-bet fees attributed proportionally (we approximate as
    // half the matched fee per matched user — exact split is per-side stake).
    const crashFeesCents = sum(crash.data, 'fee_cents');
    const instantLostCents = (instant.data || [])
      .filter((r: any) => (r.payout_cents || 0) < r.stake_cents)
      .reduce((a, r: any) => a + (r.stake_cents - (r.payout_cents || 0)), 0);
    // For instant games the edge is baked into the multiplier — treat losses ×
    // 5% as a rough estimate of paid edge. (Exact accounting is in stake -
    // payout but that includes ev variance; this is just a display estimate.)
    const instantEstFeeCents = Math.floor(instantLostCents * 0.05);

    const lifetimeFeesPaidEstCents = crashFeesCents + instantEstFeeCents;
    const last30Wagered = (rows: any[] | null) =>
      (rows || []).filter((r: any) => r.created_at >= since30)
        .reduce((a, r: any) => a + (r.stake_cents || 0), 0);
    const wagered30 = last30Wagered(orders.data) + last30Wagered(crash.data) + last30Wagered(instant.data);

    const current = tierForWagered(lifetimeWageredUsdt);
    const next = nextTier(current);
    const progress = tierProgress(lifetimeWageredUsdt, current, next);

    // Rakeback estimate for this week so far = fees paid this week × tier rate.
    const last7Crash = (crash.data || []).filter((r: any) => r.created_at >= sinceWeek)
      .reduce((a, r: any) => a + (r.fee_cents || 0), 0);
    const last7InstantLost = (instant.data || [])
      .filter((r: any) => r.created_at >= sinceWeek && (r.payout_cents || 0) < r.stake_cents)
      .reduce((a, r: any) => a + (r.stake_cents - (r.payout_cents || 0)), 0);
    const last7FeesEstCents = last7Crash + Math.floor(last7InstantLost * 0.05);
    const rakebackPendingCents = Math.floor(last7FeesEstCents * current.rakebackBps / 10000);

    return NextResponse.json({
      lifetimeWageredUsdt,
      wageredLast30Usdt: wagered30 / 100,
      lifetimeFeesPaidEstUsdt: lifetimeFeesPaidEstCents / 100,
      currentTier: current,
      nextTier: next,
      progress,
      remainingToNextUsdt: next ? Math.max(0, next.minWageredUsdt - lifetimeWageredUsdt) : 0,
      rakebackPendingThisWeekUsdt: rakebackPendingCents / 100,
      tiers: VIP_TIERS,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
