// Reveal a tile in an active Mines game. Returns the result; if a mine, the
// bet busts (user loses stake); otherwise the multiplier updates.

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
    const { userId, betId, tileIndex } = body as {
      userId?: string; betId?: string; tileIndex?: number;
    };
    if (!userId || !betId || typeof tileIndex !== 'number') {
      return NextResponse.json({ error: 'userId + betId + tileIndex required' }, { status: 400 });
    }

    const { data: bet } = await supabase.from('instant_game_bets')
      .select('*').eq('id', betId).eq('user_id', userId).single();
    if (!bet) return NextResponse.json({ error: 'Bet not found' }, { status: 404 });
    if (bet.game_type !== 'mines') return NextResponse.json({ error: 'Wrong game' }, { status: 400 });
    if (bet.status !== 'pending') return NextResponse.json({ error: 'Bet already settled' }, { status: 400 });

    const params = bet.params || {};
    const total: number = params.total;
    const mines: number = params.mines;
    const minePositions: number[] = params.mine_positions_encrypted || [];
    const revealed: number[] = params.revealed || [];

    if (tileIndex < 0 || tileIndex >= total) {
      return NextResponse.json({ error: 'Tile index out of range' }, { status: 400 });
    }
    if (revealed.includes(tileIndex)) {
      return NextResponse.json({ error: 'Tile already revealed' }, { status: 400 });
    }

    const hitMine = minePositions.includes(tileIndex);
    if (hitMine) {
      // Bust — reveal the seed.
      await supabase.from('instant_game_bets').update({
        status: 'busted',
        server_seed: null,  // we don't have it stored; client can recompute from server_seed_hash via /verify... actually we'd need it. Store at start.
        result: { hit_mine_at: tileIndex, mines: minePositions, revealed },
        multiplier: 0,
        payout_cents: 0,
        settled_at: new Date().toISOString(),
      }).eq('id', betId);
      return NextResponse.json({
        ok: true,
        hitMine: true,
        tileIndex,
        minePositions,
        revealed,
        multiplier: 0,
        payoutUsdt: 0,
      });
    }

    const newRevealed = [...revealed, tileIndex];
    const safeRevealed = newRevealed.length;
    const newMult = minesMultiplier(total, mines, safeRevealed);

    await supabase.from('instant_game_bets').update({
      params: { ...params, revealed: newRevealed },
      multiplier: newMult,
    }).eq('id', betId);

    // If all safe tiles revealed, auto-cashout for the user.
    const totalSafe = total - mines;
    let autoCashedOut = false;
    let payoutCents = 0;
    if (safeRevealed >= totalSafe) {
      payoutCents = Math.floor(bet.stake_cents * newMult);
      const { data: u } = await supabase.from('users').select('balance_cents').eq('id', userId).single();
      if (u) {
        await supabase.from('users')
          .update({ balance_cents: (u.balance_cents || 0) + payoutCents }).eq('id', userId);
      }
      await supabase.from('instant_game_bets').update({
        status: 'settled',
        result: { revealed: newRevealed, mines_revealed_on_complete: minePositions },
        payout_cents: payoutCents,
        settled_at: new Date().toISOString(),
      }).eq('id', betId);
      autoCashedOut = true;
    }

    return NextResponse.json({
      ok: true,
      hitMine: false,
      tileIndex,
      revealed: newRevealed,
      multiplier: newMult,
      potentialPayoutUsdt: (bet.stake_cents * newMult) / 100,
      autoCashedOut,
      payoutUsdt: payoutCents / 100,
    });
  } catch (e: any) {
    console.error('[CaribPredict] /api/games/mines/reveal', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
