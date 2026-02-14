'use client';

/**
 * Admin Questions Page
 * Interface for reviewing and approving/rejecting auto-generated questions
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { QuestionQueue, GeneratedQuestion, NewsArticle } from '@/lib/types';

export default function AdminQuestionsPage() {
  const [queueItems, setQueueItems] = useState<QuestionQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchQueueItems();
  }, [filterStatus]);

  async function fetchQueueItems() {
    setLoading(true);
    try {
      let query = supabase
        .from('question_queue')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching queue items:', error);
        return;
      }

      setQueueItems(data || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(queueId: string) {
    if (!confirm('Are you sure you want to approve these questions and create live markets?')) {
      return;
    }

    setProcessing(prev => new Set(prev).add(queueId));

    try {
      const response = await fetch('/api/questions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Success! Created ${result.markets?.length || 0} markets`);
        await fetchQueueItems();
      } else {
        alert(`Error: ${result.error || 'Failed to approve'}`);
      }
    } catch (error) {
      console.error('Error approving:', error);
      alert('Error approving questions');
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(queueId);
        return next;
      });
    }
  }

  async function handleReject(queueId: string) {
    if (!confirm('Are you sure you want to reject these questions?')) {
      return;
    }

    setProcessing(prev => new Set(prev).add(queueId));

    try {
      const response = await fetch('/api/questions/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Questions rejected');
        await fetchQueueItems();
      } else {
        alert(`Error: ${result.error || 'Failed to reject'}`);
      }
    } catch (error) {
      console.error('Error rejecting:', error);
      alert('Error rejecting questions');
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(queueId);
        return next;
      });
    }
  }

  function toggleExpanded(queueId: string) {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(queueId)) {
        next.delete(queueId);
      } else {
        next.add(queueId);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8">Admin: Question Queue</h1>
          <div className="text-white text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Admin: Question Queue</h1>
          <a
            href="/"
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
          >
            Back to Markets
          </a>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-4 mb-6">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filterStatus === status
                  ? 'bg-white text-purple-900'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Queue items */}
        {queueItems.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center text-white">
            No questions in queue with status: {filterStatus}
          </div>
        ) : (
          <div className="space-y-6">
            {queueItems.map(item => {
              const questions: GeneratedQuestion[] = item.generated_questions || [];
              const articles: NewsArticle[] = item.raw_news || [];
              const isExpanded = expandedItems.has(item.id);
              const isProcessing = processing.has(item.id);

              return (
                <div
                  key={item.id}
                  className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-white"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold">{item.country}</h2>
                      <p className="text-white/70 text-sm">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                      <p className="text-white/70 text-sm">
                        Status: <span className="font-semibold">{item.status}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleExpanded(item.id)}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
                      >
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </button>
                      {item.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(item.id)}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 rounded-lg transition"
                          >
                            {isProcessing ? 'Processing...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleReject(item.id)}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-500 rounded-lg transition"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="mb-4">
                    <p className="text-white/90">
                      {questions.length} questions generated from {articles.length} news articles
                    </p>
                  </div>

                  {/* Questions preview */}
                  <div className="space-y-3">
                    {questions.slice(0, isExpanded ? undefined : 2).map((q, idx) => (
                      <div key={idx} className="bg-white/10 rounded-lg p-4">
                        <h3 className="font-semibold text-lg mb-2">{q.question}</h3>
                        <p className="text-white/80 text-sm mb-2">{q.description}</p>
                        <div className="flex gap-4 text-sm text-white/70">
                          <span>Category: {q.category}</span>
                          <span>Close: {q.close_date}</span>
                          <span>Options: {q.options.join(', ')}</span>
                        </div>
                        {isExpanded && (
                          <div className="mt-2 text-sm text-white/70">
                            <strong>Resolution:</strong> {q.resolution_criteria}
                          </div>
                        )}
                      </div>
                    ))}
                    {!isExpanded && questions.length > 2 && (
                      <p className="text-white/70 text-sm">
                        ... and {questions.length - 2} more questions
                      </p>
                    )}
                  </div>

                  {/* News articles (only when expanded) */}
                  {isExpanded && articles.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-semibold text-lg mb-3">Source Articles:</h3>
                      <div className="space-y-2">
                        {articles.slice(0, 5).map((article, idx) => (
                          <div key={idx} className="bg-white/5 rounded-lg p-3">
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium hover:underline"
                            >
                              {article.title}
                            </a>
                            <p className="text-white/70 text-sm mt-1">{article.description}</p>
                            {article.age && (
                              <p className="text-white/50 text-xs mt-1">{article.age}</p>
                            )}
                          </div>
                        ))}
                        {articles.length > 5 && (
                          <p className="text-white/70 text-sm">
                            ... and {articles.length - 5} more articles
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
