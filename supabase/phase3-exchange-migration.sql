-- Phase 3 schema: peer-to-peer betting exchange.
-- bet_orders = the order book (open + matched).
-- matched_bets = one row per pairing of a YES order and a NO order.
-- house_fee_ledger = 5% take per matched bet, for revenue tracking.

CREATE TABLE IF NOT EXISTS bet_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES market_options(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('YES', 'NO')),
  stake_cents BIGINT NOT NULL CHECK (stake_cents >= 100),
  matched_cents BIGINT NOT NULL DEFAULT 0 CHECK (matched_cents >= 0),
  probability_at_order DECIMAL(5,4) NOT NULL CHECK (probability_at_order > 0 AND probability_at_order < 1),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partial', 'matched', 'refunded', 'won', 'lost', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bet_orders_market_status ON bet_orders(market_id, option_id, side, status, created_at);
CREATE INDEX IF NOT EXISTS idx_bet_orders_user ON bet_orders(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS matched_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES market_options(id) ON DELETE CASCADE,
  yes_order_id UUID NOT NULL REFERENCES bet_orders(id) ON DELETE CASCADE,
  no_order_id UUID NOT NULL REFERENCES bet_orders(id) ON DELETE CASCADE,
  yes_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  no_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  yes_stake_cents BIGINT NOT NULL,
  no_stake_cents BIGINT NOT NULL,
  total_pool_cents BIGINT NOT NULL,
  yes_probability DECIMAL(5,4) NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'settled', 'voided')),
  winner_side TEXT CHECK (winner_side IS NULL OR winner_side IN ('YES', 'NO')),
  fee_cents BIGINT NOT NULL,
  winner_payout_cents BIGINT,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matched_bets_market ON matched_bets(market_id, status);
CREATE INDEX IF NOT EXISTS idx_matched_bets_users ON matched_bets(yes_user_id, no_user_id);

CREATE TABLE IF NOT EXISTS house_fee_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matched_bet_id UUID REFERENCES matched_bets(id) ON DELETE SET NULL,
  market_id UUID REFERENCES markets(id) ON DELETE SET NULL,
  fee_cents BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_house_fee_created ON house_fee_ledger(created_at DESC);

-- RLS: service role does everything, users see only their own rows.
ALTER TABLE bet_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE matched_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_fee_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full bet_orders" ON bet_orders
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "users see own bet_orders" ON bet_orders
  FOR SELECT USING (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role');
CREATE POLICY "users see all open orders" ON bet_orders
  FOR SELECT USING (status IN ('open', 'partial'));

CREATE POLICY "service role full matched_bets" ON matched_bets
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "users see own matched_bets" ON matched_bets
  FOR SELECT USING (
    auth.uid()::text = yes_user_id::text
    OR auth.uid()::text = no_user_id::text
    OR auth.jwt()->>'role' = 'service_role'
  );
CREATE POLICY "anyone sees matched volumes" ON matched_bets
  FOR SELECT USING (true);

CREATE POLICY "service role full house_fee_ledger" ON house_fee_ledger
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- A trigger so updated_at on bet_orders stays current.
CREATE OR REPLACE FUNCTION cp_bet_orders_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_bet_orders_touch_updated_at ON bet_orders;
CREATE TRIGGER trg_bet_orders_touch_updated_at
  BEFORE UPDATE ON bet_orders
  FOR EACH ROW EXECUTE PROCEDURE cp_bet_orders_touch_updated_at();
