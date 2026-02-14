# Fix RLS Policy Error - RUN THIS NOW

## The Problem
You're getting: **"new row violates row-level security policy for table 'users'"**

This happens because the INSERT policy for the users table doesn't exist or is misconfigured.

## The Solution

### Step 1: Go to Supabase SQL Editor
Open this URL in your browser:
https://supabase.com/dashboard/project/kkxumlpnpfqopgkjbozo/sql/new

### Step 2: Copy the SQL
Open the file: `D:\Bot Projects\CaribPredict\FINAL-RLS-FIX.sql`

Copy ALL the contents (Ctrl+A, Ctrl+C)

### Step 3: Paste and Run
1. Paste into the SQL Editor
2. Click "Run" button
3. You should see a success message and a table showing all the policies

### Step 4: Test Signup
1. Go to: https://carib-predict.vercel.app
2. Click the Profile icon (top right)
3. Try to sign up with a new email
4. You should get 10,000 sats and be logged in!

## What This Does

The SQL script:
1. **Drops ALL existing policies** (some were partially created, causing conflicts)
2. **Creates fresh policies** including the critical INSERT policy
3. **Verifies** all policies were created correctly

The most important policy is:
```sql
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT
  WITH CHECK (auth.uid()::text = id::text OR auth.jwt()->>'role' = 'service_role');
```

This allows:
- Users to create their own record during signup (auth.uid() = id)
- API endpoints to create users (service_role)

## After Running

You should see output like:
```
| tablename    | policyname                              | cmd    |
|--------------|----------------------------------------|--------|
| users        | Users can insert own data              | INSERT |
| users        | Users can view own data                | SELECT |
| users        | Users can update own data              | UPDATE |
| users        | Service role has full access to users  | ALL    |
| positions    | ...                                    | ...    |
| transactions | ...                                    | ...    |
```

If you see 11 policies total (4 for users, 4 for positions, 3 for transactions), you're good to go!

## Troubleshooting

**If you still get the error:**
1. Check if you're using the anon key (not service role key) in the browser
2. Make sure email confirmations are disabled in Supabase Auth settings
3. Check browser console for detailed error messages

**If SQL fails:**
- The script uses `DROP POLICY IF EXISTS` so it should never fail
- If it does, share the exact error message
