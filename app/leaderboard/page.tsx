'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';
import { Trophy, Medal, TrendingUp, Award } from 'lucide-react';
import { formatSatoshis } from '@/lib/amm';

interface UserStats {
  user: User;
  totalTrades: number;
  totalProfit: number;
  activePositions: number;
  winRate: number;
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'all' | 'week' | 'month'>('all');

  useEffect(() => {
    loadLeaderboard();
  }, [timeframe]);

  const loadLeaderboard = async () => {
    setLoading(true);

    try {
      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('balance_satoshis', { ascending: false })
        .limit(100);

      if (usersError) throw usersError;

      // Get stats for each user
      const statsPromises = users.map(async (user) => {
        // Get trade count
        const { data: trades } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id);

        // Get active positions
        const { data: positions } = await supabase
          .from('positions')
          .select('*')
          .eq('user_id', user.id);

        // Calculate profit (simplified - balance minus initial)
        const totalProfit = user.balance_satoshis - 10000; // Assuming 10k starting balance

        return {
          user,
          totalTrades: trades?.length || 0,
          totalProfit,
          activePositions: positions?.length || 0,
          winRate: 0, // TODO: Calculate from resolved markets
        };
      });

      const stats = await Promise.all(statsPromises);

      // Sort by balance
      stats.sort((a, b) => b.user.balance_satoshis - a.user.balance_satoshis);

      setLeaders(stats);
    } catch (err: any) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="text-yellow-500" size={24} />;
    if (rank === 2) return <Medal className="text-gray-400" size={24} />;
    if (rank === 3) return <Medal className="text-orange-600" size={24} />;
    return <span className="text-caribbean-gray-500 font-bold text-lg">#{rank}</span>;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Trophy className="text-yellow-500" size={32} />
          <h1 className="text-3xl font-bold text-caribbean-navy">Leaderboard</h1>
        </div>
        <p className="text-caribbean-gray-600">
          Top traders on CaribPredict ranked by portfolio value
        </p>
      </div>

      {/* Timeframe Filter */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTimeframe('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            timeframe === 'all'
              ? 'bg-caribbean-blue text-white'
              : 'bg-white text-caribbean-gray-700 border border-caribbean-gray-200 hover:bg-caribbean-gray-50'
          }`}
        >
          All Time
        </button>
        <button
          onClick={() => setTimeframe('month')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            timeframe === 'month'
              ? 'bg-caribbean-blue text-white'
              : 'bg-white text-caribbean-gray-700 border border-caribbean-gray-200 hover:bg-caribbean-gray-50'
          }`}
        >
          This Month
        </button>
        <button
          onClick={() => setTimeframe('week')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            timeframe === 'week'
              ? 'bg-caribbean-blue text-white'
              : 'bg-white text-caribbean-gray-700 border border-caribbean-gray-200 hover:bg-caribbean-gray-50'
          }`}
        >
          This Week
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-caribbean-gray-200 border-t-caribbean-blue mb-4"></div>
          <p className="text-caribbean-gray-500">Loading leaderboard...</p>
        </div>
      )}

      {/* Leaderboard Table */}
      {!loading && (
        <div className="bg-white rounded-xl border border-caribbean-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-caribbean-sand border-b border-caribbean-gray-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-caribbean-gray-700">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-caribbean-gray-700">
                    Trader
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-caribbean-gray-700">
                    Portfolio Value
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-caribbean-gray-700">
                    Profit/Loss
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-caribbean-gray-700">
                    Trades
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-caribbean-gray-700">
                    Positions
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((stats, index) => {
                  const rank = index + 1;
                  const isTopThree = rank <= 3;

                  return (
                    <tr
                      key={stats.user.id}
                      className={`border-b border-caribbean-gray-100 hover:bg-caribbean-sand/50 transition-colors ${
                        isTopThree ? 'bg-yellow-50/30' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-start">
                          {getRankIcon(rank)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-caribbean-blue to-caribbean-teal flex items-center justify-center text-white font-bold">
                            {stats.user.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-caribbean-navy">
                              {stats.user.username || `User ${stats.user.id.substring(0, 8)}`}
                            </div>
                            {isTopThree && (
                              <div className="text-xs text-caribbean-gray-500 flex items-center gap-1 mt-0.5">
                                <Award size={12} />
                                Top Trader
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-bold text-caribbean-navy">
                          {formatSatoshis(stats.user.balance_satoshis)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div
                          className={`font-semibold ${
                            stats.totalProfit >= 0 ? 'text-caribbean-green' : 'text-caribbean-coral'
                          }`}
                        >
                          {stats.totalProfit >= 0 ? '+' : ''}
                          {formatSatoshis(Math.abs(stats.totalProfit))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-caribbean-gray-700">{stats.totalTrades}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-caribbean-gray-700">{stats.activePositions}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {leaders.length === 0 && (
            <div className="py-12 text-center text-caribbean-gray-500">
              No traders yet. Be the first to trade!
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      {!loading && leaders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-xl border border-caribbean-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-caribbean-blue" size={20} />
              <span className="text-sm font-medium text-caribbean-gray-600">
                Most Active Trader
              </span>
            </div>
            <div className="text-2xl font-bold text-caribbean-navy">
              {leaders.sort((a, b) => b.totalTrades - a.totalTrades)[0]?.user.username || 'N/A'}
            </div>
            <div className="text-sm text-caribbean-gray-500 mt-1">
              {leaders.sort((a, b) => b.totalTrades - a.totalTrades)[0]?.totalTrades || 0} trades
            </div>
          </div>

          <div className="bg-white rounded-xl border border-caribbean-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="text-yellow-500" size={20} />
              <span className="text-sm font-medium text-caribbean-gray-600">
                Biggest Winner
              </span>
            </div>
            <div className="text-2xl font-bold text-caribbean-green">
              {formatSatoshis(leaders[0]?.totalProfit || 0)}
            </div>
            <div className="text-sm text-caribbean-gray-500 mt-1">
              {leaders[0]?.user.username || 'N/A'}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-caribbean-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Award className="text-caribbean-blue" size={20} />
              <span className="text-sm font-medium text-caribbean-gray-600">
                Total Traders
              </span>
            </div>
            <div className="text-2xl font-bold text-caribbean-navy">{leaders.length}</div>
            <div className="text-sm text-caribbean-gray-500 mt-1">
              Active on the platform
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
