#!/usr/bin/env tsx
/**
 * Batch Generate and Auto-Approve Script
 * Generates questions for all CARICOM countries and automatically creates markets
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
      return false;
    }

    console.log(`  ✓ Created market: ${question.question.substring(0, 60)}...`);
    return true;
  } catch (error: any) {
    console.error(`  Error creating market: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('CaribPredict: Batch Question Generation & Auto-Approval');
  console.log('='.repeat(80));
  console.log(`Start time: ${new Date().toISOString()}`);
  console.log(`Processing: ${CARICOM_COUNTRIES_FOR_NEWS.length} CARICOM countries`);
  console.log('='.repeat(80));
  console.log();

  try {
    // Step 1: Search for news
    console.log('📰 STEP 1/3: Searching for news articles...');
    console.log('-'.repeat(80));
    const newsMap = await searchMultipleCountries(CARICOM_COUNTRIES_FOR_NEWS, 7, 1500);

    let totalArticles = 0;
    for (const [country, articles] of newsMap.entries()) {
      console.log(`  ${country.padEnd(35)} ${articles.length} articles`);
      totalArticles += articles.length;
    }
    console.log(`\n  Total articles fetched: ${totalArticles}\n`);

    // Step 2: Generate questions
    console.log('🤖 STEP 2/3: Generating questions with Claude AI...');
    console.log('-'.repeat(80));
    const questionsMap = await generateQuestionsForMultipleCountries(newsMap, 2000);

    let totalQuestions = 0;
    for (const [country, questions] of questionsMap.entries()) {
      console.log(`  ${country.padEnd(35)} ${questions.length} questions`);
      totalQuestions += questions.length;
    }
    console.log(`\n  Total questions generated: ${totalQuestions}\n`);

    // Step 3: Create markets directly
    console.log('💰 STEP 3/3: Creating markets automatically...');
    console.log('-'.repeat(80));

    let successCount = 0;
    let errorCount = 0;

    for (const [countryName, questions] of questionsMap.entries()) {
      if (questions.length === 0) {
        console.log(`${countryName}: No questions to create (skipped)`);
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
