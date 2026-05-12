const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreHVtbHBucGZxb3Bna2pib3pvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxMzIyMCwiZXhwIjoyMDg2MTg5MjIwfQ.FtkLSsLgi-NmHp9WYXBWXzt7Mxa0qf-H1CARDKMB68g';
const URL = 'https://kkxumlpnpfqopgkjbozo.supabase.co/rest/v1';
const tables = ['referral_earnings', 'bonus_grants'];
(async () => {
  for (const t of tables) {
    const r = await fetch(`${URL}/${t}?select=*&limit=1`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    console.log(`${t.padEnd(20)} -> HTTP ${r.status} ${r.ok ? 'OK' : '(error)'}`);
  }
  const cols = await fetch(`${URL}/users?select=referral_code,referred_by_user_id,bonus_balance_cents,bonus_wagering_required_cents,bonus_wagering_completed_cents,welcome_bonus_credited&limit=1`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  console.log(`users cols probe -> HTTP ${cols.status} ${cols.ok ? 'OK' : '(error)'}`);
})();
