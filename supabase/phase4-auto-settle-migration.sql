-- Phase 4: auto-settlement infrastructure.
-- Each market can optionally declare a data source + config the cron job
-- uses to pick a winning option without admin intervention.

ALTER TABLE markets
  ADD COLUMN IF NOT EXISTS auto_settle_source TEXT
    CHECK (auto_settle_source IS NULL OR auto_settle_source IN ('coingecko', 'apifootball', 'manual')),
  ADD COLUMN IF NOT EXISTS auto_settle_config JSONB,
  ADD COLUMN IF NOT EXISTS auto_settle_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_settle_last_error TEXT;

-- Index used by the auto-settle cron to find pending closes.
CREATE INDEX IF NOT EXISTS idx_markets_auto_settle_pending
  ON markets(close_date)
  WHERE resolved = false AND auto_settle_source IS NOT NULL AND auto_settle_source <> 'manual';

-- One row per auto-settle attempt for diagnostics + audit.
CREATE TABLE IF NOT EXISTS auto_settle_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID REFERENCES markets(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('settled', 'deferred', 'failed', 'voided')),
  oracle_value JSONB,
  winning_option_id UUID,
  winning_side TEXT CHECK (winning_side IS NULL OR winning_side IN ('YES', 'NO')),
  error TEXT,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_settle_runs_market
  ON auto_settle_runs(market_id, ran_at DESC);

-- RLS
ALTER TABLE auto_settle_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full auto_settle_runs" ON auto_settle_runs
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role');
