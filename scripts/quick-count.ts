import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function check() {
  const { count: total } = await supabase.from('markets').select('*', { count: 'exact', head: true });
  const { count: active } = await supabase.from('markets').select('*', { count: 'exact', head: true }).eq('resolved', false);
  const { data: recent } = await supabase.from('markets').select('question, country_filter, category, created_at').order('created_at', { ascending: false }).limit(20);

  console.log(`Total: ${total} | Active: ${active}`);
  console.log('\nNewest 20 markets:');
  recent?.forEach((m, i) => {
    const date = new Date(m.created_at).toLocaleString();
    console.log(`${i+1}. [${m.category}] ${m.country_filter}: ${m.question.substring(0, 80)}... (${date})`);
  });

  // Count by category
  const { data: cats } = await supabase.from('markets').select('category').eq('resolved', false);
  const catCounts: Record<string, number> = {};
  cats?.forEach(m => { catCounts[m.category] = (catCounts[m.category] || 0) + 1; });
  console.log('\nBy category:');
  Object.entries(catCounts).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

  // Count by country
  const { data: countries } = await supabase.from('markets').select('country_filter').eq('resolved', false);
  const countryCounts: Record<string, number> = {};
  countries?.forEach(m => { countryCounts[m.country_filter] = (countryCounts[m.country_filter] || 0) + 1; });
  console.log('\nBy country:');
  Object.entries(countryCounts).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));
}
check();
