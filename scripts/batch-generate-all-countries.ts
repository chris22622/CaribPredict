#!/usr/bin/env tsx
/**
 * Batch Generate Markets for ALL CARICOM Countries
 * This will generate 100+ markets and auto-approve them
 */

import { createClient } from '@supabase/supabase-js';
import { searchMultipleCountries } from '../lib/brave-search';
import { generateQuestionsForMultipleCountries } from '../lib/claude-generator';
import { CARICOM_COUNTRIES_FOR_NEWS, GeneratedQuestion } from '../lib/types';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createMarket(question: GeneratedQuestion) {
  try {
    // Create market
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .insert({
        question: question.question,
        description: question.description,
        country_filter: question.country,
        category: question.category,
        close_date: question.close_date,
        resolved: false,
        liquidity_parameter: question.liquidity_parameter,
      })
      .select()
      .single();

    if (marketError) throw marketError;

    // Create options
    const optionsToInsert = question.options.map((optionLabel) => ({
      market_id: market.id,
      label: optionLabel,
      probability: 1 / question.options.length, // Equal initial probabilities
      total_shares: 0,
    }));

    const { error: optionsError } = await supabase
      .from('market_options')
      .insert(optionsToInsert);

    if (optionsError) throw optionsError;

    return { success: true, marketId: market.id };
  } catch (error: any) {
    console.error('Error creating market:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('🌴 CARIBPREDICT - BATCH MARKET GENERATION FOR ALL COUNTRIES 🌴');
  console.log('='.repeat(80));
  console.log(`Target: Generate 100+ markets for ${CARICOM_COUNTRIES_FOR_NEWS.length} countries`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('='.repeat(80));
  console.log();

  try {
    // Step 1: Search for news from ALL countries
    console.log('📰 Step 1/4: Fetching news from all CARICOM countries...');
    console.log('-'.repeat(80));
    const newsMap = await searchMultipleCountries(CARICOM_COUNTRIES_FOR_NEWS, 7, 1500);

    let totalArticles = 0;
    for (const [country, articles] of newsMap.entries()) {
      console.log(`   ✓ ${country}: ${articles.length} articles`);
      totalArticles += articles.length;
    }
    console.log(`   📊 Total: ${totalArticles} articles\n`);

    // Step 2: Generate questions for ALL countries
    console.log('🤖 Step 2/4: Generating questions with Claude AI...');
    console.log('-'.repeat(80));
    const questionsMap = await generateQuestionsForMultipleCountries(newsMap, 2000);

    let totalQuestions = 0;
    const allQuestions: GeneratedQuestion[] = [];
    for (const [country, questions] of questionsMap.entries()) {
      console.log(`   ✓ ${country}: ${questions.length} questions`);
      totalQuestions += questions.length;
      allQuestions.push(...questions);
    }
    console.log(`   📊 Total: ${totalQuestions} questions\n`);

    // Step 3: Auto-create markets (skip approval queue)
    console.log('💾 Step 3/4: Creating markets directly in database...');
    console.log('-'.repeat(80));

    let successCount = 0;
    let errorCount = 0;

    for (const question of allQuestions) {
      const result = await createMarket(question);
      if (result.success) {
        console.log(`   ✓ Created: ${question.question.substring(0, 60)}...`);
        successCount++;
      } else {
        console.log(`   ✗ Failed: ${question.question.substring(0, 60)}... (${result.error})`);
        errorCount++;
      }

      // Small delay to avoid overwhelming DB
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log();

    // Step 4: Summary
    console.log('='.repeat(80));
    console.log('📊 GENERATION COMPLETE!');
    console.log('='.repeat(80));
    console.log(`Countries processed: ${CARICOM_COUNTRIES_FOR_NEWS.length}`);
    console.log(`News articles fetched: ${totalArticles}`);
    console.log(`Questions generated: ${totalQuestions}`);
    console.log(`Markets created: ${successCount} ✓`);
    console.log(`Errors: ${errorCount} ✗`);
    console.log('='.repeat(80));
    console.log();

    if (successCount > 0) {
      console.log('🎉 SUCCESS! Your platform now has real Caribbean markets!');
      console.log('🌐 Visit www.caribpredict.com to see them live!');
    }

    console.log();
    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
