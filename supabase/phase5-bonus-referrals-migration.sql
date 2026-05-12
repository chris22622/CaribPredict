-- Phase 5: welcome bonus tracking + referral system.

-- 1. New columns on users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bonus_balance_cents BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_wagering_required_cents BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_wagering_completed_cents BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS welcome_bonus_credited BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Unique referral codes per user (where set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code_unique
  ON users(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by_user_id);

-- 2. Referral earnings ledger
CREATE TABLE IF NOT EXISTS referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matched_bet_id UUID REFERENCES matched_bets(id) ON DELETE SET NULL,
  source_fee_cents BIGINT NOT NULL CHECK (source_fee_cents >= 0),
  rate_bps INT NOT NULL CHECK (rate_bps >= 0 AND rate_bps <= 1000),
  earned_cents BIGINT NOT NULL CHECK (earned_cents >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'voided')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer
  ON referral_earnings(referrer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referee
  ON referral_earnings(referee_id);

-- 3. Bonus grant ledger (log of every bonus credited, for accounting)
CREATE TABLE IF NOT EXISTS bonus_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL,
  reason TEXT NOT NULL,
  wagering_multiplier INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bonus_grants_user ON bonus_grants(user_id, created_at DESC);

-- 4. Referral code generator. 6-char base32-ish (no ambiguous chars: 0/O, 1/I/L).
CREATE OR REPLACE FUNCTION cp_generate_referral_code() RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result TEXT;
  attempts INT := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM users WHERE referral_code = result);
    attempts := attempts + 1;
    IF attempts > 50 THEN RAISE EXCEPTION 'Could not generate unique referral code'; END IF;
  END LOOP;
  RETURN result;
END;
$$;

-- 5. Backfill referral codes for any existing users that don't have one
UPDATE users SET referral_code = cp_generate_referral_code() WHERE referral_code IS NULL;

-- 6. RLS
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full referral_earnings" ON referral_earnings
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "users see own referral_earnings" ON referral_earnings
  FOR SELECT USING (auth.uid()::text = referrer_id::text OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "service role full bonus_grants" ON bonus_grants
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "users see own bonus_grants" ON bonus_grants
  FOR SELECT USING (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role');
