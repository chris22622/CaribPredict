// Referral tier calculation and earning helpers.
// Tiers are based on count of *referred users* who have actually placed at
// least one matched bet. (Counting all-time sign-ups would let people inflate
// tiers with fake accounts.)
//
// Rates expressed as basis points of the original house fee. So at tier
// Connector (150 bps), if a matched bet generates $5 in house fee, the
// referrer earns $5 * 0.015 = $0.075.

export interface ReferralTier {
  id: 'starter' | 'connector' | 'captain' | 'don';
  name: string;
  minActiveRefs: number;
  rateBps: number;        // basis points of source house fee
}

export const REFERRAL_TIERS: ReferralTier[] = [
  { id: 'starter',   name: 'Starter',   minActiveRefs: 1,  rateBps: 100 },  // 1.0%
  { id: 'connector', name: 'Connector', minActiveRefs: 5,  rateBps: 150 },  // 1.5%
  { id: 'captain',   name: 'Captain',   minActiveRefs: 15, rateBps: 200 },  // 2.0%
  { id: 'don',       name: 'Don',       minActiveRefs: 30, rateBps: 250 },  // 2.5%
];

export function tierForActiveReferrals(activeCount: number): ReferralTier {
  // Walk tiers high-to-low and return the first one the user qualifies for.
  for (let i = REFERRAL_TIERS.length - 1; i >= 0; i--) {
    if (activeCount >= REFERRAL_TIERS[i].minActiveRefs) return REFERRAL_TIERS[i];
  }
  // Default: zero tier, no earnings.
  return { id: 'starter', name: 'None', minActiveRefs: 0, rateBps: 0 };
}

export function earnedCentsFromFee(sourceFeeCents: number, rateBps: number): number {
  if (sourceFeeCents <= 0 || rateBps <= 0) return 0;
  return Math.floor(sourceFeeCents * rateBps / 10000);
}

// Welcome-bonus rules
export const WELCOME_BONUS_CENTS = 300;          // 3 USDT
export const WELCOME_BONUS_WAGERING_MULT = 10;   // 10x wagering on bonus credits

// Referral-code shape (purely cosmetic check; DB-level uniqueness is enforced)
export function isLikelyReferralCode(code: string): boolean {
  return typeof code === 'string' && /^[A-Z0-9]{4,10}$/.test(code.toUpperCase());
}
