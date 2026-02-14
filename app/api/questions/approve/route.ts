/**
 * API Route: Approve Question
 * Creates markets and market_options from approved questions
 * POST /api/questions/approve
 * Body: { queueId: string, userId?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { GeneratedQuestion } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queueId, userId } = body;

    if (!queueId) {
      return NextResponse.json(
        { error: 'queueId is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the queue item
    const { data: queueItem, error: fetchError } = await supabase
      .from('question_queue')
      .select('*')
      .eq('id', queueId)
      .single();

    if (fetchError || !queueItem) {
      return NextResponse.json(
        { error: 'Question queue item not found' },
        { status: 404 }
      );
    }

    if (queueItem.status !== 'pending') {
      return NextResponse.json(
        { error: `Question already ${queueItem.status}` },
        { status: 400 }
      );
    }

    // Parse generated questions
    const questions: GeneratedQuestion[] = queueItem.generated_questions;

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions found in queue item' },
        { status: 400 }
      );
    }

    const createdMarkets = [];

    // Create markets and options for each question
    for (const question of questions) {
      // Create market
      const { data: market, error: marketError } = await supabase
        .from('markets')
        .insert({
          question: question.question,
          description: question.description,
          country_filter: question.country,
          category: question.category,
          close_date: question.close_date,
          liquidity_parameter: question.liquidity_parameter || 100,
          resolved: false,
        })
        .select()
        .single();

      if (marketError) {
        console.error('Error creating market:', marketError);
        continue;
      }

      // Create market options
      const optionsToInsert = question.options.map((label, index) => ({
        market_id: market.id,
        label: label,
        probability: 1 / question.options.length, // Equal probability for all options
        total_shares: 0,
      }));

      const { error: optionsError } = await supabase
        .from('market_options')
        .insert(optionsToInsert);

      if (optionsError) {
        console.error('Error creating options:', optionsError);
        // Roll back market creation
        await supabase.from('markets').delete().eq('id', market.id);
        continue;
      }

      createdMarkets.push({
        marketId: market.id,
        question: market.question,
        optionsCount: question.options.length,
      });
    }

    // Update queue item status
    const { error: updateError } = await supabase
      .from('question_queue')
      .update({
        status: 'approved',
        approved_by: userId || null,
      })
      .eq('id', queueId);

    if (updateError) {
      console.error('Error updating queue status:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: `Approved ${createdMarkets.length} questions`,
      markets: createdMarkets,
    });
  } catch (error: any) {
    console.error('Error approving question:', error);
    return NextResponse.json(
      { error: 'Failed to approve question', message: error.message },
      { status: 500 }
    );
  }
}
