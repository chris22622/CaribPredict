/**
 * Automated Market Maker using Logarithmic Market Scoring Rule (LMSR)
 *
 * LMSR Formula:
 * Cost function: C(q) = b * ln(sum(e^(q_i/b)))
 * where:
 * - b is the liquidity parameter (higher = more liquidity, less price movement)
 * - q_i is the quantity of shares for outcome i
 */

export interface MarketState {
  shares: number[]; // Current shares for each option
  liquidityParameter: number; // The 'b' parameter
}

export interface PriceQuote {
  price: number; // Price per share (0 to 1)
  cost: number; // Total cost in satoshis
  newProbability: number; // New probability after trade
}

/**
 * Calculate the cost function for LMSR
 */
function costFunction(shares: number[], b: number): number {
  const sum = shares.reduce((acc, q) => acc + Math.exp(q / b), 0);
  return b * Math.log(sum);
}

/**
 * Calculate current probability for an option
 */
export function calculateProbability(shares: number[], optionIndex: number, b: number): number {
  const qi = shares[optionIndex];
  const sum = shares.reduce((acc, q) => acc + Math.exp(q / b), 0);
  return Math.exp(qi / b) / sum;
}

/**
 * Calculate all probabilities for a market
 */
export function calculateAllProbabilities(shares: number[], b: number): number[] {
  return shares.map((_, i) => calculateProbability(shares, i, b));
}

/**
 * Calculate the cost to buy shares of an option
 */
export function calculateBuyCost(
  marketState: MarketState,
  optionIndex: number,
  sharesToBuy: number
): PriceQuote {
  const { shares, liquidityParameter: b } = marketState;

  // Current cost
  const currentCost = costFunction(shares, b);

  // New shares after buying
  const newShares = [...shares];
  newShares[optionIndex] += sharesToBuy;

  // New cost
  const newCost = costFunction(newShares, b);

  // Cost to buy is the difference
  const cost = Math.max(0, newCost - currentCost);

  // Average price per share
  const price = sharesToBuy > 0 ? cost / sharesToBuy : 0;

  // New probability
  const newProbability = calculateProbability(newShares, optionIndex, b);

  return {
    price,
    cost,
    newProbability,
  };
}

/**
 * Calculate the payout from selling shares of an option
 */
export function calculateSellPayout(
  marketState: MarketState,
  optionIndex: number,
  sharesToSell: number
): PriceQuote {
  const { shares, liquidityParameter: b } = marketState;

  // Current cost
  const currentCost = costFunction(shares, b);

  // New shares after selling
  const newShares = [...shares];
  newShares[optionIndex] = Math.max(0, newShares[optionIndex] - sharesToSell);

  // New cost
  const newCost = costFunction(newShares, b);

  // Payout is the difference (positive value)
  const cost = Math.max(0, currentCost - newCost);

  // Average price per share
  const price = sharesToSell > 0 ? cost / sharesToSell : 0;

  // New probability
  const newProbability = calculateProbability(newShares, optionIndex, b);

  return {
    price,
    cost,
    newProbability,
  };
}

/**
 * Calculate instant price for buying one share (marginal price)
 */
export function getInstantPrice(
  marketState: MarketState,
  optionIndex: number
): number {
  return calculateProbability(marketState.shares, optionIndex, marketState.liquidityParameter);
}

/**
 * Format satoshis to display
 */
export function formatSatoshis(sats: number): string {
  if (sats >= 1000000) {
    return `${(sats / 1000000).toFixed(2)}M sats`;
  } else if (sats >= 1000) {
    return `${(sats / 1000).toFixed(1)}k sats`;
  }
  return `${Math.round(sats)} sats`;
}

/**
 * Format probability as percentage
 */
export function formatProbability(prob: number): string {
  return `${(prob * 100).toFixed(1)}%`;
}
