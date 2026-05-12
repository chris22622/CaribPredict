// One-shot bet on a coin flip. Settles instantly.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  flipCoin, makeServerSeed, instantPayoutCents,
  MIN_INSTANT_STAKE_CENTS, MAX_INSTANT_STAKE_CENTS, sha256Hex,
} from '@/lib/games';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, pick, amountUsdt, clientSeed } = body as {
      userId?: string; pick?: 'HEADS' | 'TAILS'; amountUsdt?: number; clientSeed?: string;
    };
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    if (pick !== 'HEADS' && pick !== 'TAILS') {
      return NextResponse.json({ error: 'pick must be HEADS or TAILS' }, { status: 400 });
    }
    const stakeCents = Math.round((amountUsdt ?? 0) * 100);
    if (stakeCents < MIN_INSTANT_STAKE_CENTS || stakeCents > MAX_INSTANT_STAKE_CENTS) {
      return NextResponse.json({
        error: `Stake must be between ${MIN_INSTANT_STAKE_CENTS/100} and ${MAX_INSTANT_STAKE_CENTS/100} USDT`,
      }, { status: 400 });
    }

    // User + balance (bonus-first)
    const { data: user } = await supabase.from('users')
      .select('id, balance_cents, bonus_balance_cents, games_nonce').eq('id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const realBal = user.balance_cents || 0;
    const bonusBal = user.bonus_balance_cents || 0;
    if (realBal + bonusBal < stakeCents) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }
    const bonusUsed = Math.min(bonusBal, stakeCents);
    const realUsed = stakeCents - bonusUsed;
    const nonce = (user.games_nonce || 0) + 1;

    // Generate seed + flip
    const { seed, hash } = makeServerSeed();
    const cs = (clientSeed || `cs-${nonce}`).slice(0, 64);
    const result = flipCoin({ server_seed: seed, server_seed_hash: hash, client_seed: cs, nonce }, pick);
    const payoutCents = instantPayoutCents(stakeCents, result.multiplier);
    const won = payoutCents > 0;

    // Atomic-ish: debit, increment nonce, insert bet, credit on win
    const balanceAfterDebit = realBal - realUsed;
    const bonusAfterDebit = bonusBal - bonusUsed;
    const finalBalance = balanceAfterDebit + payoutCents;

    await supabase.from('users').update({
      balance_cents: finalBalance,
      bonus_balance_cents: bonusAfterDebit,
      games_nonce: nonce,
    }).eq('id', userId);

    await supabase.from('instant_game_bets').insert({
      user_id: userId,
      game_type: 'coinflip',
      stake_cents: stakeCents,
      bonus_used_cents: bonusUsed,
      real_used_cents: realUsed,
      server_seed_hash: hash,
      server_seed: seed,
      client_seed: cs,
      nonce,
      params: { pick },
      result: { side: result.side, miss: result.miss, roll: result.roll },
      multiplier: result.multiplier,
      payout_cents: payoutCents,
      fee_cents: 0,  // edge is in the multiplier formula already
      status: 'settled',
      settled_at: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true, won,
      side: result.side, miss: result.miss,
      multiplier: result.multiplier,
      payoutUsdt: payoutCents / 100,
      serverSeed: seed, serverSeedHash: hash, clientSeed: cs, nonce,
      verifyHashMatches: sha256Hex(seed) === hash,
    });
  } catch (e: any) {
    console.error('[CaribPredict] /api/games/coinflip', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
