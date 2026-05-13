-- Phase 14: weekly rakeback + cashback payout ledger.
-- One row per (user, week_starting). Idempotent via UNIQUE so the cron
-- can re-run safely.

CREATE TABLE IF NOT EXISTS weekly_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_starting DATE NOT NULL,         -- Monday 00:00 UTC of the week being paid
  rakeback_cents BIGINT NOT NULL DEFAULT 0 CHECK (rakeback_cents >= 0),
  cashback_cents BIGINT NOT NULL DEFAULT 0 CHECK (cashback_cents >= 0),
  total_cents BIGINT NOT NULL CHECK (total_cents >= 0),
  tier_id TEXT,
  tier_rakeback_bps INT,
  cashback_rate_bps INT,
  fees_paid_cents BIGINT NOT NULL DEFAULT 0,
  net_losses_cents BIGINT NOT NULL DEFAULT 0,
  wagered_cents BIGINT NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_starting)
);

CREATE INDEX IF NOT EXISTS idx_weekly_payouts_user ON weekly_payouts(user_id, week_starting DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_payouts_week ON weekly_payouts(week_starting DESC);

ALTER TABLE weekly_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full weekly_payouts" ON weekly_payouts
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "users see own weekly_payouts" ON weekly_payouts
  FOR SELECT USING (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role');
