'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Comment } from '@/lib/types';
import { MessageCircle, ThumbsUp, Reply, Send, CornerDownRight, Trash2 } from 'lucide-react';
import { useAuth } from '@/app/layout-client';
import { toast } from 'sonner';

interface CommentsProps {
  marketId: string;
}

export default function Comments({ marketId }: CommentsProps) {
  const { user, openAuth } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  const loadComments = useCallback(async () => {
    try {
      // Load top-level comments
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('*')
        .eq('market_id', marketId)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (commentsData && commentsData.length > 0) {
        // Load user info for all comments
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .in('id', userIds);

        const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);

        // Load replies
        const commentIds = commentsData.map(c => c.id);
        const { data: repliesData } = await supabase
          .from('comments')
          .select('*')
          .in('parent_id', commentIds)
          .order('created_at', { ascending: true });

        // Load reply user info
        if (repliesData && repliesData.length > 0) {
          const replyUserIds = [...new Set(repliesData.map(r => r.user_id))];
          const missingUserIds = replyUserIds.filter(id => !usersMap.has(id));
          if (missingUserIds.length > 0) {
            const { data: moreUsers } = await supabase
              .from('users')
              .select('*')
              .in('id', missingUserIds);
            moreUsers?.forEach(u => usersMap.set(u.id, u));
          }
        }

        // Load user likes
        if (user) {
          const allCommentIds = [...commentIds, ...(repliesData?.map(r => r.id) || [])];
          const { data: likesData } = await supabase
            .from('comment_likes')
            .select('comment_id')
            .eq('user_id', user.id)
            .in('comment_id', allCommentIds);

          setLikedComments(new Set(likesData?.map(l => l.comment_id) || []));
        }

        // Build comment tree
        const repliesMap = new Map<string, Comment[]>();
        repliesData?.forEach(reply => {
          const parentReplies = repliesMap.get(reply.parent_id) || [];
          parentReplies.push({
            ...reply,
            user: usersMap.get(reply.user_id),
          });
          repliesMap.set(reply.parent_id, parentReplies);
        });

        const enrichedComments: Comment[] = commentsData.map(comment => ({
          ...comment,
          user: usersMap.get(comment.user_id),
          replies: repliesMap.get(comment.id) || [],
        }));

        setComments(enrichedComments);
      } else {
        setComments([]);
      }
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  }, [marketId, user]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmitComment = async () => {
    if (!user) {
      openAuth();
      return;
    }
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId,
          userId: user.id,
          content: newComment.trim(),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to post comment');
      }

      setNewComment('');
      await loadComments();
      toast.success('Comment posted!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!user) {
      openAuth();
      return;
    }
    if (!replyContent.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId,
          userId: user.id,
          content: replyContent.trim(),
          parentId,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to post reply');
      }

      setReplyTo(null);
      setReplyContent('');
      await loadComments();
      toast.success('Reply posted!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    if (!user) {
      openAuth();
      return;
    }

    const isLiked = likedComments.has(commentId);

    try {
      const response = await fetch('/api/comments/like', {
        method: isLiked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, userId: user.id }),
      });

      if (!response.ok) throw new Error('Failed to update like');

      // Optimistic update
      const newLiked = new Set(likedComments);
      if (isLiked) {
        newLiked.delete(commentId);
      } else {
        newLiked.add(commentId);
      }
      setLikedComments(newLiked);

      // Update comment likes count locally
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return { ...c, likes: c.likes + (isLiked ? -1 : 1) };
        }
        if (c.replies) {
          return {
            ...c,
            replies: c.replies.map(r =>
              r.id === commentId ? { ...r, likes: r.likes + (isLiked ? -1 : 1) } : r
            ),
          };
        }
        return c;
      }));
    } catch (err) {
      toast.error('Failed to update like');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/comments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, userId: user.id }),
      });

      if (!response.ok) throw new Error('Failed to delete comment');

      await loadComments();
      toast.success('Comment deleted');
    } catch (err) {
      toast.error('Failed to delete comment');
    }
  };

  const getTimeAgo = (dateString: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getInitials = (username?: string) => {
    if (!username) return '?';
    return username.charAt(0).toUpperCase();
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={`${isReply ? 'ml-8 pl-3 border-l-2 border-gray-100' : ''}`}>
      <div className="flex gap-3 py-3">
        {/* Avatar */}
        <div className={`${isReply ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm'} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium shrink-0`}>
          {getInitials(comment.user?.username)}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900">
              {comment.user?.username || 'Anonymous'}
            </span>
            <span className="text-xs text-gray-400">{getTimeAgo(comment.created_at)}</span>
          </div>

          {/* Content */}
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
            {comment.content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => handleLike(comment.id)}
              className={`flex items-center gap-1 text-xs transition-colors ${
                likedComments.has(comment.id)
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <ThumbsUp size={13} />
              {comment.likes > 0 && <span>{comment.likes}</span>}
            </button>

            {!isReply && (
              <button
                onClick={() => {
                  setReplyTo(replyTo === comment.id ? null : comment.id);
                  setReplyContent('');
                }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Reply size={13} />
                Reply
              </button>
            )}

            {user && comment.user_id === user.id && (
              <button
                onClick={() => handleDelete(comment.id)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>

          {/* Reply Input */}
          {replyTo === comment.id && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmitReply(comment.id)}
                placeholder="Write a reply..."
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                autoFocus
              />
              <button
                onClick={() => handleSubmitReply(comment.id)}
                disabled={submitting || !replyContent.trim()}
                className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} isReply />
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageCircle size={16} />
          Discussion
        </h3>
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <MessageCircle size={16} />
        Discussion
        {comments.length > 0 && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {comments.length + comments.reduce((sum, c) => sum + (c.replies?.length || 0), 0)}
          </span>
        )}
      </h3>

      {/* New Comment Input */}
      <div className="flex gap-3 mb-4">
        {user ? (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium shrink-0">
            {getInitials(user.email?.split('@')[0])}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm shrink-0">?</div>
        )}
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmitComment()}
            onClick={() => !user && openAuth()}
            placeholder={user ? "Share your thoughts..." : "Sign in to comment..."}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-gray-400"
          />
          <button
            onClick={handleSubmitComment}
            disabled={submitting || !newComment.trim()}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* Comments List */}
      {comments.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">
          No comments yet. Be the first to share your thoughts!
        </p>
      ) : (
        <div className="divide-y divide-gray-50">
          {comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
}
