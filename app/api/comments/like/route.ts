import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { commentId, userId } = await request.json();

    if (!commentId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert like
    const { error: likeError } = await supabase
      .from('comment_likes')
      .insert({ comment_id: commentId, user_id: userId });

    if (likeError) {
      if (likeError.code === '23505') {
        return NextResponse.json({ error: 'Already liked' }, { status: 409 });
      }
      throw likeError;
    }

    // Increment likes count
    const { data: commentData } = await supabase
      .from('comments')
      .select('likes')
      .eq('id', commentId)
      .single();

    if (commentData) {
      await supabase
        .from('comments')
        .update({ likes: (commentData.likes || 0) + 1 })
        .eq('id', commentId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Like error:', error);
    return NextResponse.json({ error: error.message || 'Failed to like' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { commentId, userId } = await request.json();

    if (!commentId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    // Decrement likes count
    await supabase
      .from('comments')
      .select('likes')
      .eq('id', commentId)
      .single()
      .then(({ data }) => {
        if (data) {
          return supabase
            .from('comments')
            .update({ likes: Math.max(0, (data.likes || 0) - 1) })
            .eq('id', commentId);
        }
      });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Unlike error:', error);
    return NextResponse.json({ error: error.message || 'Failed to unlike' }, { status: 500 });
  }
}
