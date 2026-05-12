const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreHVtbHBucGZxb3Bna2pib3pvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxMzIyMCwiZXhwIjoyMDg2MTg5MjIwfQ.FtkLSsLgi-NmHp9WYXBWXzt7Mxa0qf-H1CARDKMB68g';
const URL = 'https://kkxumlpnpfqopgkjbozo.supabase.co/rest/v1';
const tables = ['deposit_intents', 'deposits', 'withdrawals', 'cron_runs'];

(async () => {
  for (const t of tables) {
    try {
      const r = await fetch(`${URL}/${t}?select=*&limit=1`, {
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      });
      console.log(`${t.padEnd(20)} -> HTTP ${r.status} ${r.ok ? 'OK' : '(error)'}`);
      if (!r.ok) console.log('  body:', (await r.text()).slice(0, 200));
    } catch (e) {
      console.log(`${t} -> threw: ${e.message}`);
    }
  }
  try {
    const u = await fetch(`${URL}/users?select=balance_cents,wagering_required_cents,wagering_completed_cents&limit=1`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    });
    console.log(`users columns probe -> HTTP ${u.status} ${u.ok ? 'OK' : '(error)'}`);
    if (!u.ok) console.log('  body:', (await u.text()).slice(0, 200));
  } catch (e) {
    console.log(`users probe threw: ${e.message}`);
  }
})();
