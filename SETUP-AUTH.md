# Setup Authentication & Fix RLS Policies

## Step 1: Fix Supabase RLS Policies

Go to your Supabase project SQL Editor: https://supabase.com/dashboard/project/kkxumlpnpfqopgkjbozo/sql/new

Run this SQL:

```sql
-- Fix RLS policies to allow user creation and service role access

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can view own positions" ON positions;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;

-- Create new policies that work with service role
-- Allow service role to do anything (for API endpoints)
CREATE POLICY "Service role has full access to users" ON users
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Allow users to view and update their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT
  USING (auth.uid()::text = id::text OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (auth.uid()::text = id::text OR auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.uid()::text = id::text OR auth.jwt()->>'role' = 'service_role');

-- Allow authenticated users to insert themselves (for signup)
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
```

## Step 2: Enable Email Auth in Supabase

1. Go to: https://supabase.com/dashboard/project/kkxumlpnpfqopgkjbozo/auth/providers
2. Make sure **Email** provider is enabled
3. Disable email confirmations for easier testing:
   - Go to Auth > Email Templates
   - Under "Confirm signup", disable "Enable email confirmations"

## Step 3: Test the Site

1. Visit: https://carib-predict.vercel.app
2. Click the **Profile** icon (user icon in top right)
3. You should see a Login/Signup modal
4. Create an account - you'll get 10,000 sats to start!
5. After login, you should see your balance and the Wallet button

## Step 4: Test Wallet/BTCPay

After logging in:
1. Click the **Wallet** button (shows your balance)
2. Try depositing Bitcoin - it should redirect to BTCPay checkout
3. Try withdrawing - it should create a payout

## What's Fixed:

✅ RLS policies now allow:
  - Service role (API) to do anything
  - Users to insert themselves during signup
  - Users to view/update their own data
  - Users to create positions and transactions

✅ Authentication modal added to site
✅ New users get 10,000 sats welcome bonus
✅ Wallet button shows after login

## Troubleshooting:

**"new row violates row-level security policy for table users"**
- Run the SQL from Step 1 above

**Can't see login button**
- The Profile icon in the navbar opens the auth modal

**Email not verified**
- Disable email confirmations in Step 2

**Wallet button not showing**
- Make sure you're logged in first
- Check browser console for errors
