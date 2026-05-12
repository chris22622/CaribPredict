// Admin-only: settle a market. Pay winners, refund unmatched stakes,
// record fee, mark everything resolved. Returns aggregate payout summary.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { winnerPayoutCents } from '@/lib/matching';

const ADMIN_EMAILS = ['chrissanoleslie1990@gmail.com'];
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function isAdmin(req: NextRequest): Promise<boolean> {
  const cookieHeader = req.headers.get('cookie') || '';
  const accessToken = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/)?.[1];
  if (!accessToken) return false;
  try {
    const decoded = JSON.parse(decodeURIComponent(accessToken));
    const token = Array.isArray(decoded) ? decoded[0] : decoded?.access_token || decoded;
    if (!token || typeof token !== 'string') return false;
    const { data: { user } } = await supabase.auth.getUser(token);
    return !!user?.email && ADMIN_EMAILS.includes(user.email);
  } catch { return false; }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const marketId = params.id;
    const body = await req.json();
    const { winningOptionId, winningSide } = body as {
      winningOptionId?: string;     // option that resolved YES
      winningSide?: 'YES' | 'NO';   // side that wins for the option
    };
    if (!winningOptionId || (winningSide !== 'YES' && winningSide !== 'NO')) {
      return NextResponse.json({ error: 'winningOptionId + winningSide required' }, { status: 400 });
    }

    const { data: market } = await supabase
      .from('markets').select('id, resolved').eq('id', marketId).single();
    if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    if (market.resolved) return NextResponse.json({ error: 'Market already resolved' }, { status: 400 });

    // 1. Settle every matched_bets row for this market.
    const { data: allMatched } = await supabase
      .from('matched_bets')
      .select('*')
      .eq('market_id', marketId).eq('status', 'open');

    let totalPaidOut = 0;
    let totalFee = 0;
    let payouts = 0;

    for (const m of allMatched || []) {
      const isWinningOption = m.option_id === winningOptionId;
      // If this match was on the winning option AND `winningSide` is YES,
      // the yes_user wins; if NO, the no_user wins. If the match was on a
      // losing option, the NO side of THAT option wins (because the option
      // didn't happen).
      const winnerSideForThisMatch: 'YES' | 'NO' =
        isWinningOption ? winningSide : 'NO';
      const winnerUserId = winnerSideForThisMatch === 'YES' ? m.yes_user_id : m.no_user_id;
      const payout = winnerPayoutCents(m.total_pool_cents);

      // Credit winner balance
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

      // Update bet_orders status of yes_order and no_order (so user-side ledger reflects)
      await supabase.from('bet_orders').update({ status: winnerSideForThisMatch === 'YES' ? 'won' : 'lost' })
        .eq('id', m.yes_order_id);
      await supabase.from('bet_orders').update({ status: winnerSideForThisMatch === 'NO' ? 'won' : 'lost' })
        .eq('id', m.no_order_id);

      totalPaidOut += payout;
      totalFee += m.fee_cents;
      payouts++;
    }

    // 2. Refund all unmatched portions of any bet_orders for this market.
    const { data: openOrders } = await supabase
      .from('bet_orders').select('id, user_id, stake_cents, matched_cents, status')
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

    // 3. Mark market as resolved.
    await supabase.from('markets').update({
      resolved: true,
      resolution: winningSide === 'YES' ? winningOptionId : `NOT_${winningOptionId}`,
      updated_at: new Date().toISOString(),
    }).eq('id', marketId);

    return NextResponse.json({
      ok: true,
      marketId,
      winningOptionId,
      winningSide,
      payouts,
      totalPaidOutUsdt: totalPaidOut / 100,
      totalFeeUsdt: totalFee / 100,
      refundedOrders: refundedCount,
      refundedTotalUsdt: refundedTotal / 100,
    });
  } catch (e: any) {
    console.error('[CaribPredict] /api/markets/[id]/settle error', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
