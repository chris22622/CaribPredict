'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatSatoshis } from '@/lib/amm';
import { Trophy, Medal, TrendingUp, Users } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_trades: number;
  total_volume: number;
  total_pnl: number;
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'volume' | 'trades' | 'pnl'>('volume');

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const { data: trades } = await supabase
        .from('trades')
        .select('user_id, total_cost, is_buy, shares, price');

      const { data: users } = await supabase
        .from('users')
        .select('id, username, balance_satoshis');

      if (!trades || !users) return;

      const userMap = new Map(users.map(u => [u.id, u]));
      const leaderMap = new Map<string, LeaderboardEntry>();

      trades.forEach(trade => {
        const existing = leaderMap.get(trade.user_id) || {
          user_id: trade.user_id,
          username: userMap.get(trade.user_id)?.username || 'Anonymous',
          total_trades: 0,
          total_volume: 0,
          total_pnl: 0,
        };

        existing.total_trades += 1;
        existing.total_volume += trade.total_cost || 0;
        existing.total_pnl += trade.is_buy ? -(trade.total_cost || 0) : (trade.total_cost || 0);

        leaderMap.set(trade.user_id, existing);
      });

      setLeaders(Array.from(leaderMap.values()));
    } catch (err) {
      console.error('Leaderboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const sorted = [...leaders].sort((a, b) => {
    if (sortBy === 'volume') return b.total_volume - a.total_volume;
    if (sortBy === 'trades') return b.total_trades - a.total_trades;
    return b.total_pnl - a.total_pnl;
  });

  const getRankBadge = (rank: number) => {
    if (rank === 0) return <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center"><Trophy size={16} className="text-amber-600" /></div>;
    if (rank === 1) return <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"><Medal size={16} className="text-gray-500" /></div>;
    if (rank === 2) return <div className="w-8 h-8 bg-orange-50 rounded-full flex items-center justify-center"><Medal size={16} className="text-orange-400" /></div>;
    return <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-xs font-bold text-gray-400">{rank + 1}</div>;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
          {(['volume', 'trades', 'pnl'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                sortBy === s ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s === 'volume' ? 'Volume' : s === 'trades' ? 'Trades' : 'P&L'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Users size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No traders yet. Be the first!</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {sorted.map((entry, idx) => (
              <div key={entry.user_id} className={`flex items-center gap-4 px-4 py-3 ${idx < 3 ? 'bg-gray-50/50' : ''} hover:bg-gray-50 transition-colors`}>
                {getRankBadge(idx)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{entry.username}</div>
                  <div className="text-xs text-gray-500">{entry.total_trades} trades</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">{formatSatoshis(entry.total_volume)}</div>
                  <div className={`text-xs font-medium ${entry.total_pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {entry.total_pnl >= 0 ? '+' : ''}{formatSatoshis(entry.total_pnl)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
