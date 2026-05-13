// Returns the current crash round + state, creating the next round on
// demand if the previous one's cooldown has elapsed. Idempotent.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  makeServerSeed, crashMultiplier, computeRoundState,
  BETTING_PHASE_MS, COOLDOWN_PHASE_MS, timeToCrashSeconds, payoutAtMultiplier,
} from '@/lib/crash';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function settleCrashedRound(round: any) {
  // Mark crashed_at if not yet set
  if (round.status === 'running') {
    await supabase.from('crash_rounds').update({
      status: 'crashed', crashed_at: new Date().toISOString(),
    }).eq('id', round.id);
  } else if (round.status === 'crashed' && !round.crashed_at) {
    await supabase.from('crash_rounds').update({
      crashed_at: new Date().toISOString(),
    }).eq('id', round.id);
  }
  // Settle any pending bets: those that didn't cash out lose, auto-cashouts trigger.
  const { data: pendingBets } = await supabase
    .from('crash_bets').select('*').eq('round_id', round.id).eq('status', 'pending');
  for (const b of pendingBets || []) {
    if (b.auto_cashout_multiplier && Number(b.auto_cashout_multiplier) <= Number(round.crash_multiplier)) {
      const { payout_cents, fee_cents } = payoutAtMultiplier(b.stake_cents, Number(b.auto_cashout_multiplier));
      await supabase.from('crash_bets').update({
        status: 'cashed_out',
        cashout_multiplier: b.auto_cashout_multiplier,
        payout_cents, fee_cents,
        cashed_at: new Date().toISOString(),
      }).eq('id', b.id);
      const { data: u } = await supabase.from('users').select('balance_cents').eq('id', b.user_id).single();
      if (u) {
        await supabase.from('users').update({
          balance_cents: (u.balance_cents || 0) + payout_cents,
        }).eq('id', b.user_id);
      }
    } else {
      await supabase.from('crash_bets').update({
        status: 'crashed', cashed_at: new Date().toISOString(),
      }).eq('id', b.id);
    }
  }
}

async function maybeStartNextRound(prev: any | null) {
  const now = Date.now();
  if (prev) {
    if (prev.status !== 'crashed') return prev;
    const crashedMs = prev.crashed_at ? new Date(prev.crashed_at).getTime() : now;
    if (now - crashedMs < COOLDOWN_PHASE_MS) return prev;
  }
  const bettingOpens = new Date();
  const starts = new Date(now + BETTING_PHASE_MS);
  const { seed, hash } = makeServerSeed();
  const { data: inserted, error: insertError } = await supabase.from('crash_rounds').insert({
    server_seed_hash: hash,
    server_seed: null,
    client_seed: null,
    crash_multiplier: 1.00,    // placeholder; finalized when starts_at hits
    status: 'pending',
    betting_opens_at: bettingOpens.toISOString(),
    starts_at: starts.toISOString(),
  }).select().single();
  if (insertError || !inserted) {
    console.error('[crash] maybeStartNextRound insert failed:', insertError);
    return { ...(prev || {}), _insertError: insertError?.message || 'insert returned null' };
  }
  // Compute the real crash multiplier using round_number as salt.
  const m = crashMultiplier(seed, inserted.round_number);
  await supabase.from('crash_rounds').update({
    server_seed: seed,
    crash_multiplier: m,
  }).eq('id', inserted.id);
  return { ...inserted, server_seed: seed, crash_multiplier: m };
}

export async function GET(req: NextRequest) {
  try {
    // Latest round (any status)
    const { data: latestRows } = await supabase
      .from('crash_rounds').select('*').order('round_number', { ascending: false }).limit(1);
    let round: any = (latestRows || [])[0] || null;

    // If we have a running round, check if it should be crashed.
    if (round && round.status === 'running') {
      const state = computeRoundState(
        round.betting_opens_at, round.starts_at, round.crashed_at, Number(round.crash_multiplier),
      );
      if (state.phase === 'crashed') {
        await settleCrashedRound(round);
        round = { ...round, status: 'crashed', crashed_at: round.crashed_at || new Date().toISOString() };
      }
    }
    // If pending and starts_at has passed, mark running.
    if (round && round.status === 'pending') {
      const startsMs = new Date(round.starts_at).getTime();
      if (Date.now() >= startsMs) {
        await supabase.from('crash_rounds').update({ status: 'running' }).eq('id', round.id);
        round.status = 'running';
      }
    }
    // If crashed and cooldown elapsed, start the next round.
    if (!round || round.status === 'crashed') {
      round = await maybeStartNextRound(round);
    }

    if (!round) {
      return NextResponse.json({ error: 'No round available' }, { status: 503 });
    }
    if (round._insertError) {
      return NextResponse.json({ error: 'next round insert failed', detail: round._insertError }, { status: 500 });
    }

    const state = computeRoundState(
      round.betting_opens_at, round.starts_at, round.crashed_at, Number(round.crash_multiplier),
    );

    // Don't leak server_seed until the round has crashed.
    const safe: any = {
      id: round.id,
      roundNumber: round.round_number,
      status: round.status,
      serverSeedHash: round.server_seed_hash,
      bettingOpensAt: round.betting_opens_at,
      startsAt: round.starts_at,
      crashedAt: round.crashed_at,
    };
    if (round.status === 'crashed') {
      safe.serverSeed = round.server_seed;
      safe.crashMultiplier = Number(round.crash_multiplier);
    }

    // Recent matched volume + bet count on this round (anonymized list).
    const { data: bets } = await supabase
      .from('crash_bets').select('id, stake_cents, status, cashout_multiplier, user_id')
      .eq('round_id', round.id).limit(50);

    const totalStake = (bets || []).reduce((a, b: any) => a + (b.stake_cents || 0), 0);
    return NextResponse.json({
      round: safe,
      phase: state.phase,
      currentMultiplier: state.currentMultiplier,
      elapsedMs: state.elapsedMs,
      msUntilStart: state.msUntilStart,
      msUntilCrash: state.msUntilCrash,
      betsThisRound: bets?.length || 0,
      stakeUsdtThisRound: totalStake / 100,
      timeToCrashSec: timeToCrashSeconds(Number(round.crash_multiplier)),
    });
  } catch (e: any) {
    console.error('[CaribPredict] /api/crash/state error', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
