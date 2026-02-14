#!/usr/bin/env tsx
/**
 * MEGA GENERATOR: 150+ Short-Term Markets
 * Combines Claude generation + Manifold import to hit 150+ market target
 */

import { createClient } from '@supabase/supabase-js';
import { searchMultipleCountries } from '../lib/brave-search';
import { generateQuestionsForMultipleCountries } from '../lib/claude-generator';
import { fetchAndAdaptMarkets } from '../lib/manifold';
import { CARICOM_COUNTRIES_FOR_NEWS } from '../lib/types';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Validate environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BRAVE_API_KEY',
  'CLAUDE_API_KEY',
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

async function createMarket(question: any, countryName: string, source: string = 'claude') {
  try {
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .insert({
        question: question.question,
        description: question.description,
        country_filter: countryName,
        category: question.category,
        close_date: question.close_date,
        resolved: false,
        liquidity_parameter: question.liquidity_parameter || 100,
      })
      .select()
      .single();

    if (marketError) {
      console.error(`  ❌ Error: ${marketError.message}`);
      return false;
    }

    const optionsToInsert = question.options.map((optionLabel: string) => ({
      market_id: market.id,
      label: optionLabel,
      probability: 1.0 / question.options.length,
      total_shares: 0,
    }));

    const { error: optionsError } = await supabase
      .from('market_options')
      .insert(optionsToInsert);

    if (optionsError) {
      console.error(`  ❌ Options error: ${optionsError.message}`);
      await supabase.from('markets').delete().eq('id', market.id);
      return false;
    }

    const emoji = source === 'manifold' ? '🌐' : '🤖';
    console.log(`  ${emoji} ${question.question.substring(0, 65)}... [${question.category}]`);
    return true;
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('🚀 MEGA GENERATOR: 150+ Short-Term Markets (1-7 Days)');
  console.log('='.repeat(80));
  console.log(`Start time: ${new Date().toISOString()}`);
  console.log(`Target: 150+ markets`);
  console.log(`Strategy: Claude AI generation + Manifold Markets import`);
  console.log('='.repeat(80));
  console.log();

  let totalCreated = 0;
  let totalErrors = 0;

  try {
    // ========================================================================
    // PHASE 1: CLAUDE AI GENERATION (Caribbean-specific news)
    // ========================================================================
    console.log('🤖 PHASE 1: Claude AI Generation (Caribbean News)');
    console.log('='.repeat(80));

    console.log('📰 Searching for recent Caribbean news (past 2 days)...');
    const newsMap = await searchMultipleCountries(CARICOM_COUNTRIES_FOR_NEWS, 2, 1500);

    let totalArticles = 0;
    for (const [country, articles] of newsMap.entries()) {
      totalArticles += articles.length;
    }
    console.log(`  ✓ Found ${totalArticles} recent articles\n`);

    console.log('🔥 Generating buzzy short-term questions...');
    const questionsMap = await generateQuestionsForMultipleCountries(newsMap, 2000);

    let claudeQuestions = 0;
    for (const [country, questions] of questionsMap.entries()) {
      claudeQuestions += questions.length;
    }
    console.log(`  ✓ Generated ${claudeQuestions} questions\n`);

    console.log('💰 Creating markets from Claude questions...');
    let claudeSuccess = 0;
    let claudeErrors = 0;

    for (const [countryName, questions] of questionsMap.entries()) {
      if (questions.length === 0) continue;

      console.log(`\n  ${countryName}:`);
      for (const question of questions) {
        const success = await createMarket(question, countryName, 'claude');
        if (success) {
          claudeSuccess++;
        } else {
          claudeErrors++;
        }
      }
    }

    totalCreated += claudeSuccess;
    totalErrors += claudeErrors;

    console.log();
    console.log(`  Claude AI: ${claudeSuccess} markets created, ${claudeErrors} errors`);
    console.log();

    // ========================================================================
    // PHASE 2: MANIFOLD MARKETS IMPORT (Global trending markets)
    // ========================================================================
    console.log('🌐 PHASE 2: Manifold Markets Import (Global Trending)');
    console.log('='.repeat(80));

    console.log('📊 Fetching trending markets from Manifold...');
    const adaptedMarkets = await fetchAndAdaptMarkets(100);
    console.log(`  ✓ Fetched and adapted ${adaptedMarkets.length} markets\n`);

    console.log('💰 Creating markets from Manifold...');
    let manifoldSuccess = 0;
    let manifoldErrors = 0;
    let manifoldDuplicates = 0;

    for (const market of adaptedMarkets) {
      // Check for duplicates
      const { data: existing } = await supabase
        .from('markets')
        .select('id')
        .eq('question', market.question)
        .limit(1)
        .single();

      if (existing) {
        manifoldDuplicates++;
        continue;
      }

      const success = await createMarket(market, market.country, 'manifold');
      if (success) {
        manifoldSuccess++;
      } else {
        manifoldErrors++;
      }
    }

    totalCreated += manifoldSuccess;
    totalErrors += manifoldErrors;

    console.log();
    console.log(`  Manifold: ${manifoldSuccess} markets created, ${manifoldDuplicates} duplicates, ${manifoldErrors} errors`);
    console.log();

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    console.log('='.repeat(80));
    console.log('📊 FINAL RESULTS');
    console.log('='.repeat(80));
    console.log();
    console.log('  Phase 1 (Claude AI):');
    console.log(`    News articles:           ${totalArticles}`);
    console.log(`    Questions generated:     ${claudeQuestions}`);
    console.log(`    Markets created:         ${claudeSuccess}`);
    console.log();
    console.log('  Phase 2 (Manifold):');
    console.log(`    Markets fetched:         ${adaptedMarkets.length}`);
    console.log(`    Markets created:         ${manifoldSuccess}`);
    console.log(`    Duplicates skipped:      ${manifoldDuplicates}`);
    console.log();
    console.log('  TOTAL:');
    console.log(`    Markets created:         ${totalCreated}`);
    console.log(`    Errors:                  ${totalErrors}`);
    console.log();
    console.log('='.repeat(80));

    if (totalCreated >= 150) {
      console.log('✅ SUCCESS! Target of 150+ markets achieved!');
    } else {
      console.log(`⚠️  WARNING: Only ${totalCreated} markets created (target: 150+)`);
      console.log('   Consider running again or adjusting parameters.');
    }

    console.log();
    console.log('✨ Done! Visit caribpredict.com to see your markets.');
    console.log();

    process.exit(totalErrors > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
