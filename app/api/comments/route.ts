import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { marketId, userId, content, parentId } = await request.json();

    if (!marketId || !userId || !content?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (content.trim().length > 2000) {
      return NextResponse.json({ error: 'Comment too long (max 2000 chars)' }, { status: 400 });
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify market exists
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .select('id')
      .eq('id', marketId)
      .single();

    if (marketError || !market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    }

    // If replying, verify parent comment exists
    if (parentId) {
      const { data: parentComment, error: parentError } = await supabase
        .from('comments')
        .select('id')
        .eq('id', parentId)
        .eq('market_id', marketId)
        .single();

      if (parentError || !parentComment) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
      }
    }

    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert({
        market_id: marketId,
        user_id: userId,
        parent_id: parentId || null,
        content: content.trim(),
      })
      .select('*')
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, comment });
  } catch (error: any) {
    console.error('Comment error:', error);
    return NextResponse.json({ error: error.message || 'Failed to post comment' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { commentId, userId } = await request.json();

    if (!commentId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify ownership
    const { data: comment, error: findError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .eq('user_id', userId)
      .single();

    if (findError || !comment) {
      return NextResponse.json({ error: 'Comment not found or not authorized' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete comment error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete comment' }, { status: 500 });
  }
}
