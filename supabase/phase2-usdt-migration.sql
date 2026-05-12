-- Phase 2 schema additions for USDT deposits, withdrawals, and wagering.
-- Run this in Supabase SQL Editor before shipping Phase 2 code.

-- 1. New columns on users for USDT balance + wagering tracking
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS balance_cents BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wagering_required_cents BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wagering_completed_cents BIGINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_balance_cents ON users(balance_cents);

-- 2. Deposit intents: user requests a deposit, we issue a unique tag to identify
-- their incoming USDT transaction by its trailing decimal places.
CREATE TABLE IF NOT EXISTS deposit_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  base_amount_cents BIGINT NOT NULL CHECK (base_amount_cents >= 500),  -- min 5 USDT
  tag SMALLINT NOT NULL CHECK (tag >= 0 AND tag <= 9999),
  expected_total_cents BIGINT NOT NULL,  -- base + tag (e.g. $20.0042)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'expired', 'cancelled')),
  tx_hash TEXT,
  matched_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deposit_intents_status ON deposit_intents(status, expected_total_cents);
CREATE INDEX IF NOT EXISTS idx_deposit_intents_user_id ON deposit_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_intents_expires_at ON deposit_intents(expires_at)
  WHERE status = 'pending';

-- 3. Confirmed deposits ledger (one row per TRC-20 tx we credit).
CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  intent_id UUID REFERENCES deposit_intents(id) ON DELETE SET NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  from_address TEXT NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL DEFAULT 'credited' CHECK (status IN ('credited', 'reversed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposits_tx_hash ON deposits(tx_hash);

-- 4. Withdrawal requests + their on-chain status.
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_address TEXT NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 500),  -- min 5 USDT
  fee_cents BIGINT NOT NULL DEFAULT 100,  -- 1 USDT gas fee
  net_cents BIGINT NOT NULL,  -- amount_cents - fee_cents (what actually sends on-chain)
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'confirmed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status, created_at);

-- 5. Cron run log so we can debug deposit polling.
CREATE TABLE IF NOT EXISTS cron_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  last_block_timestamp BIGINT,  -- ms epoch, the high-water mark we've processed up to
  transfers_seen INT NOT NULL DEFAULT 0,
  deposits_credited INT NOT NULL DEFAULT 0,
  duration_ms INT,
  error_message TEXT,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_runs_job_ran_at ON cron_runs(job_name, ran_at DESC);

-- 6. RLS policies: service role does everything; users see only their own rows.
ALTER TABLE deposit_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access deposit_intents" ON deposit_intents
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "users see own deposit_intents" ON deposit_intents
  FOR SELECT USING (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "service role full access deposits" ON deposits
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "users see own deposits" ON deposits
  FOR SELECT USING (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "service role full access withdrawals" ON withdrawals
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "users see own withdrawals" ON withdrawals
  FOR SELECT USING (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "service role full access cron_runs" ON cron_runs
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Done. The deposit poller and withdrawal sender both run with service role.
