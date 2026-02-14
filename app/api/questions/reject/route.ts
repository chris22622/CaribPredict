/**
 * API Route: Reject Question
 * Marks question queue item as rejected
 * POST /api/questions/reject
 * Body: { queueId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queueId } = body;

    if (!queueId) {
      return NextResponse.json(
        { error: 'queueId is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update queue item status
    const { data, error } = await supabase
      .from('question_queue')
      .update({ status: 'rejected' })
      .eq('id', queueId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to reject question', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Question rejected successfully',
      queueId: data.id,
    });
  } catch (error: any) {
    console.error('Error rejecting question:', error);
    return NextResponse.json(
      { error: 'Failed to reject question', message: error.message },
      { status: 500 }
    );
  }
}
