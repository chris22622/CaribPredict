-- CaribCrash schema.
-- Each round is a single provably-fair crash event. The server_seed is
-- generated up front and hashed; the hash is published immediately and the
-- raw seed is revealed only after the round ends so players can verify.

CREATE TABLE IF NOT EXISTS crash_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number BIGSERIAL UNIQUE,
  server_seed TEXT,                     -- revealed after the round ends
  server_seed_hash TEXT NOT NULL,       -- sha256(server_seed) published at round start
  client_seed TEXT,                     -- optional, deterministic salt (round_number is fine)
  crash_multiplier DECIMAL(10, 4) NOT NULL CHECK (crash_multiplier >= 1.00),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'crashed')),
  betting_opens_at TIMESTAMPTZ NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,        -- when multiplier begins climbing
  crashed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crash_rounds_status ON crash_rounds(status, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_crash_rounds_round_number ON crash_rounds(round_number DESC);

CREATE TABLE IF NOT EXISTS crash_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES crash_rounds(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stake_cents BIGINT NOT NULL CHECK (stake_cents >= 100),
  bonus_used_cents BIGINT NOT NULL DEFAULT 0,
  real_used_cents  BIGINT NOT NULL DEFAULT 0,
  auto_cashout_multiplier DECIMAL(10, 4),     -- null = manual only
  cashout_multiplier      DECIMAL(10, 4),     -- null if rode the crash
  payout_cents BIGINT NOT NULL DEFAULT 0,
  fee_cents    BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'cashed_out', 'crashed', 'voided')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cashed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crash_bets_round ON crash_bets(round_id, status);
CREATE INDEX IF NOT EXISTS idx_crash_bets_user  ON crash_bets(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crash_bets_one_per_round
  ON crash_bets(round_id, user_id);

ALTER TABLE crash_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE crash_bets   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full crash_rounds" ON crash_rounds
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "anyone reads crash_rounds" ON crash_rounds
  FOR SELECT USING (true);

CREATE POLICY "service role full crash_bets" ON crash_bets
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "users see own crash_bets" ON crash_bets
  FOR SELECT USING (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role');
CREATE POLICY "anyone reads matched volume crash_bets" ON crash_bets
  FOR SELECT USING (true);
