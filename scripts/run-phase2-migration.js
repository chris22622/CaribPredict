// Apply the Phase 2 USDT schema migration to Supabase using the service role.
// Splits the SQL file into statements and runs them one at a time via
// supabase-js's pg-meta query endpoint. Logs each statement's result.

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://kkxumlpnpfqopgkjbozo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreHVtbHBucGZxb3Bna2pib3pvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxMzIyMCwiZXhwIjoyMDg2MTg5MjIwfQ.FtkLSsLgi-NmHp9WYXBWXzt7Mxa0qf-H1CARDKMB68g';

const SQL_FILE = path.join(__dirname, '..', 'supabase', 'phase2-usdt-migration.sql');

function splitStatements(sql) {
  // Strip line comments and split on semicolons at end of line. Naive but
  // works for this migration which uses no $$ blocks.
  const stripped = sql
    .split('\n')
    .filter(l => !/^\s*--/.test(l))
    .join('\n');
  return stripped
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function runSqlViaPgMeta(sql) {
  // Supabase exposes a pg-meta REST endpoint at /pg-meta/query that accepts
  // arbitrary SQL with service role auth. This works on managed Supabase
  // projects without needing a Postgres connection.
  const url = `${SUPABASE_URL}/pg/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

// Fallback: use supabase-js with RPC if pg-meta isn't reachable.
// The user's existing run-sql-fix.js uses rpc('exec', { sql }).
async function runSqlViaRpc(sql) {
  const { createClient } = require('@supabase/supabase-js');
  const supa = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data, error } = await supa.rpc('exec', { sql });
  return { data, error };
}

(async () => {
  if (!fs.existsSync(SQL_FILE)) {
    console.error('Migration file not found:', SQL_FILE);
    process.exit(1);
  }
  const sql = fs.readFileSync(SQL_FILE, 'utf8');
  const stmts = splitStatements(sql);
  console.log(`Running ${stmts.length} statements from ${path.basename(SQL_FILE)}`);

  let successes = 0;
  let failures = 0;
  let unreachable = false;

  for (let i = 0; i < stmts.length; i++) {
    const stmt = stmts[i];
    const preview = stmt.replace(/\s+/g, ' ').slice(0, 80);
    process.stdout.write(`[${i + 1}/${stmts.length}] ${preview}... `);

    let ok = false;
    try {
      const r = await runSqlViaPgMeta(stmt);
      if (r.status >= 200 && r.status < 300) {
        ok = true;
      } else if (r.status === 404) {
        unreachable = true;
        console.log(`pg-meta endpoint 404`);
        break;
      } else {
        console.log(`HTTP ${r.status}: ${r.body.slice(0, 200)}`);
      }
    } catch (e) {
      console.log(`network error: ${e.message}`);
    }

    if (ok) {
      console.log('ok');
      successes++;
    } else {
      failures++;
    }
  }

  if (unreachable) {
    console.log('\npg-meta not available. Falling back to RPC exec_sql...');
    // Try as one big batch
    const big = stmts.join(';\n') + ';';
    const r = await runSqlViaRpc(big);
    if (r.error) {
      console.error('RPC failed:', r.error.message);
      console.error('\nNo automated path worked. Please paste supabase/phase2-usdt-migration.sql into the Supabase SQL Editor manually:\nhttps://supabase.com/dashboard/project/kkxumlpnpfqopgkjbozo/sql');
      process.exit(2);
    }
    console.log('RPC batch ok.');
    successes = stmts.length;
    failures = 0;
  }

  console.log(`\nDone. ${successes} ok, ${failures} failed.`);
  if (failures > 0) process.exit(1);

  // Sanity check: confirm one of the new tables exists.
  const probe = await fetch(`${SUPABASE_URL}/rest/v1/deposit_intents?select=id&limit=1`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  console.log(`Probe /rest/v1/deposit_intents -> HTTP ${probe.status}`);
})();
