#!/usr/bin/env tsx
/**
 * Import Markets from Manifold
 * Fetches trending markets from Manifold Markets and adapts them for Caribbean context
 */

import { createClient } from '@supabase/supabase-js';
import { fetchAndAdaptMarkets } from '../lib/manifold';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Validate environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} environment variable is not set`);
    process.exit(1);
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createMarketFromAdaptedQuestion(question: any) {
  try {
    // Check if we've already imported this market
    const { data: existingMarket } = await supabase
      .from('markets')
      .select('id')
      .eq('description', question.description)
      .limit(1)
      .single();

    if (existingMarket) {
      console.log(`  ⏭️  Skipped (duplicate): ${question.question.substring(0, 60)}...`);
      return { success: false, duplicate: true };
    }

    // Create the market
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .insert({
        question: question.question,
        description: question.description,
        country_filter: question.country,
        category: question.category,
        close_date: question.close_date,
        resolved: false,
        liquidity_parameter: question.liquidity_parameter || 100,
      })
      .select()
      .single();

    if (marketError) {
      console.error(`  Error creating market: ${marketError.message}`);
      return { success: false, duplicate: false };
    }

    // Create market options
    const optionsToInsert = question.options.map((optionLabel: string) => ({
      market_id: market.id,
      label: optionLabel,
      probability: 1.0 / question.options.length, // Equal initial probabilities
      total_shares: 0,
    }));

    const { error: optionsError } = await supabase
      .from('market_options')
      .insert(optionsToInsert);

    if (optionsError) {
      console.error(`  Error creating options: ${optionsError.message}`);
      // Rollback market creation
      await supabase.from('markets').delete().eq('id', market.id);
      return { success: false, duplicate: false };
    }

    console.log(`  ✓ Created: ${question.question.substring(0, 70)}... [${question.category}]`);
    return { success: true, duplicate: false };
  } catch (error: any) {
    console.error(`  Error: ${error.message}`);
    return { success: false, duplicate: false };
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('CaribPredict: Import Markets from Manifold');
  console.log('='.repeat(80));
  console.log(`Start time: ${new Date().toISOString()}`);
  console.log('='.repeat(80));
  console.log();

  try {
    // Step 1: Fetch and adapt markets from Manifold
    console.log('🌐 STEP 1/2: Fetching trending markets from Manifold...');
    console.log('-'.repeat(80));

    const adaptedMarkets = await fetchAndAdaptMarkets(100);

    console.log(`\n  Total adapted markets: ${adaptedMarkets.length}\n`);

    // Show category breakdown
    const categoryCounts = adaptedMarkets.reduce((acc, market) => {
      acc[market.category] = (acc[market.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📊 Category Breakdown:');
    Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`  ${category.padEnd(20)} ${count} markets`);
      });
    console.log();

    // Step 2: Create markets in database
    console.log('💰 STEP 2/2: Creating markets in database...');
    console.log('-'.repeat(80));

    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    for (const market of adaptedMarkets) {
      const result = await createMarketFromAdaptedQuestion(market);
      if (result.success) {
        successCount++;
      } else if (result.duplicate) {
        duplicateCount++;
      } else {
        errorCount++;
      }
    }

    console.log();
    console.log('='.repeat(80));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(80));
    console.log(`Markets fetched from Manifold:  ${adaptedMarkets.length}`);
    console.log(`Markets created:                ${successCount}`);
    console.log(`Duplicates skipped:             ${duplicateCount}`);
    console.log(`Errors:                         ${errorCount}`);
    console.log('='.repeat(80));
    console.log();
    console.log('✨ Done! Visit caribpredict.com to see your new markets.');
    console.log();

    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
