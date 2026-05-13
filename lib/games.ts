// Shared provably-fair primitives for instant games.
//
// Pattern (Bustabit / Stake style):
//   - Server holds a server_seed (32-byte random). At bet placement, we publish
//     sha256(server_seed) as server_seed_hash. After the bet, we reveal the
//     server_seed and the client can verify the outcome locally.
//   - Per-user `nonce` (monotonic int) is added so the same seed produces a
//     different stream for each bet.
//   - HMAC-SHA256(server_seed, `${client_seed}:${nonce}:${cursor}`)
//     -> hex digest. Take 4 bytes at a time as a 32-bit int, divide by 2^32
//     to get uniform u ∈ [0, 1). Concat multiple rolls if you need more.
//
// All instant games carry a 5% house edge unless noted.

import { createHash, createHmac, randomBytes } from 'crypto';

export const HOUSE_FEE_BPS = 500;          // 5%
export const MIN_INSTANT_STAKE_CENTS = 100; // 1 USDT
export const MAX_INSTANT_STAKE_CENTS = 100_000_00; // 1,000 USDT

export interface ProvablyFair {
  server_seed: string;
  server_seed_hash: string;
  client_seed: string;
  nonce: number;
}

export function makeServerSeed(): { seed: string; hash: string } {
  const seed = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(seed).digest('hex');
  return { seed, hash };
}

/** Produce N uniform floats in [0, 1) from (server_seed, client_seed, nonce). */
export function uniformRolls(
  serverSeed: string, clientSeed: string, nonce: number, count: number,
): number[] {
  const rolls: number[] = [];
  let cursor = 0;
  while (rolls.length < count) {
    const msg = `${clientSeed}:${nonce}:${cursor}`;
    const h = createHmac('sha256', serverSeed).update(msg).digest('hex');
    // Each hex digest = 64 chars = 32 bytes. 8 chars (= 4 bytes = 32 bits)
    // gives us 8 floats per HMAC call.
    for (let i = 0; i < 64 && rolls.length < count; i += 8) {
      const intVal = parseInt(h.slice(i, i + 8), 16);
      rolls.push(intVal / 0x1_0000_0000);
    }
    cursor++;
  }
  return rolls;
}

// ─────────────────────────────────────────────────────────────────────────
// Coin Flip — 49% chance each side, 2% on a "miss" that goes to house.
// Effectively 1.95× payout on a 50/50 visual.
// We implement as: u < 0.475 → HEADS, u < 0.95 → TAILS, else MISS.
// ─────────────────────────────────────────────────────────────────────────

export type CoinSide = 'HEADS' | 'TAILS';
export interface CoinFlipResult {
  side: CoinSide;
  miss: boolean;             // true when neither side won (5% edge)
  multiplier: number;        // 1.95 if pick matches and not miss, 0 otherwise
  roll: number;              // raw u for verification
}

export function flipCoin(pf: ProvablyFair, pick: CoinSide): CoinFlipResult {
  const [u] = uniformRolls(pf.server_seed, pf.client_seed, pf.nonce, 1);
  let side: CoinSide;
  let miss = false;
  if (u < 0.475) side = 'HEADS';
  else if (u < 0.95) side = 'TAILS';
  else { side = u < 0.975 ? 'HEADS' : 'TAILS'; miss = true; }
  const win = !miss && side === pick;
  return { side, miss, multiplier: win ? 1.95 : 0, roll: u };
}

// ─────────────────────────────────────────────────────────────────────────
// Dice — user picks an integer target in [2, 98] and direction (over/under).
// Win probability = (target - 1) / 100 if 'under', or (99 - target) / 100 if 'over'.
// Payout multiplier (with 5% house edge) = 0.95 / win_probability.
// Roll is 0.00 → 99.99 (uniform integer * 0.01).
// ─────────────────────────────────────────────────────────────────────────

export interface DiceResult {
  roll: number;              // 0.00 ... 99.99
  multiplier: number;        // payout multiplier if win, 0 if loss
  win: boolean;
  win_probability: number;
}

export function rollDice(
  pf: ProvablyFair, target: number, direction: 'over' | 'under',
): DiceResult {
  const [u] = uniformRolls(pf.server_seed, pf.client_seed, pf.nonce, 1);
  const roll = Math.floor(u * 10000) / 100;  // 0.00 to 99.99 step 0.01
  const tgt = Math.max(2, Math.min(98, target));
  const winProb = direction === 'under' ? (tgt - 1) / 100 : (99 - tgt) / 100;
  const win = direction === 'under' ? roll < tgt : roll > tgt;
  const mult = winProb > 0 ? Math.floor(((1 - HOUSE_FEE_BPS / 10000) / winProb) * 100) / 100 : 0;
  return { roll, multiplier: win ? mult : 0, win, win_probability: winProb };
}

