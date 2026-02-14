/**
 * API Route: Auto-Generate Prediction Questions
 * Searches Brave for news and uses Claude to generate questions
 * POST /api/auto-generate
 * Body: { country?: string } - Optional, generates for specific country or all
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { searchCaribbeanNews, searchMultipleCountries } from '@/lib/brave-search';
import { generateQuestions, generateQuestionsForMultipleCountries } from '@/lib/claude-generator';
import { CARICOM_COUNTRIES_FOR_NEWS } from '@/lib/types';

// Use service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { country, daysBack = 7 } = body;

    // Validate country if provided
    if (country && !CARICOM_COUNTRIES_FOR_NEWS.includes(country)) {
      return NextResponse.json(
        { error: `Invalid country: ${country}` },
        { status: 400 }
      );
    }

    // Determine which countries to process
    const countriesToProcess = country ? [country] : CARICOM_COUNTRIES_FOR_NEWS;

    console.log(`Starting auto-generation for: ${countriesToProcess.join(', ')}`);

    // Step 1: Search for news articles
    console.log('Step 1: Searching for news articles...');
    const newsMap = await searchMultipleCountries(countriesToProcess, daysBack, 1500);

    // Step 2: Generate questions using Claude
    console.log('Step 2: Generating questions with Claude...');
    const questionsMap = await generateQuestionsForMultipleCountries(newsMap, 2000);

    // Step 3: Save to question_queue table
    console.log('Step 3: Saving to question queue...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const savedQuestions = [];
    const errors = [];

    for (const [countryName, questions] of questionsMap.entries()) {
      const articles = newsMap.get(countryName) || [];

      if (questions.length === 0) {
        console.log(`No questions generated for ${countryName}`);
        continue;
      }

      // Create the prompt used (reconstructed)
      const articlesText = articles
        .slice(0, 10)
        .map((article, index) => {
          return `Article ${index + 1}: ${article.title}\n${article.description}`;
        })
        .join('\n\n');

      const claudePrompt = `Generate prediction market questions for ${countryName} based on recent news...`;

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
        console.error(`Error saving questions for ${countryName}:`, error);
        errors.push({ country: countryName, error: error.message });
      } else {
        console.log(`Saved ${questions.length} questions for ${countryName}`);
        savedQuestions.push({
          country: countryName,
          questionsCount: questions.length,
          queueId: data?.[0]?.id,
        });
      }
    }

    // Calculate totals
    const totalArticles = Array.from(newsMap.values()).reduce(
      (sum, articles) => sum + articles.length,
      0
    );
    const totalQuestions = Array.from(questionsMap.values()).reduce(
      (sum, questions) => sum + questions.length,
      0
    );

    return NextResponse.json({
      success: true,
      summary: {
        countriesProcessed: countriesToProcess.length,
        totalArticlesFetched: totalArticles,
        totalQuestionsGenerated: totalQuestions,
        savedToQueue: savedQuestions.length,
      },
      details: savedQuestions,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Error in auto-generate route:', error);
    return NextResponse.json(
      {
        error: 'Failed to auto-generate questions',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check status
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get counts by status
    const { data: pending } = await supabase
      .from('question_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { data: approved } = await supabase
      .from('question_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved');

    const { data: rejected } = await supabase
      .from('question_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'rejected');

    return NextResponse.json({
      status: 'ok',
      queue: {
        pending: pending || 0,
        approved: approved || 0,
        rejected: rejected || 0,
      },
      supportedCountries: CARICOM_COUNTRIES_FOR_NEWS,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get status', message: error.message },
      { status: 500 }
    );
  }
}
