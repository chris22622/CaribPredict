import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  planMatches, probabilityFromVolumes, consumedByOrder,
  OpenOrder, MIN_ORDER_CENTS, HOUSE_FEE_BPS,
} from '@/lib/matching';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const MAX_BET_CENTS = 50_000_00;  // 500 USDT cap per single bet for now

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, marketId, optionId, side, amountUsdt } = body as {
      userId?: string; marketId?: string; optionId?: string;
      side?: 'YES' | 'NO'; amountUsdt?: number;
    };

    if (!userId || !marketId || !optionId || (side !== 'YES' && side !== 'NO')) {
      return NextResponse.json({ error: 'userId, marketId, optionId, side required' }, { status: 400 });
    }
    if (typeof amountUsdt !== 'number' || !isFinite(amountUsdt) || amountUsdt <= 0) {
      return NextResponse.json({ error: 'amountUsdt must be a positive number' }, { status: 400 });
    }
    const stakeCents = Math.round(amountUsdt * 100);
    if (stakeCents < MIN_ORDER_CENTS) {
      return NextResponse.json({ error: 'Minimum bet is 1 USDT' }, { status: 400 });
    }
    if (stakeCents > MAX_BET_CENTS) {
      return NextResponse.json({ error: `Maximum bet is ${MAX_BET_CENTS / 100} USDT` }, { status: 400 });
    }

    // 1. Verify market is open
    const { data: market } = await supabase
      .from('markets').select('id, resolved, close_date').eq('id', marketId).single();
    if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    if (market.resolved) return NextResponse.json({ error: 'Market already resolved' }, { status: 400 });
    if (new Date(market.close_date).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Market is closed' }, { status: 400 });
    }

    // 2. Verify option
    const { data: option } = await supabase
      .from('market_options').select('id, market_id').eq('id', optionId).single();
    if (!option || option.market_id !== marketId) {
      return NextResponse.json({ error: 'Invalid option for this market' }, { status: 400 });
    }

    // 3. Verify user + balance
    const { data: user } = await supabase
      .from('users')
      .select('id, balance_cents, wagering_completed_cents')
      .eq('id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if ((user.balance_cents || 0) < stakeCents) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // 4. Compute current market probability for this option from matched volume.
    const { data: prevMatched } = await supabase
      .from('matched_bets').select('yes_stake_cents, no_stake_cents')
      .eq('market_id', marketId).eq('option_id', optionId).eq('status', 'open');
    const yesVol = (prevMatched || []).reduce((a, r: any) => a + (r.yes_stake_cents || 0), 0);
    const noVol  = (prevMatched || []).reduce((a, r: any) => a + (r.no_stake_cents  || 0), 0);
    const probability = probabilityFromVolumes(yesVol, noVol);

    // 5. Debit balance first (we refund on insert failure below).
    const newBalance = (user.balance_cents || 0) - stakeCents;
    const { error: debitErr } = await supabase
      .from('users').update({ balance_cents: newBalance }).eq('id', userId);
    if (debitErr) return NextResponse.json({ error: 'Failed to debit balance' }, { status: 500 });

    // 6. Create the new bet_order in `open` state.
    const { data: newOrder, error: orderErr } = await supabase
      .from('bet_orders')
      .insert({
        user_id: userId,
        market_id: marketId,
        option_id: optionId,
        side,
        stake_cents: stakeCents,
        matched_cents: 0,
        probability_at_order: probability,
        status: 'open',
      })
      .select().single();
    if (orderErr || !newOrder) {
      // Refund balance on failure.
      await supabase.from('users').update({ balance_cents: user.balance_cents }).eq('id', userId);
      return NextResponse.json({ error: orderErr?.message || 'Failed to create order' }, { status: 500 });
    }

    // 7. Pull opposite-side open orders for matching (FIFO).
    const oppositeSide = side === 'YES' ? 'NO' : 'YES';
    const { data: openOpp } = await supabase
      .from('bet_orders')
      .select('id, user_id, side, stake_cents, matched_cents, probability_at_order')
      .eq('market_id', marketId)
      .eq('option_id', optionId)
      .eq('side', oppositeSide)
      .in('status', ['open', 'partial'])
      .order('created_at', { ascending: true })
      .limit(200);

    const oppositeBook: OpenOrder[] = (openOpp || []).map((r: any) => ({
      id: r.id, user_id: r.user_id, side: r.side,
      stake_cents: r.stake_cents, matched_cents: r.matched_cents,
      probability_at_order: r.probability_at_order,
    }));

    const newOpen: OpenOrder = {
      id: newOrder.id, user_id: userId, side,
      stake_cents: stakeCents, matched_cents: 0,
      probability_at_order: probability,
    };

    const { matches, newOrderUnmatchedCents } = planMatches(newOpen, oppositeBook);

    // 8. Persist matches and counterparty status updates.
    let matchedTotal = 0;
    let feeTotal = 0;
    for (const m of matches) {
      matchedTotal += (side === 'YES' ? m.yes_stake_cents : m.no_stake_cents);
      feeTotal += m.fee_cents;

      await supabase.from('matched_bets').insert({
        market_id: marketId,
        option_id: optionId,
        yes_order_id: m.yes_order_id,
        no_order_id:  m.no_order_id,
        yes_user_id:  m.yes_user_id,
        no_user_id:   m.no_user_id,
        yes_stake_cents: m.yes_stake_cents,
        no_stake_cents:  m.no_stake_cents,
        total_pool_cents: m.pool_cents,
        yes_probability: m.yes_probability,
        fee_cents: m.fee_cents,
        status: 'open',
      });
      await supabase.from('house_fee_ledger').insert({
        market_id: marketId,
        fee_cents: m.fee_cents,
      });
    }

    // 9. Update bet_orders.matched_cents + status for each affected order.
    const consumed = consumedByOrder(matches);
    consumed[newOrder.id] = matchedTotal;
    for (const [orderId, addMatched] of Object.entries(consumed)) {
      const { data: o } = await supabase.from('bet_orders')
        .select('stake_cents, matched_cents').eq('id', orderId).single();
      if (!o) continue;
      const totalMatched = (o.matched_cents || 0) + addMatched;
      const status = totalMatched >= o.stake_cents ? 'matched' : totalMatched > 0 ? 'partial' : 'open';
      await supabase.from('bet_orders').update({
        matched_cents: totalMatched, status,
      }).eq('id', orderId);
    }

    // 10. Bump wagering_completed_cents for both sides on each match.
    for (const m of matches) {
      const adjustments = [
        { userId: m.yes_user_id, add: m.yes_stake_cents },
        { userId: m.no_user_id,  add: m.no_stake_cents },
      ];
      for (const a of adjustments) {
        const { data: u } = await supabase.from('users')
          .select('wagering_completed_cents').eq('id', a.userId).single();
        if (!u) continue;
        await supabase.from('users').update({
          wagering_completed_cents: (u.wagering_completed_cents || 0) + a.add,
        }).eq('id', a.userId);
      }
    }

    return NextResponse.json({
      ok: true,
      orderId: newOrder.id,
      probabilityAtOrder: probability,
      stakeUsdt: stakeCents / 100,
      matchedUsdt: matchedTotal / 100,
      unmatchedUsdt: newOrderUnmatchedCents / 100,
      matches: matches.length,
      feeBps: HOUSE_FEE_BPS,
    });
  } catch (e: any) {
    console.error('[CaribPredict] /api/bet/place error', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
