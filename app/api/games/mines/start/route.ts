// Start a Mines game. Locks stake, places mines deterministically based on
// the seed (revealed only at cashout/bust). Returns the bet id; subsequent
// reveal/cashout endpoints reference it.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  makeServerSeed, minesGridFromSeed, minesMultiplier, sha256Hex,
  MIN_INSTANT_STAKE_CENTS, MAX_INSTANT_STAKE_CENTS,
} from '@/lib/games';
import { checkBetAllowed } from '@/lib/responsible';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const GRID_TOTAL = 25;       // 5x5
const MIN_MINES = 1;
const MAX_MINES = 24;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, amountUsdt, minesCount, clientSeed } = body as {
      userId?: string; amountUsdt?: number; minesCount?: number; clientSeed?: string;
    };
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    const stakeCents = Math.round((amountUsdt ?? 0) * 100);
    if (stakeCents < MIN_INSTANT_STAKE_CENTS || stakeCents > MAX_INSTANT_STAKE_CENTS) {
      return NextResponse.json({ error: 'Stake out of range' }, { status: 400 });
    }
    const mines = Math.max(MIN_MINES, Math.min(MAX_MINES, minesCount ?? 3));

    const { data: user } = await supabase.from('users')
      .select('id, balance_cents, bonus_balance_cents, games_nonce').eq('id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const realBal = user.balance_cents || 0;
    const bonusBal = user.bonus_balance_cents || 0;
    if (realBal + bonusBal < stakeCents) return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    const rg = await checkBetAllowed(supabase, userId, stakeCents);
    if (rg.blocked) return NextResponse.json({ error: rg.message, code: rg.code }, { status: 403 });
    const bonusUsed = Math.min(bonusBal, stakeCents);
    const realUsed = stakeCents - bonusUsed;
    const nonce = (user.games_nonce || 0) + 1;

    const { seed, hash } = makeServerSeed();
    const cs = (clientSeed || `cs-${nonce}`).slice(0, 64);
    // We compute the mine positions but DON'T reveal them yet.
    const minePositions = minesGridFromSeed(seed, cs, nonce, GRID_TOTAL, mines);

    // Debit immediately
    await supabase.from('users').update({
      balance_cents: realBal - realUsed,
      bonus_balance_cents: bonusBal - bonusUsed,
      games_nonce: nonce,
    }).eq('id', userId);

    const { data: bet, error: insErr } = await supabase.from('instant_game_bets').insert({
      user_id: userId,
      game_type: 'mines',
      stake_cents: stakeCents,
      bonus_used_cents: bonusUsed,
      real_used_cents: realUsed,
      server_seed_hash: hash,
      server_seed: null,    // not revealed until cashout/bust
      client_seed: cs,
      nonce,
      params: {
        total: GRID_TOTAL, mines, mine_positions_encrypted: minePositions, // stored privately under params; user can't read other users' rows via RLS
        revealed: [],
      },
      result: null,
      multiplier: 1.00,
      payout_cents: 0,
      fee_cents: 0,
      status: 'pending',
    }).select().single();
    if (insErr || !bet) {
      // Refund
      await supabase.from('users').update({
        balance_cents: realBal, bonus_balance_cents: bonusBal,
      }).eq('id', userId);
      return NextResponse.json({ error: insErr?.message || 'Failed to start' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      betId: bet.id,
      total: GRID_TOTAL,
      mines,
      serverSeedHash: hash,
      clientSeed: cs,
      nonce,
      verifyHashMatches: sha256Hex(seed) === hash,
      multiplierAfterRevealed: minesMultiplier(GRID_TOTAL, mines, 0),
    });
  } catch (e: any) {
    console.error('[CaribPredict] /api/games/mines/start', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
