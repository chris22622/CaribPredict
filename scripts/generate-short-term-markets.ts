#!/usr/bin/env tsx
/**
 * Generate SHORT-TERM Markets (1-7 days)
 * Enhanced batch generator focused on immediate, buzzy events
 */

import { createClient } from '@supabase/supabase-js';
import { searchMultipleCountries } from '../lib/brave-search';
import { generateQuestionsForMultipleCountries } from '../lib/claude-generator';
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

async function createMarketFromQuestion(question: any, countryName: string) {
  try {
    // Create the market
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
      console.error(`  Error creating market: ${marketError.message}`);
      return false;
    }

    // Create market options
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
      console.error(`  Error creating options: ${optionsError.message}`);
      await supabase.from('markets').delete().eq('id', market.id);
      return false;
    }

    console.log(`  ✓ ${question.question.substring(0, 70)}... [${question.close_date}]`);
    return true;
  } catch (error: any) {
    console.error(`  Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('CaribPredict: Generate SHORT-TERM Markets (1-7 Days)');
  console.log('='.repeat(80));
  console.log(`Start time: ${new Date().toISOString()}`);
  console.log(`Target: 150+ markets resolving within 1 week`);
  console.log(`Processing: ${CARICOM_COUNTRIES_FOR_NEWS.length} countries`);
  console.log('='.repeat(80));
  console.log();

  try {
    // Step 1: Search for RECENT news only
    console.log('📰 STEP 1/3: Searching for recent news (past 2 days)...');
    console.log('-'.repeat(80));
    const newsMap = await searchMultipleCountries(
      CARICOM_COUNTRIES_FOR_NEWS,
      2, // Only past 2 days for immediate events
      1500
    );

    let totalArticles = 0;
    for (const [country, articles] of newsMap.entries()) {
      console.log(`  ${country.padEnd(35)} ${articles.length} articles`);
      totalArticles += articles.length;
    }
    console.log(`\n  Total recent articles: ${totalArticles}\n`);

    // Step 2: Generate SHORT-TERM questions
    console.log('🤖 STEP 2/3: Generating SHORT-TERM questions (1-7 days only)...');
    console.log('-'.repeat(80));
    const questionsMap = await generateQuestionsForMultipleCountries(newsMap, 2000);

    let totalQuestions = 0;
    const categoryStats: Record<string, number> = {};

    for (const [country, questions] of questionsMap.entries()) {
      console.log(`  ${country.padEnd(35)} ${questions.length} questions`);
      totalQuestions += questions.length;

      // Track categories
      questions.forEach(q => {
        categoryStats[q.category] = (categoryStats[q.category] || 0) + 1;
      });
    }

    console.log(`\n  Total questions generated: ${totalQuestions}`);
    console.log('\n  📊 Category Breakdown:');
    Object.entries(categoryStats)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`     ${category.padEnd(20)} ${count}`);
      });
    console.log();

    // Step 3: Create markets
    console.log('💰 STEP 3/3: Creating markets...');
    console.log('-'.repeat(80));

    let successCount = 0;
    let errorCount = 0;

    for (const [countryName, questions] of questionsMap.entries()) {
      if (questions.length === 0) {
        console.log(`${countryName}: No questions (skipped)`);
        continue;
      }

      console.log(`\n${countryName} (${questions.length} questions):`);

      for (const question of questions) {
        const success = await createMarketFromQuestion(question, countryName);
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
      }
    }

    console.log();
    console.log('='.repeat(80));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(80));
    console.log(`Countries processed:        ${CARICOM_COUNTRIES_FOR_NEWS.length}`);
    console.log(`News articles fetched:      ${totalArticles}`);
    console.log(`Questions generated:        ${totalQuestions}`);
    console.log(`Markets created:            ${successCount}`);
    console.log(`Errors:                     ${errorCount}`);
    console.log('='.repeat(80));

    if (successCount < 150) {
      console.log();
      console.log(`⚠️  WARNING: Only ${successCount} markets created (target was 150+)`);
      console.log('   Consider running this script again or using import-from-manifold.ts');
    }

    console.log();
    console.log('✨ Done! Visit caribpredict.com to see your new short-term markets.');
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
