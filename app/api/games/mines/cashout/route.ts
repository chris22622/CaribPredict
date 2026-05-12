// Cash out an active Mines game at the current multiplier.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { minesMultiplier } from '@/lib/games';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, betId } = body as { userId?: string; betId?: string };
    if (!userId || !betId) {
      return NextResponse.json({ error: 'userId + betId required' }, { status: 400 });
    }

    const { data: bet } = await supabase.from('instant_game_bets')
      .select('*').eq('id', betId).eq('user_id', userId).single();
    if (!bet) return NextResponse.json({ error: 'Bet not found' }, { status: 404 });
    if (bet.game_type !== 'mines') return NextResponse.json({ error: 'Wrong game' }, { status: 400 });
    if (bet.status !== 'pending') return NextResponse.json({ error: 'Bet already settled' }, { status: 400 });

    const params = bet.params || {};
    const safeRevealed = (params.revealed || []).length;
    if (safeRevealed === 0) {
      return NextResponse.json({ error: 'Reveal at least one tile before cashing out' }, { status: 400 });
    }
    const mult = minesMultiplier(params.total, params.mines, safeRevealed);
    const payoutCents = Math.floor(bet.stake_cents * mult);

    const { data: u } = await supabase.from('users').select('balance_cents').eq('id', userId).single();
    if (u) {
      await supabase.from('users')
        .update({ balance_cents: (u.balance_cents || 0) + payoutCents }).eq('id', userId);
    }

    await supabase.from('instant_game_bets').update({
      status: 'settled',
      result: { revealed: params.revealed, mines: params.mine_positions_encrypted },
      multiplier: mult,
      payout_cents: payoutCents,
      settled_at: new Date().toISOString(),
    }).eq('id', betId);

    return NextResponse.json({
      ok: true,
      multiplier: mult,
      payoutUsdt: payoutCents / 100,
      revealed: params.revealed,
      mines: params.mine_positions_encrypted,
    });
  } catch (e: any) {
    console.error('[CaribPredict] /api/games/mines/cashout', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
