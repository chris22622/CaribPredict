import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function fix() {
  const { data: allMarkets } = await supabase.from('markets').select('id, question');
  const { data: allOptions } = await supabase.from('market_options').select('market_id');

  const marketIdsWithOptions = new Set((allOptions || []).map(o => o.market_id));
  const marketsWithoutOptions = (allMarkets || []).filter(m => !marketIdsWithOptions.has(m.id));

  console.log(`Markets without options: ${marketsWithoutOptions.length}`);

  let fixed = 0;
  for (const market of marketsWithoutOptions) {
    const { error } = await supabase.from('market_options').insert([
      { market_id: market.id, label: 'Yes', total_shares: 0, probability: 0.5 },
      { market_id: market.id, label: 'No', total_shares: 0, probability: 0.5 },
    ]);
    if (error) {
      console.error(`Error for ${market.id}: ${error.message}`);
    } else {
      fixed++;
    }
  }
  console.log(`Fixed ${fixed} markets with Yes/No options`);

  const { count } = await supabase.from('markets').select('*', { count: 'exact', head: true });
  console.log(`Total markets: ${count}`);
}
fix().catch(console.error);
