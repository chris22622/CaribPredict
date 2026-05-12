-- Phase 7: instant games (coinflip / dice / mines / plinko / wheel / slot)
-- + daily login bonus + bet feed support.

-- 1. Unified instant-games bet table. All single-round games write here;
--    Mines uses 'pending' status across multiple reveal actions.
CREATE TABLE IF NOT EXISTS instant_game_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL
    CHECK (game_type IN ('coinflip', 'dice', 'mines', 'plinko', 'wheel', 'slot')),
  stake_cents BIGINT NOT NULL CHECK (stake_cents >= 100),
  bonus_used_cents BIGINT NOT NULL DEFAULT 0,
  real_used_cents  BIGINT NOT NULL DEFAULT 0,
  server_seed_hash TEXT NOT NULL,
  server_seed TEXT,                           -- revealed after settlement
  client_seed TEXT NOT NULL DEFAULT '',
  nonce BIGINT NOT NULL DEFAULT 1,
  params JSONB NOT NULL,                      -- game-specific input
  result JSONB,                               -- outcome details for verification
  multiplier DECIMAL(10, 4),
  payout_cents BIGINT NOT NULL DEFAULT 0,
  fee_cents    BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'settled'
    CHECK (status IN ('pending', 'settled', 'voided', 'busted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_instant_bets_user   ON instant_game_bets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instant_bets_game   ON instant_game_bets(game_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instant_bets_status ON instant_game_bets(status);

-- 2. Daily login bonus claims (one per user per UTC day)
CREATE TABLE IF NOT EXISTS daily_login_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bonus_date DATE NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  streak_day INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, bonus_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_login_user ON daily_login_bonuses(user_id, bonus_date DESC);

-- 3. Streak tracking on users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS current_streak_days INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_bonus_date DATE,
  ADD COLUMN IF NOT EXISTS lifetime_streak_high INT NOT NULL DEFAULT 0;

-- 4. Per-user nonce counter for provably-fair (each new bet increments)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS games_nonce BIGINT NOT NULL DEFAULT 0;

-- 5. RLS
ALTER TABLE instant_game_bets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_login_bonuses  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full instant_game_bets" ON instant_game_bets
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "users see own instant_game_bets" ON instant_game_bets
  FOR SELECT USING (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role');
CREATE POLICY "anyone reads settled instant_game_bets for feed" ON instant_game_bets
  FOR SELECT USING (status = 'settled');

CREATE POLICY "service role full daily_login_bonuses" ON daily_login_bonuses
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "users see own daily_login_bonuses" ON daily_login_bonuses
  FOR SELECT USING (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role');
