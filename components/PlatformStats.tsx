'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TrendingUp, Users, BarChart3, Activity } from 'lucide-react';
import { formatSatoshis } from '@/lib/amm';

interface Stats {
  totalMarkets: number;
  activeMarkets: number;
  totalUsers: number;
  totalVolume: number;
  totalTrades: number;
}

export default function PlatformStats() {
  const [stats, setStats] = useState<Stats>({
    totalMarkets: 0,
    activeMarkets: 0,
    totalUsers: 0,
    totalVolume: 0,
    totalTrades: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get market counts
      const { count: totalMarkets } = await supabase
        .from('markets')
        .select('*', { count: 'exact', head: true });

      const { count: activeMarkets } = await supabase
        .from('markets')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false);

      // Get user count
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get trade count and volume
      const { data: trades } = await supabase
        .from('trades')
        .select('total_cost');

      const totalTrades = trades?.length || 0;
      const totalVolume = trades?.reduce((sum, trade) => sum + (trade.total_cost || 0), 0) || 0;

      setStats({
        totalMarkets: totalMarkets || 0,
        activeMarkets: activeMarkets || 0,
        totalUsers: totalUsers || 0,
        totalVolume,
        totalTrades,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null; // Or a skeleton loader
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-white rounded-xl border border-caribbean-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-blue-50 rounded-lg">
            <BarChart3 className="text-caribbean-blue" size={18} />
          </div>
          <span className="text-sm font-medium text-caribbean-gray-600">Active Markets</span>
        </div>
        <div className="text-2xl font-bold text-caribbean-navy">{stats.activeMarkets}</div>
      </div>

      <div className="bg-white rounded-xl border border-caribbean-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-green-50 rounded-lg">
            <Users className="text-caribbean-green" size={18} />
          </div>
          <span className="text-sm font-medium text-caribbean-gray-600">Total Traders</span>
        </div>
        <div className="text-2xl font-bold text-caribbean-navy">{stats.totalUsers}</div>
      </div>

      <div className="bg-white rounded-xl border border-caribbean-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-purple-50 rounded-lg">
            <Activity className="text-purple-600" size={18} />
          </div>
          <span className="text-sm font-medium text-caribbean-gray-600">Total Trades</span>
        </div>
        <div className="text-2xl font-bold text-caribbean-navy">{stats.totalTrades}</div>
      </div>

      <div className="bg-white rounded-xl border border-caribbean-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-yellow-50 rounded-lg">
            <TrendingUp className="text-yellow-600" size={18} />
          </div>
          <span className="text-sm font-medium text-caribbean-gray-600">Total Volume</span>
        </div>
        <div className="text-2xl font-bold text-caribbean-navy">
          {formatSatoshis(stats.totalVolume)}
        </div>
      </div>
    </div>
  );
}
