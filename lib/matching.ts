// Peer-to-peer matching for the CaribPredict exchange.
//
// Model (post-fee multipliers, matches the product spec):
//   - YES backer stakes A_yes. If YES wins, payout = A_yes * 0.95 / P
//   - NO backer  stakes A_no.  If NO wins,  payout = A_no  * 0.95 / (1 - P)
//   - For a matched pair: A_no = A_yes * (1 - P) / P, so pool = A_yes + A_no = A_yes / P
//   - Winner takes 95% of the pool. House keeps 5%.
//
// At matching time, both sides have a `probability_at_order` (the market's
// probability when their order was placed). We match orders whose probabilities
// are within MATCH_PROB_TOLERANCE of each other.

export const HOUSE_FEE_BPS = 500;  // 5.00% (basis points: 100 = 1%)
export const MATCH_PROB_TOLERANCE = 0.01;
export const MIN_ORDER_CENTS = 100;     // 1 USDT
export const MIN_MATCH_CENTS = 1;       // we won't bother creating < 1-cent matches

export interface OpenOrder {
  id: string;
  user_id: string;
  side: 'YES' | 'NO';
  stake_cents: number;          // total stake originally placed
  matched_cents: number;        // already matched portion
  probability_at_order: number; // 0-1, locked-in P at order time
}

export interface MatchPlan {
  yes_order_id: string;
  no_order_id: string;
  yes_user_id: string;
  no_user_id: string;
  yes_stake_cents: number;      // portion of the YES order consumed by this match
  no_stake_cents: number;       // portion of the NO  order consumed by this match
  pool_cents: number;           // yes_stake + no_stake
  yes_probability: number;      // P used to compute this match (avg of the two orders)
  fee_cents: number;            // floor(pool * fee_bps / 10000)
}

function remaining(o: OpenOrder): number {
  return Math.max(0, o.stake_cents - o.matched_cents);
}

/**
 * Compute the implied counterparty stake needed to fully match `o`.
 * If `o` is a YES order at P, counterparty NO stake = remaining(o) * (1-P)/P.
 * Returned in cents, rounded down.
 */
export function impliedCounterpartyCents(o: OpenOrder): number {
  const r = remaining(o);
  if (r <= 0) return 0;
  if (o.side === 'YES') return Math.floor(r * (1 - o.probability_at_order) / o.probability_at_order);
  return Math.floor(r * o.probability_at_order / (1 - o.probability_at_order));
}

/**
 * Given a newly-placed order and a FIFO list of opposite-side open orders,
 * compute a sequence of partial matches consuming the new order. Returns the
 * planned matches plus how much of the new order remains unmatched.
 *
 * Does no DB writes — caller persists results.
 */
export function planMatches(
  newOrder: OpenOrder,
  oppositeBook: OpenOrder[],
): { matches: MatchPlan[]; newOrderUnmatchedCents: number } {
  const matches: MatchPlan[] = [];
  let newRem = remaining(newOrder);

  for (const counter of oppositeBook) {
    if (newRem < MIN_MATCH_CENTS) break;
    const counterRem = remaining(counter);
    if (counterRem < MIN_MATCH_CENTS) continue;

    // Skip incompatible probabilities.
    if (Math.abs(counter.probability_at_order - newOrder.probability_at_order) > MATCH_PROB_TOLERANCE) {
      continue;
    }
    // Don't self-match against your own counter-order.
    if (counter.user_id === newOrder.user_id) continue;

    // Pick a single P for the match (average; both are within tolerance).
    const P = (counter.probability_at_order + newOrder.probability_at_order) / 2;

    // Identify which side is YES vs NO.
    const yesOrder = newOrder.side === 'YES' ? newOrder : counter;
    const noOrder  = newOrder.side === 'YES' ? counter : newOrder;

    // We want to consume some yesAmt and the corresponding noAmt = yesAmt * (1-P)/P.
    // Both must be <= each side's remaining and >= MIN_MATCH_CENTS.
    const yesRem = newOrder.side === 'YES' ? newRem : counterRem;
    const noRem  = newOrder.side === 'YES' ? counterRem : newRem;

    // Cap by YES remaining
    let yesAmt = yesRem;
    let noAmt  = Math.floor(yesAmt * (1 - P) / P);

    // Re-cap if NO side is the binding constraint
    if (noAmt > noRem) {
      noAmt = noRem;
      yesAmt = Math.floor(noAmt * P / (1 - P));
    }

    if (yesAmt < MIN_MATCH_CENTS || noAmt < MIN_MATCH_CENTS) continue;

    const pool = yesAmt + noAmt;
    const fee = Math.floor(pool * HOUSE_FEE_BPS / 10000);

    matches.push({
      yes_order_id: yesOrder.id,
      no_order_id:  noOrder.id,
      yes_user_id:  yesOrder.user_id,
      no_user_id:   noOrder.user_id,
      yes_stake_cents: yesAmt,
      no_stake_cents:  noAmt,
      pool_cents: pool,
      yes_probability: P,
      fee_cents: fee,
    });

    // Reduce the running tallies. We mutate the local view of `counter` so a
    // single counter order can produce multiple matches across a loop.
    if (newOrder.side === 'YES') {
      newRem -= yesAmt;
      counter.matched_cents += noAmt;
    } else {
      newRem -= noAmt;
      counter.matched_cents += yesAmt;
    }
  }

  return { matches, newOrderUnmatchedCents: newRem };
}

/**
 * Total amount actually consumed from a planned-matches list, per side.
 * Useful for caller to update bet_orders.matched_cents after persisting.
 */
export function consumedByOrder(matches: MatchPlan[]): Record<string, number> {
  const consumed: Record<string, number> = {};
  for (const m of matches) {
    consumed[m.yes_order_id] = (consumed[m.yes_order_id] || 0) + m.yes_stake_cents;
    consumed[m.no_order_id]  = (consumed[m.no_order_id]  || 0) + m.no_stake_cents;
  }
  return consumed;
}

/**
 * Compute market probability from matched volume (per market_id).
 * P = matched_yes / (matched_yes + matched_no). Default 0.5 when no matches yet.
 */
export function probabilityFromVolumes(matchedYesCents: number, matchedNoCents: number): number {
  const total = matchedYesCents + matchedNoCents;
  if (total <= 0) return 0.5;
  return Math.max(0.01, Math.min(0.99, matchedYesCents / total));
}

/**
 * Payout for the winning side of a matched bet (after 5% fee).
 * pool * (1 - fee_bps/10000).
 */
export function winnerPayoutCents(poolCents: number): number {
  return Math.floor(poolCents * (10000 - HOUSE_FEE_BPS) / 10000);
}