// ─────────────────────────────────────────────────────────────────────────
// Mines — N×N grid (default 5×5), M mines placed at fixed-random positions
// once the bet is created. User reveals tiles one at a time. Each safe tile
// reveals a higher multiplier. Hitting a mine busts.
//
// Payout schedule (5% house edge):
//   For an N×N grid with M mines, K safe tiles revealed:
//     fair_payout = C(safe, K) / C(safe, K) ... actually:
//     fair_mult(K) = product over i=0..K-1 of (safe - i) / (total - i - <hit_mines_at_i>)
//   Simpler exact formula:
//     P(safe pick i+1 given i correct) = (safe - i) / (total - i)
//     fair_mult = 1 / product = product of (total - i) / (safe - i)
//   With 5% house edge: payout_mult = 0.95 * fair_mult
//
// We DON'T sample mine positions up front; instead the first reveal seeds the
// per-bet grid from (server_seed, nonce). This way the seed isn't burned until
// the player actually plays.
// ─────────────────────────────────────────────────────────────────────────

export function minesGridFromSeed(
  serverSeed: string, clientSeed: string, nonce: number, total: number, mines: number,
): number[] {
  // Knuth-Fisher-Yates style shuffle, take first `mines` indices.
  const rolls = uniformRolls(serverSeed, clientSeed, nonce, total - 1);
  const arr: number[] = Array.from({ length: total }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rolls[arr.length - 1 - i] * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, mines).sort((a, b) => a - b);
}

export function minesMultiplier(total: number, mines: number, safeRevealed: number): number {
  if (safeRevealed <= 0) return 1.00;
  const safe = total - mines;
  if (safeRevealed > safe) return 0;
  // Fair multiplier = product of (total - i) / (safe - i) for i in 0..safeRevealed-1
  let mult = 1.0;
  for (let i = 0; i < safeRevealed; i++) {
    mult *= (total - i) / (safe - i);
  }
  const withEdge = mult * (1 - HOUSE_FEE_BPS / 10000);
  return Math.floor(withEdge * 100) / 100;
}

/** Calculate the gross payout in cents (no separate fee row for instant games;
 * the edge is already in the multiplier). */
export function instantPayoutCents(stakeCents: number, mult: number): number {
  return Math.max(0, Math.floor(stakeCents * mult));
}

/** Hex digest of a string (used to confirm provably-fair hashes). */
export function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

// ─────────────────────────────────────────────────────────────────────────
// Plinko — ball drops through N rows of pegs, bouncing L/R at each row,
// lands in one of N+1 bins. Each bin has a multiplier. Probabilities are
// binomial: middle bins very likely, edges very rare but high-multiplier.
//
// Multiplier tables (8 rows, ~1% house edge — industry standard):
//   Low:  [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6]
//   Med:  [13,  3,   1.3, 0.7, 0.4, 0.7, 1.3, 3,  13]
//   High: [29,  4,   1.5, 0.3, 0.2, 0.3, 1.5, 4,  29]
// ─────────────────────────────────────────────────────────────────────────

export type PlinkoRisk = 'low' | 'medium' | 'high';
export const PLINKO_ROWS = [8, 12, 16] as const;

const MULTIPLIERS_8: Record<PlinkoRisk, number[]> = {
  low:    [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
  medium: [13,  3,   1.3, 0.7, 0.4, 0.7, 1.3, 3,   13],
  high:   [29,  4,   1.5, 0.3, 0.2, 0.3, 1.5, 4,   29],
};
const MULTIPLIERS_12: Record<PlinkoRisk, number[]> = {
  low:    [10,  3,   1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3,   10],
  medium: [33,  11,  4,   2,   1.1, 0.6, 0.3, 0.6, 1.1, 2,   4,   11,  33],
  high:   [170, 24,  8.1, 2,   0.7, 0.2, 0.2, 0.2, 0.7, 2,   8.1, 24,  170],
};
const MULTIPLIERS_16: Record<PlinkoRisk, number[]> = {
  low:    [16, 9,   2,   1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2,   9,   16],
  medium: [110,41,  10,  5,   3,   1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3,   5,   10,  41,  110],
  high:   [1000,130,26,  9,   4,   2,   0.2, 0.2, 0.2, 0.2, 0.2, 2,   4,   9,   26,  130, 1000],
};

export function plinkoMultipliers(rows: number, risk: PlinkoRisk): number[] {
  if (rows === 8)  return MULTIPLIERS_8[risk];
  if (rows === 12) return MULTIPLIERS_12[risk];
  if (rows === 16) return MULTIPLIERS_16[risk];
  return MULTIPLIERS_8[risk];
}

export interface PlinkoResult {
  /** One per row: 'L' = bounced left, 'R' = bounced right. */
  path: ('L' | 'R')[];
  /** Final bin index, 0..rows. */
  bin: number;
  /** Multiplier paid out at that bin. */
  multiplier: number;
}

export function dropPlinko(pf: ProvablyFair, rows: number, risk: PlinkoRisk): PlinkoResult {
  const rolls = uniformRolls(pf.server_seed, pf.client_seed, pf.nonce, rows);
  const path: ('L' | 'R')[] = rolls.map(u => (u < 0.5 ? 'L' : 'R'));
  // Bin = number of right bounces (0..rows)
  const bin = path.filter(d => d === 'R').length;
  const mults = plinkoMultipliers(rows, risk);
  const multiplier = mults[bin];
  return { path, bin, multiplier };
}
