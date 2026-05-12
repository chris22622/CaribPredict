import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { computeRoundState, payoutAtMultiplier } from '@/lib/crash';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, roundId } = body as { userId?: string; roundId?: string };
    if (!userId || !roundId) {
      return NextResponse.json({ error: 'userId + roundId required' }, { status: 400 });
    }

    // 1. Load round + check status
    const { data: round } = await supabase
      .from('crash_rounds').select('*').eq('id', roundId).single();
    if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    if (round.status !== 'running') {
      return NextResponse.json({ error: 'Round is not running' }, { status: 400 });
    }

    // 2. Compute current multiplier from round.starts_at
    const state = computeRoundState(
      round.betting_opens_at, round.starts_at, round.crashed_at,
      Number(round.crash_multiplier),
    );
    if (state.phase !== 'running') {
      return NextResponse.json({ error: 'Round just crashed' }, { status: 400 });
    }
    const cashoutMult = Math.max(1.00, Math.floor(state.currentMultiplier * 100) / 100);
    if (cashoutMult >= Number(round.crash_multiplier)) {
      return NextResponse.json({ error: 'Round just crashed' }, { status: 400 });
    }

    // 3. Find user's pending bet on this round
    const { data: bet } = await supabase
      .from('crash_bets').select('*')
      .eq('round_id', roundId).eq('user_id', userId).single();
    if (!bet) return NextResponse.json({ error: 'No bet found for this round' }, { status: 404 });
    if (bet.status !== 'pending') {
      return NextResponse.json({ error: 'Bet already settled' }, { status: 400 });
    }

    // 4. Calculate payout
    const { payout_cents, fee_cents } = payoutAtMultiplier(bet.stake_cents, cashoutMult);

    // 5. Update bet + credit user balance
    await supabase.from('crash_bets').update({
      status: 'cashed_out',
      cashout_multiplier: cashoutMult,
      payout_cents, fee_cents,
      cashed_at: new Date().toISOString(),
    }).eq('id', bet.id);

    const { data: u } = await supabase.from('users')
      .select('balance_cents').eq('id', userId).single();
    if (u) {
      await supabase.from('users').update({
        balance_cents: (u.balance_cents || 0) + payout_cents,
      }).eq('id', userId);
    }

    return NextResponse.json({
      ok: true,
      cashoutMultiplier: cashoutMult,
      payoutUsdt: payout_cents / 100,
      feeUsdt: fee_cents / 100,
    });
  } catch (e: any) {
    console.error('[CaribPredict] /api/crash/cashout error', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
