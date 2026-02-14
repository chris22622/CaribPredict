#!/usr/bin/env tsx
/**
 * Generate Questions Script
 * Can be run manually or via cron to generate prediction market questions
 *
 * Usage:
 *   npx tsx scripts/generate-questions.ts [country]
 *
 * Examples:
 *   npx tsx scripts/generate-questions.ts              # All countries
 *   npx tsx scripts/generate-questions.ts Jamaica      # Just Jamaica
 */

import { createClient } from '@supabase/supabase-js';
import { searchCaribbeanNews, searchMultipleCountries } from '../lib/brave-search';
import { generateQuestions, generateQuestionsForMultipleCountries } from '../lib/claude-generator';
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

async function main() {
  const args = process.argv.slice(2);
  const targetCountry = args[0];

  // Validate country if provided
  if (targetCountry && !CARICOM_COUNTRIES_FOR_NEWS.includes(targetCountry as any)) {
    console.error(`Error: Invalid country "${targetCountry}"`);
    console.log('Valid countries:', CARICOM_COUNTRIES_FOR_NEWS.join(', '));
    process.exit(1);
  }

  // Determine which countries to process
  const countriesToProcess = targetCountry ? [targetCountry] : CARICOM_COUNTRIES_FOR_NEWS;

  console.log('='.repeat(60));
  console.log('CaribPredict Question Generation Script');
  console.log('='.repeat(60));
  console.log(`Countries: ${countriesToProcess.join(', ')}`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  console.log();

  try {
    // Step 1: Search for news
    console.log('Step 1/3: Searching for news articles...');
    console.log('-'.repeat(60));
    const newsMap = await searchMultipleCountries(countriesToProcess, 7, 1500);

    let totalArticles = 0;
    for (const [country, articles] of newsMap.entries()) {
      console.log(`  ${country}: ${articles.length} articles`);
      totalArticles += articles.length;
    }
    console.log(`  Total: ${totalArticles} articles\n`);

    // Step 2: Generate questions
    console.log('Step 2/3: Generating questions with Claude AI...');
    console.log('-'.repeat(60));
    const questionsMap = await generateQuestionsForMultipleCountries(newsMap, 2000);

    let totalQuestions = 0;
    for (const [country, questions] of questionsMap.entries()) {
      console.log(`  ${country}: ${questions.length} questions`);
      totalQuestions += questions.length;
    }
    console.log(`  Total: ${totalQuestions} questions\n`);

    // Step 3: Save to database
    console.log('Step 3/3: Saving to question queue...');
    console.log('-'.repeat(60));
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let savedCount = 0;
    let errorCount = 0;

    for (const [countryName, questions] of questionsMap.entries()) {
      const articles = newsMap.get(countryName) || [];

      if (questions.length === 0) {
        console.log(`  ${countryName}: No questions to save (skipped)`);
        continue;
      }

      // Create the prompt used (reconstructed for logging)
      const articlesText = articles
        .slice(0, 10)
        .map((article, index) => {
          return `Article ${index + 1}: ${article.title}`;
        })
        .join('\n');

      const claudePrompt = `Generate prediction market questions for ${countryName} based on:\n${articlesText}`;

      // Insert into question_queue
      const { data, error } = await supabase.from('question_queue').insert({
        brave_search_query: `${countryName} news`,
        country: countryName,
        raw_news: articles,
        claude_prompt: claudePrompt,
        generated_questions: questions,
        status: 'pending',
      }).select();

      if (error) {
        console.error(`  ${countryName}: Error - ${error.message}`);
        errorCount++;
      } else {
        console.log(`  ${countryName}: Saved ${questions.length} questions (ID: ${data?.[0]?.id})`);
        savedCount++;
      }
    }

    console.log();
    console.log('='.repeat(60));
    console.log('Summary:');
    console.log('-'.repeat(60));
    console.log(`Countries processed: ${countriesToProcess.length}`);
    console.log(`Total articles fetched: ${totalArticles}`);
    console.log(`Total questions generated: ${totalQuestions}`);
    console.log(`Successfully saved: ${savedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('='.repeat(60));
    console.log();
    console.log('Next steps:');
    console.log('  1. Visit the admin panel to review questions');
    console.log('  2. Approve questions to create live markets');
    console.log('  3. Rejected questions will be filtered out');
    console.log();

    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('\nError:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
