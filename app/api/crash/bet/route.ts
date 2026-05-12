import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MIN_STAKE_CENTS, MAX_STAKE_CENTS } from '@/lib/crash';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, roundId, amountUsdt, autoCashoutMultiplier } = body as {
      userId?: string; roundId?: string; amountUsdt?: number; autoCashoutMultiplier?: number;
    };
    if (!userId || !roundId) {
      return NextResponse.json({ error: 'userId + roundId required' }, { status: 400 });
    }
    if (typeof amountUsdt !== 'number' || !isFinite(amountUsdt) || amountUsdt <= 0) {
      return NextResponse.json({ error: 'amountUsdt must be positive' }, { status: 400 });
    }
    const stakeCents = Math.round(amountUsdt * 100);
    if (stakeCents < MIN_STAKE_CENTS) {
      return NextResponse.json({ error: `Minimum bet is ${MIN_STAKE_CENTS / 100} USDT` }, { status: 400 });
    }
    if (stakeCents > MAX_STAKE_CENTS) {
      return NextResponse.json({ error: `Maximum bet is ${MAX_STAKE_CENTS / 100} USDT` }, { status: 400 });
    }
    if (autoCashoutMultiplier != null && (
      typeof autoCashoutMultiplier !== 'number' || autoCashoutMultiplier < 1.01 || autoCashoutMultiplier > 1000
    )) {
      return NextResponse.json({ error: 'autoCashoutMultiplier must be between 1.01 and 1000' }, { status: 400 });
    }

    // Round must exist and be in `pending` (betting open).
    const { data: round } = await supabase
      .from('crash_rounds').select('id, status, starts_at, betting_opens_at').eq('id', roundId).single();
    if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    if (round.status !== 'pending') {
      return NextResponse.json({ error: 'Betting is closed for this round' }, { status: 400 });
    }
    if (Date.now() >= new Date(round.starts_at).getTime()) {
      return NextResponse.json({ error: 'Betting just closed; wait for next round' }, { status: 400 });
    }

    // Verify user + balance (bonus first, then real)
    const { data: user } = await supabase
      .from('users').select('id, balance_cents, bonus_balance_cents').eq('id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const realBal = user.balance_cents || 0;
    const bonusBal = user.bonus_balance_cents || 0;
    if (realBal + bonusBal < stakeCents) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }
    const bonusUsed = Math.min(bonusBal, stakeCents);
    const realUsed  = stakeCents - bonusUsed;

    // Debit both buckets
    const { error: debitErr } = await supabase.from('users').update({
      balance_cents: realBal - realUsed,
      bonus_balance_cents: bonusBal - bonusUsed,
    }).eq('id', userId);
    if (debitErr) return NextResponse.json({ error: 'Failed to debit balance' }, { status: 500 });

    // Insert bet (one per round per user enforced by unique index)
    const { data: bet, error: insErr } = await supabase.from('crash_bets').insert({
      round_id: roundId, user_id: userId,
      stake_cents: stakeCents,
      bonus_used_cents: bonusUsed,
      real_used_cents:  realUsed,
      auto_cashout_multiplier: autoCashoutMultiplier ?? null,
      status: 'pending',
    }).select().single();
    if (insErr || !bet) {
      // Refund on failure
      await supabase.from('users').update({
        balance_cents: realBal, bonus_balance_cents: bonusBal,
      }).eq('id', userId);
      return NextResponse.json({
        error: insErr?.message?.includes('duplicate')
          ? 'You already have a bet on this round'
          : (insErr?.message || 'Failed to place bet')
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      betId: bet.id,
      stakeUsdt: stakeCents / 100,
      bonusUsedUsdt: bonusUsed / 100,
      realUsedUsdt: realUsed / 100,
      autoCashoutMultiplier: autoCashoutMultiplier ?? null,
    });
  } catch (e: any) {
    console.error('[CaribPredict] /api/crash/bet error', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
