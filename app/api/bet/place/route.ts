import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  planMatches, probabilityFromVolumes, consumedByOrder,
  OpenOrder, MIN_ORDER_CENTS, HOUSE_FEE_BPS,
} from '@/lib/matching';
import {
  tierForActiveReferrals, earnedCentsFromFee,
} from '@/lib/referrals';
import { checkBetAllowed } from '@/lib/responsible';

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

    // 3. Verify user + balance. Bonus balance is spent first, then real.
    const { data: user } = await supabase
      .from('users')
      .select('id, balance_cents, bonus_balance_cents, wagering_completed_cents, bonus_wagering_completed_cents, referred_by_user_id')
      .eq('id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const realBal  = user.balance_cents || 0;
    const bonusBal = user.bonus_balance_cents || 0;
    if (realBal + bonusBal < stakeCents) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }
    // Responsible-gambling gate (self-exclusion, cooling-off, daily caps)
    const rg = await checkBetAllowed(supabase, userId, stakeCents);
    if (rg.blocked) {
      return NextResponse.json({ error: rg.message, code: rg.code }, { status: 403 });
    }
    const bonusUsedCents = Math.min(bonusBal, stakeCents);
    const realUsedCents  = stakeCents - bonusUsedCents;

    // 4. Compute current market probability for this option from matched volume.
    const { data: prevMatched } = await supabase
      .from('matched_bets').select('yes_stake_cents, no_stake_cents')
      .eq('market_id', marketId).eq('option_id', optionId).eq('status', 'open');
    const yesVol = (prevMatched || []).reduce((a, r: any) => a + (r.yes_stake_cents || 0), 0);
    const noVol  = (prevMatched || []).reduce((a, r: any) => a + (r.no_stake_cents  || 0), 0);
    const probability = probabilityFromVolumes(yesVol, noVol);

    // 5. Debit balance first (we refund on insert failure below).
    //    Bonus debited from bonus_balance, the rest from balance.
    const newRealBalance  = realBal  - realUsedCents;
    const newBonusBalance = bonusBal - bonusUsedCents;
    const { error: debitErr } = await supabase
      .from('users').update({
        balance_cents: newRealBalance,
        bonus_balance_cents: newBonusBalance,
      }).eq('id', userId);
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
      // Refund both buckets on failure.
      await supabase.from('users').update({
        balance_cents: realBal,
        bonus_balance_cents: bonusBal,
      }).eq('id', userId);
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

    // 10. Bump wagering counters for both sides on each match.
    //     For the placing user, split between real and bonus proportionally
    //     to the bonus_used / real_used ratio. Counterparty wagering all goes
    //     to their real counter since we don't know their bonus split here
    //     (those orders were placed in prior calls with their own bookkeeping).
    const placerStakeCents = matchedTotal;
    const placerBonusPortion = placerStakeCents > 0
      ? Math.floor(placerStakeCents * bonusUsedCents / stakeCents)
      : 0;
    const placerRealPortion = placerStakeCents - placerBonusPortion;
    if (placerStakeCents > 0) {
      const { data: u } = await supabase.from('users')
        .select('wagering_completed_cents, bonus_wagering_completed_cents').eq('id', userId).single();
      if (u) {
        await supabase.from('users').update({
          wagering_completed_cents: (u.wagering_completed_cents || 0) + placerRealPortion,
          bonus_wagering_completed_cents: (u.bonus_wagering_completed_cents || 0) + placerBonusPortion,
        }).eq('id', userId);
      }
    }
    // Counterparty wagering
    for (const m of matches) {
      const counterpartyUserId = side === 'YES' ? m.no_user_id : m.yes_user_id;
      const counterpartyStake  = side === 'YES' ? m.no_stake_cents : m.yes_stake_cents;
      const { data: u } = await supabase.from('users')
        .select('wagering_completed_cents').eq('id', counterpartyUserId).single();
      if (u) {
        await supabase.from('users').update({
          wagering_completed_cents: (u.wagering_completed_cents || 0) + counterpartyStake,
        }).eq('id', counterpartyUserId);
      }
    }

    // 11. Referral earnings: for every match, credit each user's referrer
    //     (if any) a tier-based percentage of the house fee from that match.
    for (const m of matches) {
      const involved = [
        { userId: m.yes_user_id, stake: m.yes_stake_cents },
        { userId: m.no_user_id,  stake: m.no_stake_cents  },
      ];
      // Allocate this match's fee between the two sides proportionally to stake.
      const totalStake = m.yes_stake_cents + m.no_stake_cents;
      for (const inv of involved) {
        const { data: bettor } = await supabase
          .from('users').select('referred_by_user_id').eq('id', inv.userId).single();
        if (!bettor?.referred_by_user_id) continue;

        // Active-referral count for this referrer determines their tier.
        const { data: their } = await supabase
          .from('users').select('id').eq('referred_by_user_id', bettor.referred_by_user_id);
        const referreeIds = (their || []).map((r: any) => r.id);
        let activeCount = 0;
        if (referreeIds.length) {
          const { data: bets } = await supabase
            .from('bet_orders').select('user_id').in('user_id', referreeIds);
          activeCount = new Set((bets || []).map((b: any) => b.user_id)).size;
        }
        const tier = tierForActiveReferrals(activeCount);
        const sourceFee = totalStake > 0
          ? Math.floor(m.fee_cents * inv.stake / totalStake)
          : 0;
        const earned = earnedCentsFromFee(sourceFee, tier.rateBps);
        if (earned <= 0) continue;

        await supabase.from('referral_earnings').insert({
          referrer_id: bettor.referred_by_user_id,
          referee_id: inv.userId,
          matched_bet_id: null, // we don't have the inserted matched_bet id here
          source_fee_cents: sourceFee,
          rate_bps: tier.rateBps,
          earned_cents: earned,
          status: 'pending',
        });

        // Credit referrer's balance immediately (paid weekly per spec, but for
        // MVP we credit on-the-fly and the "weekly settlement" job can move
        // pending -> paid status).
        const { data: refUser } = await supabase
          .from('users').select('balance_cents').eq('id', bettor.referred_by_user_id).single();
        if (refUser) {
          await supabase.from('users').update({
            balance_cents: (refUser.balance_cents || 0) + earned,
          }).eq('id', bettor.referred_by_user_id);
        }
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
