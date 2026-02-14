const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://kkxumlpnpfqopgkjbozo.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreHVtbHBucGZxb3Bna2pib3pvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxMzIyMCwiZXhwIjoyMDg2MTg5MjIwfQ.FtkLSsLgi-NmHp9WYXBWXzt7Mxa0qf-H1CARDKMB68g';

const supabase = createClient(supabaseUrl, serviceKey);

async function runSQLFix() {
  try {
    console.log('Dropping existing policies...\n');

    // Drop all policies
    const dropPolicies = [
      'DROP POLICY IF EXISTS "Service role has full access to users" ON users',
      'DROP POLICY IF EXISTS "Users can view own data" ON users',
      'DROP POLICY IF EXISTS "Users can update own data" ON users',
      'DROP POLICY IF EXISTS "Users can insert own data" ON users',
      'DROP POLICY IF EXISTS "Service role has full access to positions" ON positions',
      'DROP POLICY IF EXISTS "Users can view own positions" ON positions',
      'DROP POLICY IF EXISTS "Users can create positions" ON positions',
      'DROP POLICY IF EXISTS "Users can update own positions" ON positions',
      'DROP POLICY IF EXISTS "Service role has full access to transactions" ON transactions',
      'DROP POLICY IF EXISTS "Users can view own transactions" ON transactions',
      'DROP POLICY IF EXISTS "Users can create transactions" ON transactions'
    ];

    for (const sql of dropPolicies) {
      const { error } = await supabase.rpc('exec', { sql });
      if (error) console.log('Drop error (ok if doesnt exist):', error.message);
    }

    console.log('Creating new policies...\n');

    // Create new policies
    const createPolicies = [
      // Users table
      `CREATE POLICY "Service role has full access to users" ON users FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role')`,
      `CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid()::text = id::text OR auth.jwt()->>'role' = 'service_role')`,
      `CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::text = id::text OR auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.uid()::text = id::text OR auth.jwt()->>'role' = 'service_role')`,
      `CREATE POLICY "Users can insert own data" ON users FOR INSERT WITH CHECK (auth.uid()::text = id::text OR auth.jwt()->>'role' = 'service_role')`,
      // Positions table
      `CREATE POLICY "Service role has full access to positions" ON positions FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role')`,
      `CREATE POLICY "Users can view own positions" ON positions FOR SELECT USING (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role')`,
      `CREATE POLICY "Users can create positions" ON positions FOR INSERT WITH CHECK (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role')`,
      `CREATE POLICY "Users can update own positions" ON positions FOR UPDATE USING (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role')`,
      // Transactions table
      `CREATE POLICY "Service role has full access to transactions" ON transactions FOR ALL USING (auth.jwt()->>'role' = 'service_role') WITH CHECK (auth.jwt()->>'role' = 'service_role')`,
      `CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role')`,
      `CREATE POLICY "Users can create transactions" ON transactions FOR INSERT WITH CHECK (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'service_role')`
    ];

    for (const sql of createPolicies) {
      const { error } = await supabase.rpc('exec', { sql });
      if (error) {
        console.log('✗ Failed:', sql.substring(0, 60) + '...');
        console.log('  Error:', error.message);
      } else {
        console.log('✓ Created:', sql.substring(0, 60) + '...');
      }
    }

    console.log('\nVerifying policies...\n');

    // Verify
    const { data, error } = await supabase
      .from('pg_policies')
      .select('tablename, policyname, cmd')
      .in('tablename', ['users', 'positions', 'transactions'])
      .order('tablename')
      .order('cmd')
      .order('policyname');

    if (error) {
      console.log('Verification error:', error.message);
    } else {
      console.log('Policies created:');
      console.table(data);
    }

  } catch (error) {
    console.error('Fatal error:', error);
  }
}

runSQLFix();
