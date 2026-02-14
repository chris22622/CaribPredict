#!/usr/bin/env tsx
/**
 * Check Auto-Generation System Status
 * Quick utility to check the question queue and system health
 *
 * Usage:
 *   npx tsx scripts/check-status.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  console.log('═'.repeat(60));
  console.log('CaribPredict Auto-Generation System Status');
  console.log('═'.repeat(60));
  console.log(`Checked at: ${new Date().toISOString()}\n`);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check environment variables
    console.log('Environment Variables:');
    console.log('─'.repeat(60));
    console.log(`✓ BRAVE_API_KEY: ${process.env.BRAVE_API_KEY ? 'Set' : '❌ MISSING'}`);
    console.log(`✓ CLAUDE_API_KEY: ${process.env.CLAUDE_API_KEY ? 'Set' : '❌ MISSING'}`);
    console.log(`✓ SUPABASE_URL: ${supabaseUrl ? 'Set' : '❌ MISSING'}`);
    console.log(`✓ SERVICE_KEY: ${supabaseServiceKey ? 'Set' : '❌ MISSING'}`);
    console.log();

    // Check question queue status
    console.log('Question Queue:');
    console.log('─'.repeat(60));

    const { data: pending, count: pendingCount } = await supabase
      .from('question_queue')
      .select('*', { count: 'exact' })
      .eq('status', 'pending');

    const { data: approved, count: approvedCount } = await supabase
      .from('question_queue')
      .select('*', { count: 'exact' })
      .eq('status', 'approved');

    const { data: rejected, count: rejectedCount } = await supabase
      .from('question_queue')
      .select('*', { count: 'exact' })
      .eq('status', 'rejected');

    console.log(`Pending:  ${pendingCount || 0} queue items`);
    console.log(`Approved: ${approvedCount || 0} queue items`);
    console.log(`Rejected: ${rejectedCount || 0} queue items`);
    console.log(`Total:    ${(pendingCount || 0) + (approvedCount || 0) + (rejectedCount || 0)} queue items`);
    console.log();

    // Show pending questions by country
    if (pending && pending.length > 0) {
      console.log('Pending Questions by Country:');
      console.log('─'.repeat(60));

      const countryMap = new Map<string, number>();
      for (const item of pending) {
        const count = countryMap.get(item.country) || 0;
        const questions = item.generated_questions?.length || 0;
        countryMap.set(item.country, count + questions);
      }

      for (const [country, count] of countryMap.entries()) {
        console.log(`  ${country.padEnd(30)} ${count} questions`);
      }
      console.log();
    }

    // Recent generations
    console.log('Recent Generations (Last 5):');
    console.log('─'.repeat(60));

    const { data: recent } = await supabase
      .from('question_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recent && recent.length > 0) {
      for (const item of recent) {
        const questionCount = item.generated_questions?.length || 0;
        const status = item.status?.toUpperCase().padEnd(8);
        const date = new Date(item.created_at).toLocaleDateString();
        console.log(`  ${status} ${item.country.padEnd(25)} ${questionCount} questions  (${date})`);
      }
    } else {
      console.log('  No generations yet');
    }
    console.log();

    // Check markets
    console.log('Markets:');
    console.log('─'.repeat(60));

    const { count: totalMarkets } = await supabase
      .from('markets')
      .select('id', { count: 'exact', head: true });

    const { count: unresolvedMarkets } = await supabase
      .from('markets')
      .select('id', { count: 'exact', head: true })
      .eq('resolved', false);

    const { count: resolvedMarkets } = await supabase
      .from('markets')
      .select('id', { count: 'exact', head: true })
      .eq('resolved', true);

    console.log(`Total:      ${totalMarkets || 0} markets`);
    console.log(`Active:     ${unresolvedMarkets || 0} markets`);
    console.log(`Resolved:   ${resolvedMarkets || 0} markets`);
    console.log();

    // System health
    console.log('System Health:');
    console.log('─'.repeat(60));

    const health = {
      env_vars: process.env.BRAVE_API_KEY && process.env.CLAUDE_API_KEY,
      database: true,
      pending_queue: (pendingCount || 0) > 0,
    };

    console.log(`Environment:     ${health.env_vars ? '✓ OK' : '❌ MISSING KEYS'}`);
    console.log(`Database:        ${health.database ? '✓ Connected' : '❌ Error'}`);
    console.log(`Pending Queue:   ${health.pending_queue ? `✓ ${pendingCount} items` : '○ Empty'}`);
    console.log();

    // Recommendations
    console.log('Recommendations:');
    console.log('─'.repeat(60));

    if (pendingCount && pendingCount > 0) {
      console.log(`  → Review ${pendingCount} pending questions at /admin/questions`);
    }

    if (!pendingCount || pendingCount === 0) {
      console.log('  → Run generation: npm run generate-questions');
    }

    if (unresolvedMarkets && unresolvedMarkets > 10) {
      console.log(`  ✓ Good! ${unresolvedMarkets} active markets for users to trade`);
    }

    if (!unresolvedMarkets || unresolvedMarkets < 5) {
      console.log('  → Consider generating more questions to create markets');
    }

    console.log();
    console.log('═'.repeat(60));
    console.log('Status check complete!');
    console.log('═'.repeat(60));
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
