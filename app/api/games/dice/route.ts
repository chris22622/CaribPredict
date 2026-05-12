import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  rollDice, makeServerSeed, instantPayoutCents, sha256Hex,
  MIN_INSTANT_STAKE_CENTS, MAX_INSTANT_STAKE_CENTS,
} from '@/lib/games';
import { checkBetAllowed } from '@/lib/responsible';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, target, direction, amountUsdt, clientSeed } = body as {
      userId?: string; target?: number; direction?: 'over' | 'under';
      amountUsdt?: number; clientSeed?: string;
    };
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    if (typeof target !== 'number' || target < 2 || target > 98) {
      return NextResponse.json({ error: 'target must be between 2 and 98' }, { status: 400 });
    }
    if (direction !== 'over' && direction !== 'under') {
      return NextResponse.json({ error: 'direction must be over or under' }, { status: 400 });
    }
    const stakeCents = Math.round((amountUsdt ?? 0) * 100);
    if (stakeCents < MIN_INSTANT_STAKE_CENTS || stakeCents > MAX_INSTANT_STAKE_CENTS) {
      return NextResponse.json({ error: 'Stake out of range' }, { status: 400 });
    }

    const { data: user } = await supabase.from('users')
      .select('id, balance_cents, bonus_balance_cents, games_nonce').eq('id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const realBal = user.balance_cents || 0;
    const bonusBal = user.bonus_balance_cents || 0;
    if (realBal + bonusBal < stakeCents) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }
    const rg = await checkBetAllowed(supabase, userId, stakeCents);
    if (rg.blocked) return NextResponse.json({ error: rg.message, code: rg.code }, { status: 403 });
    const bonusUsed = Math.min(bonusBal, stakeCents);
    const realUsed = stakeCents - bonusUsed;
    const nonce = (user.games_nonce || 0) + 1;

    const { seed, hash } = makeServerSeed();
    const cs = (clientSeed || `cs-${nonce}`).slice(0, 64);
    const result = rollDice({ server_seed: seed, server_seed_hash: hash, client_seed: cs, nonce }, target, direction);
    const payoutCents = instantPayoutCents(stakeCents, result.multiplier);

    await supabase.from('users').update({
      balance_cents: realBal - realUsed + payoutCents,
      bonus_balance_cents: bonusBal - bonusUsed,
      games_nonce: nonce,
    }).eq('id', userId);

    await supabase.from('instant_game_bets').insert({
      user_id: userId,
      game_type: 'dice',
      stake_cents: stakeCents,
      bonus_used_cents: bonusUsed,
      real_used_cents: realUsed,
      server_seed_hash: hash,
      server_seed: seed,
      client_seed: cs,
      nonce,
      params: { target, direction },
      result: { roll: result.roll, win: result.win, win_probability: result.win_probability },
      multiplier: result.multiplier,
      payout_cents: payoutCents,
      fee_cents: 0,
      status: 'settled',
      settled_at: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true, won: result.win, roll: result.roll,
      multiplier: result.multiplier, winProbability: result.win_probability,
      payoutUsdt: payoutCents / 100,
      serverSeed: seed, serverSeedHash: hash, clientSeed: cs, nonce,
      verifyHashMatches: sha256Hex(seed) === hash,
    });
  } catch (e: any) {
    console.error('[CaribPredict] /api/games/dice', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
