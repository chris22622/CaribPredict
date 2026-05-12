// Shared settlement logic. Called by:
//  - POST /api/markets/[id]/settle       (admin manual settle)
//  - GET  /api/cron/auto-settle           (cron auto-settle)
//
// Pays winners 95% of pool, refunds unmatched portions, marks the market
// resolved. Idempotent guard: refuses to settle a market that is already
// resolved.

import { SupabaseClient } from '@supabase/supabase-js';
import { winnerPayoutCents } from './matching';

export interface SettleResult {
  ok: boolean;
  marketId: string;
  winningOptionId: string;
  winningSide: 'YES' | 'NO';
  payouts: number;
  totalPaidOutCents: number;
  totalFeeCents: number;
  refundedOrders: number;
  refundedTotalCents: number;
}

export async function settleMarket(
  supabase: SupabaseClient,
  marketId: string,
  winningOptionId: string,
  winningSide: 'YES' | 'NO',
): Promise<SettleResult> {
  const { data: market } = await supabase
    .from('markets').select('id, resolved').eq('id', marketId).single();
  if (!market) throw new Error('Market not found');
  if (market.resolved) throw new Error('Market already resolved');

  // 1. Settle every matched_bets row.
  const { data: allMatched } = await supabase
    .from('matched_bets').select('*').eq('market_id', marketId).eq('status', 'open');

  let totalPaidOut = 0;
  let totalFee = 0;
  let payouts = 0;

  for (const m of allMatched || []) {
    const isWinningOption = m.option_id === winningOptionId;
    const winnerSideForThisMatch: 'YES' | 'NO' = isWinningOption ? winningSide : 'NO';
    const winnerUserId = winnerSideForThisMatch === 'YES' ? m.yes_user_id : m.no_user_id;
    const payout = winnerPayoutCents(m.total_pool_cents);

    const { data: u } = await supabase.from('users')
      .select('balance_cents').eq('id', winnerUserId).single();
    if (u) {
      await supabase.from('users')
        .update({ balance_cents: (u.balance_cents || 0) + payout })
        .eq('id', winnerUserId);
    }

    await supabase.from('matched_bets').update({
      status: 'settled',
      winner_side: winnerSideForThisMatch,
      winner_payout_cents: payout,
      settled_at: new Date().toISOString(),
    }).eq('id', m.id);

    await supabase.from('bet_orders').update({ status: winnerSideForThisMatch === 'YES' ? 'won' : 'lost' })
      .eq('id', m.yes_order_id);
    await supabase.from('bet_orders').update({ status: winnerSideForThisMatch === 'NO' ? 'won' : 'lost' })
      .eq('id', m.no_order_id);

    totalPaidOut += payout;
    totalFee += m.fee_cents;
    payouts++;
  }

  // 2. Refund unmatched portions of any open/partial bet_orders.
  const { data: openOrders } = await supabase
    .from('bet_orders').select('id, user_id, stake_cents, matched_cents')
    .eq('market_id', marketId).in('status', ['open', 'partial']);

  let refundedCount = 0;
  let refundedTotal = 0;
  for (const o of openOrders || []) {
    const unmatched = (o.stake_cents || 0) - (o.matched_cents || 0);
    if (unmatched <= 0) continue;
    const { data: u } = await supabase.from('users').select('balance_cents').eq('id', o.user_id).single();
    if (u) {
      await supabase.from('users')
        .update({ balance_cents: (u.balance_cents || 0) + unmatched })
        .eq('id', o.user_id);
    }
    await supabase.from('bet_orders').update({ status: 'refunded' }).eq('id', o.id);
    refundedCount++;
    refundedTotal += unmatched;
  }

  // 3. Mark market resolved.
  await supabase.from('markets').update({
    resolved: true,
    resolution: winningSide === 'YES' ? winningOptionId : `NOT_${winningOptionId}`,
    updated_at: new Date().toISOString(),
  }).eq('id', marketId);

  return {
    ok: true,
    marketId,
    winningOptionId,
    winningSide,
    payouts,
    totalPaidOutCents: totalPaidOut,
    totalFeeCents: totalFee,
    refundedOrders: refundedCount,
    refundedTotalCents: refundedTotal,
  };
}

// Mark a market as voided: refund every matched_bet (both sides) and every
// unmatched portion. Mark market resolved with resolution = 'VOIDED'.
export async function voidMarket(supabase: SupabaseClient, marketId: string): Promise<void> {
  const { data: matched } = await supabase
    .from('matched_bets').select('*').eq('market_id', marketId).eq('status', 'open');
  for (const m of matched || []) {
    const credits = [
      { userId: m.yes_user_id, cents: m.yes_stake_cents },
      { userId: m.no_user_id,  cents: m.no_stake_cents  },
    ];
    for (const c of credits) {
      const { data: u } = await supabase.from('users').select('balance_cents').eq('id', c.userId).single();
      if (u) {
        await supabase.from('users')
          .update({ balance_cents: (u.balance_cents || 0) + c.cents }).eq('id', c.userId);
      }
    }
    await supabase.from('matched_bets').update({
      status: 'voided', settled_at: new Date().toISOString(),
    }).eq('id', m.id);
  }
  const { data: open } = await supabase
    .from('bet_orders').select('id, user_id, stake_cents, matched_cents')
    .eq('market_id', marketId).in('status', ['open', 'partial']);
  for (const o of open || []) {
    const unmatched = (o.stake_cents || 0) - (o.matched_cents || 0);
    if (unmatched <= 0) continue;
    const { data: u } = await supabase.from('users').select('balance_cents').eq('id', o.user_id).single();
    if (u) {
      await supabase.from('users')
        .update({ balance_cents: (u.balance_cents || 0) + unmatched }).eq('id', o.user_id);
    }
    await supabase.from('bet_orders').update({ status: 'refunded' }).eq('id', o.id);
  }
  await supabase.from('markets').update({
    resolved: true, resolution: 'VOIDED', updated_at: new Date().toISOString(),
  }).eq('id', marketId);
}
