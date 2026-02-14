-- STEP 2: Create fresh policies
-- Run this AFTER step 1

-- Users table policies
CREATE POLICY "Service role has full access to users" ON users
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can view own data" ON users
  FOR SELECT
  USING (auth.uid()::text = id::text OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (auth.uid()::text = id::text OR auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.uid()::text = id::text OR auth.jwt()->>'role' = 'service_role');

-- CRITICAL: This policy allows signup to work
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT
  WITH CHECK (auth.uid()::text = id::text OR auth.jwt()->>'role' = 'service_role');

-- Positions policies
CREATE POLICY "Service role has full access to positions" ON positions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can view own positions" ON positions
  FOR SELECT
  USING (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can create positions" ON positions
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can update own positions" ON positions
  FOR UPDATE
  USING (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role');

-- Transactions policies
CREATE POLICY "Service role has full access to transactions" ON transactions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT
  USING (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can create transactions" ON transactions
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role');

-- Verify the policies were created
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('users', 'positions', 'transactions')
ORDER BY tablename, cmd, policyname;
