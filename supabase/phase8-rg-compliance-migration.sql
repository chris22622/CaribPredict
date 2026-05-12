-- Phase 8: responsible gambling, self-exclusion, deposit limits, and an
-- audit-friendly cookie/age-gate acceptance log.

-- 1. Self-exclusion record. Active row = excluded; blocks bet endpoints.
CREATE TABLE IF NOT EXISTS self_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,                 -- null = permanent
  released_at TIMESTAMPTZ,             -- non-null = lifted (only by support, not user)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_self_exclusions_user_active
  ON self_exclusions(user_id)
  WHERE released_at IS NULL;

-- 2. User-set deposit and wager limits (daily / weekly / monthly caps).
CREATE TABLE IF NOT EXISTS user_responsible_limits (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  daily_deposit_cap_cents BIGINT,      -- null = no cap
  weekly_deposit_cap_cents BIGINT,
  monthly_deposit_cap_cents BIGINT,
  daily_wager_cap_cents BIGINT,
  daily_loss_cap_cents BIGINT,
  cooling_off_until TIMESTAMPTZ,       -- temporary lockout, < self-exclusion
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Cookie/age-gate acceptance ledger (per device cookie)
CREATE TABLE IF NOT EXISTS cookie_acceptance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_cookie TEXT NOT NULL,         -- random uuid stored in browser
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_hash TEXT,                        -- sha256 of IP for audit, not the IP itself
  user_agent TEXT,
  age_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  cookies_accepted BOOLEAN NOT NULL DEFAULT TRUE,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cookie_acceptance_device ON cookie_acceptance(device_cookie);
CREATE INDEX IF NOT EXISTS idx_cookie_acceptance_user ON cookie_acceptance(user_id);

-- 4. Email send log (idempotency + audit + dispute defense)
CREATE TABLE IF NOT EXISTS email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  template TEXT NOT NULL,              -- 'deposit-credited', 'withdraw-sent', 'big-win', etc.
  subject TEXT NOT NULL,
  resend_id TEXT,                      -- provider message id
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  error TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_send_log_user ON email_send_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_template ON email_send_log(template, created_at DESC);

-- 5. RLS
ALTER TABLE self_exclusions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_responsible_limits  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cookie_acceptance        ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_send_log           ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service full self_exclusions" ON self_exclusions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "users see own self_exclusions" ON self_exclusions
  FOR SELECT USING (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "service full user_responsible_limits" ON user_responsible_limits
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "users see own user_responsible_limits" ON user_responsible_limits
  FOR SELECT USING (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "service full cookie_acceptance" ON cookie_acceptance
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "service full email_send_log" ON email_send_log
  FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role');
