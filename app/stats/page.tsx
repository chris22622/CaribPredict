'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TrendingUp, Users, DollarSign, Activity, BarChart3, Clock } from 'lucide-react';
import { formatSatoshis } from '@/lib/amm';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface PlatformStats {
  totalMarkets: number;
  activeMarkets: number;
  resolvedMarkets: number;
  totalTraders: number;
  totalTrades: number;
  totalVolume: number;
  volume24h: number;
  volumeByCategory: { category: string; volume: number }[];
  volumeByCountry: { country: string; markets: number }[];
  recentActivity: Array<{
    date: string;
    trades: number;
    volume: number;
  }>;
}

export default function StatsPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Get markets
      const { data: allMarkets } = await supabase.from('markets').select('*');
      const { data: activeMarkets } = await supabase
        .from('markets')
        .select('*')
        .eq('resolved', false);
      const { data: resolvedMarkets } = await supabase
        .from('markets')
        .select('*')
        .eq('resolved', true);

      // Get traders
      const { data: traders } = await supabase.from('users').select('id');

      // Get trades
      const { data: allTrades } = await supabase
        .from('trades')
        .select('total_cost, created_at');

      // Get 24h trades
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: trades24h } = await supabase
        .from('trades')
        .select('total_cost')
        .gte('created_at', yesterday);

      // Calculate total volume
      const totalVolume = allTrades?.reduce((sum, trade) => sum + trade.total_cost, 0) || 0;
      const volume24h = trades24h?.reduce((sum, trade) => sum + trade.total_cost, 0) || 0;

      // Volume by category
      const { data: marketsWithTrades } = await supabase
        .from('markets')
        .select('id, category');

      const categoryVolumes: { [key: string]: number } = {};
      for (const market of marketsWithTrades || []) {
        const { data: marketTrades } = await supabase
          .from('trades')
          .select('total_cost')
          .eq('market_id', market.id);

        const volume = marketTrades?.reduce((sum, t) => sum + t.total_cost, 0) || 0;
        categoryVolumes[market.category] = (categoryVolumes[market.category] || 0) + volume;
      }

      const volumeByCategory = Object.entries(categoryVolumes)
        .map(([category, volume]) => ({ category, volume }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 8);

      // Markets by country
      const countryMap: { [key: string]: number } = {};
      allMarkets?.forEach((market) => {
        countryMap[market.country_filter] = (countryMap[market.country_filter] || 0) + 1;
      });

      const volumeByCountry = Object.entries(countryMap)
        .map(([country, markets]) => ({ country, markets }))
        .sort((a, b) => b.markets - a.markets)
        .slice(0, 10);

      // Recent activity (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const activityData: { [key: string]: { trades: number; volume: number } } = {};

      for (let i = 0; i < 7; i++) {
        const date = new Date(sevenDaysAgo);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        activityData[dateStr] = { trades: 0, volume: 0 };
      }

      allTrades?.forEach((trade) => {
        const dateStr = trade.created_at.split('T')[0];
        if (activityData[dateStr]) {
          activityData[dateStr].trades++;
          activityData[dateStr].volume += trade.total_cost;
        }
      });

      const recentActivity = Object.entries(activityData).map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        trades: data.trades,
        volume: data.volume,
      }));

      setStats({
        totalMarkets: allMarkets?.length || 0,
        activeMarkets: activeMarkets?.length || 0,
        resolvedMarkets: resolvedMarkets?.length || 0,
        totalTraders: traders?.length || 0,
        totalTrades: allTrades?.length || 0,
        totalVolume,
        volume24h,
        volumeByCategory,
        volumeByCountry,
        recentActivity,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-caribbean-gray-200 border-t-caribbean-blue mb-4"></div>
        <p className="text-caribbean-gray-500">Loading platform statistics...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
        Failed to load statistics
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <BarChart3 className="text-caribbean-blue" size={32} />
          <h1 className="text-3xl font-bold text-caribbean-navy">Platform Statistics</h1>
        </div>
        <p className="text-caribbean-gray-600">
          Real-time insights into CaribPredict's prediction markets
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-caribbean-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-caribbean-blue/10 rounded-lg">
              <DollarSign className="text-caribbean-blue" size={24} />
            </div>
            <div className="text-xs text-caribbean-gray-500">ALL TIME</div>
          </div>
          <div className="text-2xl font-bold text-caribbean-navy">
            {formatSatoshis(stats.totalVolume)}
          </div>
          <div className="text-sm text-caribbean-gray-600">Total Volume</div>
        </div>

        <div className="bg-white rounded-xl border border-caribbean-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-caribbean-green/10 rounded-lg">
              <Clock className="text-caribbean-green" size={24} />
            </div>
            <div className="text-xs text-caribbean-gray-500">24 HOURS</div>
          </div>
          <div className="text-2xl font-bold text-caribbean-navy">
            {formatSatoshis(stats.volume24h)}
          </div>
          <div className="text-sm text-caribbean-gray-600">24h Volume</div>
        </div>

        <div className="bg-white rounded-xl border border-caribbean-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-caribbean-teal/10 rounded-lg">
              <TrendingUp className="text-caribbean-teal" size={24} />
            </div>
            <div className="text-xs text-caribbean-gray-500">LIVE</div>
          </div>
          <div className="text-2xl font-bold text-caribbean-navy">
            {stats.activeMarkets}
          </div>
          <div className="text-sm text-caribbean-gray-600">Active Markets</div>
        </div>

        <div className="bg-white rounded-xl border border-caribbean-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-caribbean-coral/10 rounded-lg">
              <Users className="text-caribbean-coral" size={24} />
            </div>
            <div className="text-xs text-caribbean-gray-500">REGISTERED</div>
          </div>
          <div className="text-2xl font-bold text-caribbean-navy">
            {stats.totalTraders}
          </div>
          <div className="text-sm text-caribbean-gray-600">Total Traders</div>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="bg-white rounded-xl border border-caribbean-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="text-caribbean-blue" size={20} />
          <h2 className="text-xl font-bold text-caribbean-navy">Trading Activity (Last 7 Days)</h2>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats.recentActivity}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Line
              type="monotone"
              dataKey="trades"
              stroke="#0095D9"
              strokeWidth={3}
              dot={{ fill: '#0095D9', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume by Category */}
        <div className="bg-white rounded-xl border border-caribbean-gray-200 p-6">
          <h2 className="text-xl font-bold text-caribbean-navy mb-4">Volume by Category</h2>
          <div className="space-y-3">
            {stats.volumeByCategory.map((item, index) => {
              const maxVolume = stats.volumeByCategory[0]?.volume || 1;
              const percentage = (item.volume / maxVolume) * 100;

              return (
                <div key={item.category}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-caribbean-gray-700">
                      {item.category}
                    </span>
                    <span className="text-sm font-bold text-caribbean-blue">
                      {formatSatoshis(item.volume)}
                    </span>
                  </div>
                  <div className="w-full bg-caribbean-gray-100 rounded-full h-2">
                    <div
                      className="bg-caribbean-blue rounded-full h-2 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Markets by Country */}
        <div className="bg-white rounded-xl border border-caribbean-gray-200 p-6">
          <h2 className="text-xl font-bold text-caribbean-navy mb-4">Markets by Country</h2>
          <div className="space-y-3">
            {stats.volumeByCountry.map((item, index) => {
              const maxMarkets = stats.volumeByCountry[0]?.markets || 1;
              const percentage = (item.markets / maxMarkets) * 100;

              return (
                <div key={item.country}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-caribbean-gray-700">
                      {item.country}
                    </span>
                    <span className="text-sm font-bold text-caribbean-teal">
                      {item.markets} {item.markets === 1 ? 'market' : 'markets'}
                    </span>
                  </div>
                  <div className="w-full bg-caribbean-gray-100 rounded-full h-2">
                    <div
                      className="bg-caribbean-teal rounded-full h-2 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-caribbean-gray-200 p-4 text-center">
          <div className="text-3xl font-bold text-caribbean-navy">{stats.totalMarkets}</div>
          <div className="text-sm text-caribbean-gray-600 mt-1">Total Markets</div>
        </div>
        <div className="bg-white rounded-xl border border-caribbean-gray-200 p-4 text-center">
          <div className="text-3xl font-bold text-caribbean-green">{stats.activeMarkets}</div>
          <div className="text-sm text-caribbean-gray-600 mt-1">Active</div>
        </div>
        <div className="bg-white rounded-xl border border-caribbean-gray-200 p-4 text-center">
          <div className="text-3xl font-bold text-caribbean-gray-400">{stats.resolvedMarkets}</div>
          <div className="text-sm text-caribbean-gray-600 mt-1">Resolved</div>
        </div>
        <div className="bg-white rounded-xl border border-caribbean-gray-200 p-4 text-center">
          <div className="text-3xl font-bold text-caribbean-blue">{stats.totalTrades}</div>
          <div className="text-sm text-caribbean-gray-600 mt-1">Total Trades</div>
        </div>
      </div>
    </div>
  );
}
