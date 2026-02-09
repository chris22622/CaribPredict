'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { formatSatoshis } from '@/lib/amm';

interface MarketStatsProps {
  marketId: string;
}

interface Stats {
  totalTrades: number;
  totalVolume: number;
  uniqueTraders: number;
  totalShares: number;
}

export default function MarketStats({ marketId }: MarketStatsProps) {
  const [stats, setStats] = useState<Stats>({
    totalTrades: 0,
    totalVolume: 0,
    uniqueTraders: 0,
    totalShares: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`market_stats:${marketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades',
          filter: `market_id=eq.${marketId}`,
        },
        () => {
          loadStats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [marketId]);

  const loadStats = async () => {
    try {
      // Get trades for this market
      const { data: trades } = await supabase
        .from('trades')
        .select('user_id, total_cost, shares')
        .eq('market_id', marketId);

      if (trades) {
        const uniqueUsers = new Set(trades.map((t) => t.user_id));
        const totalVolume = trades.reduce((sum, t) => sum + (t.total_cost || 0), 0);
        const totalShares = trades.reduce((sum, t) => sum + (t.shares || 0), 0);

        setStats({
          totalTrades: trades.length,
          totalVolume,
          uniqueTraders: uniqueUsers.size,
          totalShares,
        });
      }
    } catch (error) {
      console.error('Error loading market stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-caribbean-gray-200 p-6">
      <h3 className="text-lg font-bold text-caribbean-navy mb-4">Market Stats</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Activity className="text-caribbean-blue" size={16} />
            </div>
            <span className="text-sm text-caribbean-gray-600">Total Trades</span>
          </div>
          <div className="text-2xl font-bold text-caribbean-navy">{stats.totalTrades}</div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <Users className="text-caribbean-green" size={16} />
            </div>
            <span className="text-sm text-caribbean-gray-600">Traders</span>
          </div>
          <div className="text-2xl font-bold text-caribbean-navy">{stats.uniqueTraders}</div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <TrendingUp className="text-yellow-600" size={16} />
            </div>
            <span className="text-sm text-caribbean-gray-600">Volume</span>
          </div>
          <div className="text-xl font-bold text-caribbean-navy">
            {formatSatoshis(stats.totalVolume)}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-purple-50 rounded-lg">
              <DollarSign className="text-purple-600" size={16} />
            </div>
            <span className="text-sm text-caribbean-gray-600">Shares</span>
          </div>
          <div className="text-xl font-bold text-caribbean-navy">
            {stats.totalShares.toFixed(0)}
          </div>
        </div>
      </div>
    </div>
  );
}
