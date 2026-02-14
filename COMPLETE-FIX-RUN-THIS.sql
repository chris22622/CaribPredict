-- COMPLETE RLS FIX - Paste this entire file into Supabase SQL Editor and click Run
-- This combines both DROP and CREATE in one transaction

-- ========================================
-- STEP 1: Drop ALL existing policies
-- ========================================

DROP POLICY IF EXISTS "Service role has full access to users" ON users;
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;

DROP POLICY IF EXISTS "Service role has full access to positions" ON positions;
DROP POLICY IF EXISTS "Users can view own positions" ON positions;
DROP POLICY IF EXISTS "Users can create positions" ON positions;
DROP POLICY IF EXISTS "Users can update own positions" ON positions;

DROP POLICY IF EXISTS "Service role has full access to transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON transactions;

-- ========================================
-- STEP 2: Create fresh policies
-- ========================================

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

-- ⭐ CRITICAL: This policy allows signup to work
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

-- ========================================
-- Verification: Show all policies
-- ========================================
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('users', 'positions', 'transactions')
ORDER BY tablename, cmd, policyname;

-- You should see 11 policies total:
-- 4 for users (ALL, SELECT, UPDATE, INSERT)
-- 4 for positions (ALL, SELECT, INSERT, UPDATE)
-- 3 for transactions (ALL, SELECT, INSERT)
