-- STEP 1: Drop ALL existing policies
-- Run this FIRST

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
