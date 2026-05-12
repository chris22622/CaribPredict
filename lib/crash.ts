// CaribCrash engine — provably-fair multiplier generation + round lifecycle.
//
// Provably fair:
//   - At round creation, generate `server_seed` = 32 random bytes (hex).
//   - Publish `server_seed_hash` = sha256(server_seed) immediately.
//   - After the round ends, reveal `server_seed`. Anyone can verify the
//     crash multiplier by computing crashMultiplier(server_seed, round_number).
//
// Multiplier formula (Bustabit-style with 5% house edge):
//     u = HMAC-SHA256(server_seed, round_number).first 52 bits / 2^52       (uniform in [0,1))
//     m = floor(100 * 0.95 / (1 - u)) / 100, clamped to >= 1.00
//   ~ 5% of rounds crash at exactly 1.00 (instant crash). Expected payout on
//     a bet at multiplier M is 0.95 (the house edge).
//
// Multiplier curve over time (purely visual; the *crash point* is fixed
// at round start):
//     mult(t_sec) = exp(0.06 * t_sec)
//   t=0  -> 1.00x
//   t=10 -> 1.82x
//   t=20 -> 3.32x
//   t=30 -> 6.05x
//
// Round lifecycle:
//   pending  (10s)  — accept bets
//   running         — multiplier rises until crash
//   crashed  (5s)   — show result, then start a new round

import { createHash, createHmac, randomBytes } from 'crypto';

export const HOUSE_EDGE = 0.05;              // 5%
export const GROWTH_RATE = 0.06;             // per second
export const BETTING_PHASE_MS = 10_000;      // 10s of pending
export const COOLDOWN_PHASE_MS = 5_000;      // 5s of crashed before next pending
export const MIN_STAKE_CENTS = 100;          // 1 USDT
export const MAX_STAKE_CENTS = 100_000_00;   // 1,000 USDT
export const CRASH_FEE_BPS = 500;            // 5% house fee on profit at cashout

/** Generate a 32-byte hex server seed and its sha256 hash. */
export function makeServerSeed(): { seed: string; hash: string } {
  const seed = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(seed).digest('hex');
  return { seed, hash };
}

/** Deterministic crash multiplier for a (server_seed, salt) pair. */
export function crashMultiplier(serverSeed: string, salt: string | number): number {
  const hmac = createHmac('sha256', serverSeed).update(String(salt)).digest('hex');
  // Take first 13 hex chars = 52 bits, divide by 2^52 to get u ∈ [0, 1).
  const intVal = parseInt(hmac.slice(0, 13), 16);
  const maxInt = Math.pow(2, 52);
  const u = intVal / maxInt;
  const raw = (1 - HOUSE_EDGE) / Math.max(0.0000001, 1 - u);
  // Floor to 2 decimal places, clamp to >= 1.00
  return Math.max(1.00, Math.floor(raw * 100) / 100);
}

/** Multiplier curve over time (visual). */
export function multiplierAtSeconds(elapsedSec: number): number {
  if (elapsedSec <= 0) return 1.00;
  return Math.exp(GROWTH_RATE * elapsedSec);
}

/** How long the round runs from `starts_at` before reaching `crashMult`. */
export function timeToCrashSeconds(crashMult: number): number {
  if (crashMult <= 1.00) return 0;
  return Math.log(crashMult) / GROWTH_RATE;
}

/** Compute payout at a given cashout multiplier (after 5% fee on profit). */
export function payoutAtMultiplier(stakeCents: number, cashoutMult: number): {
  payout_cents: number; fee_cents: number; profit_cents: number;
} {
  const gross = Math.floor(stakeCents * cashoutMult);
  const profit = Math.max(0, gross - stakeCents);
  const fee = Math.floor(profit * CRASH_FEE_BPS / 10000);
  const payout = gross - fee;
  return { payout_cents: payout, fee_cents: fee, profit_cents: profit - fee };
}

/** Round state classification for the state endpoint. */
export type RoundPhase = 'pending' | 'running' | 'crashed' | 'cooldown';

export interface ComputedRoundState {
  phase: RoundPhase;
  currentMultiplier: number;       // 1.00 during pending; live during running; crash_multiplier after
  elapsedMs: number;               // since starts_at, 0 if pending
  msUntilStart: number;            // ms until starts_at (0 if running/crashed)
  msUntilCrash: number;            // ms until expected crash (0 if crashed/cooldown)
}

export function computeRoundState(
  betting_opens_at: string,
  starts_at: string,
  crashed_at: string | null,
  crash_multiplier: number,
  now: number = Date.now(),
): ComputedRoundState {
  const bettingOpens = new Date(betting_opens_at).getTime();
  const startsMs = new Date(starts_at).getTime();
  const willCrashAt = startsMs + timeToCrashSeconds(crash_multiplier) * 1000;
  const crashedMs = crashed_at ? new Date(crashed_at).getTime() : null;

  if (now < startsMs) {
    return {
      phase: now < bettingOpens ? 'cooldown' : 'pending',
      currentMultiplier: 1.00,
      elapsedMs: 0,
      msUntilStart: Math.max(0, startsMs - now),
      msUntilCrash: 0,
    };
  }
  // Running or already crashed
  if (crashedMs && now >= crashedMs) {
    return {
      phase: 'crashed',
      currentMultiplier: crash_multiplier,
      elapsedMs: crashedMs - startsMs,
      msUntilStart: 0,
      msUntilCrash: 0,
    };
  }
  // Crash-by-time check (server may not have updated row yet)
  if (now >= willCrashAt) {
    return {
      phase: 'crashed',
      currentMultiplier: crash_multiplier,
      elapsedMs: willCrashAt - startsMs,
      msUntilStart: 0,
      msUntilCrash: 0,
    };
  }
  const elapsed = (now - startsMs) / 1000;
  return {
    phase: 'running',
    currentMultiplier: Math.min(crash_multiplier, multiplierAtSeconds(elapsed)),
    elapsedMs: now - startsMs,
    msUntilStart: 0,
    msUntilCrash: Math.max(0, willCrashAt - now),
  };
}
