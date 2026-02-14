const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://kkxumlpnpfqopgkjbozo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreHVtbHBucGZxb3Bna2pib3pvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxMzIyMCwiZXhwIjoyMDg2MTg5MjIwfQ.FtkLSsLgi-NmHp9WYXBWXzt7Mxa0qf-H1CARDKMB68g');

async function main() {
  // Get all markets with their options
  const { data: markets } = await s.from('markets').select('id');
  console.log(`Updating probabilities for ${markets.length} markets...`);
  
  let updated = 0;
  for (const market of markets) {
    const { data: options } = await s.from('market_options').select('*').eq('market_id', market.id);
    if (!options || options.length === 0) continue;
    
    if (options.length === 2) {
      // Binary: give realistic varied probabilities
      const yesProb = (Math.floor(Math.random() * 80) + 10) / 100; // 10% to 90%
      const noProb = 1 - yesProb;
      const yesOpt = options.find(o => o.label === 'Yes') || options[0];
      const noOpt = options.find(o => o.label === 'No') || options[1];
      
      await s.from('market_options').update({ probability: parseFloat(yesProb.toFixed(2)), total_shares: Math.floor(Math.random() * 5000) + 100 }).eq('id', yesOpt.id);
      await s.from('market_options').update({ probability: parseFloat(noProb.toFixed(2)), total_shares: Math.floor(Math.random() * 5000) + 100 }).eq('id', noOpt.id);
    } else {
      // Multi-option: distribute probabilistically
      let remaining = 1.0;
      for (let i = 0; i < options.length; i++) {
        let prob;
        if (i === options.length - 1) {
          prob = remaining;
        } else {
          prob = Math.random() * remaining * 0.7; // Leave room for others
          prob = Math.max(0.05, prob); // Minimum 5%
        }
        remaining -= prob;
        remaining = Math.max(0, remaining);
        
        await s.from('market_options').update({ 
          probability: parseFloat(prob.toFixed(3)),
          total_shares: Math.floor(Math.random() * 3000) + 50
        }).eq('id', options[i].id);
      }
    }
    updated++;
  }
  console.log(`Updated ${updated} markets with varied probabilities`);
}

main().catch(console.error);
