import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function approveAll() {
  // Get all pending queue items
  const { data: pending, error } = await supabase
    .from('question_queue')
    .select('*')
    .eq('status', 'pending');

  if (error) { console.error('Error:', error.message); return; }
  console.log(`Found ${pending?.length || 0} pending queue items`);

  let created = 0;
  for (const item of (pending || [])) {
    try {
      // Each queue item has questions array
      const questions = item.questions || [];
      for (const q of questions) {
        // Check duplicate
        const { data: existing } = await supabase
          .from('markets')
          .select('id')
          .eq('question', q.question)
          .single();

        if (existing) {
          console.log(`  Skip duplicate: ${q.question.substring(0, 60)}...`);
          continue;
        }

        // Create market
        const { data: market, error: mErr } = await supabase
          .from('markets')
          .insert({
            question: q.question,
            description: q.description || '',
            country_filter: item.country || q.country || 'All CARICOM',
            category: q.category || 'Politics',
            close_date: q.close_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            resolved: false,
            liquidity_parameter: q.liquidity_parameter || 100,
          })
          .select()
          .single();

        if (mErr) { console.error(`  Error creating: ${mErr.message}`); continue; }

        // Create options
        const options = q.options || ['Yes', 'No'];
        const prob = 1.0 / options.length;
        const { error: oErr } = await supabase
          .from('market_options')
          .insert(options.map((label: string) => ({
            market_id: market.id,
            label,
            total_shares: 0,
            probability: prob,
          })));

        if (oErr) { console.error(`  Error creating options: ${oErr.message}`); continue; }
        created++;
        console.log(`  ✅ ${q.question.substring(0, 70)}...`);
      }

      // Mark queue item as approved
      await supabase
        .from('question_queue')
        .update({ status: 'approved' })
        .eq('id', item.id);
    } catch (e: any) {
      console.error(`  Error: ${e.message}`);
    }
  }

  const { count } = await supabase.from('markets').select('*', { count: 'exact', head: true });
  console.log(`\n✅ Created ${created} new markets. Total: ${count}`);
}

approveAll();
