'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatSatoshis } from '@/lib/amm';
import { BarChart3, TrendingUp, Users, Activity, Globe, Bitcoin, Zap } from 'lucide-react';
import { CARICOM_COUNTRIES } from '@/lib/types';

interface PlatformStats {
  totalMarkets: number;
  activeMarkets: number;
  resolvedMarkets: number;
  totalUsers: number;
  totalTrades: number;
  totalVolume: number;
  countryCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
}

export default function StatsPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [allMarkets, activeRes, resolvedRes, usersRes, tradesRes, marketsData] = await Promise.all([
        supabase.from('markets').select('*', { count: 'exact', head: true }),
        supabase.from('markets').select('*', { count: 'exact', head: true }).eq('resolved', false),
        supabase.from('markets').select('*', { count: 'exact', head: true }).eq('resolved', true),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('trades').select('total_cost'),
        supabase.from('markets').select('country_filter, category'),
      ]);

      const countryCounts: Record<string, number> = {};
      const categoryCounts: Record<string, number> = {};
      marketsData.data?.forEach(m => {
        countryCounts[m.country_filter] = (countryCounts[m.country_filter] || 0) + 1;
        categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1;
      });

      setStats({
        totalMarkets: allMarkets.count || 0,
        activeMarkets: activeRes.count || 0,
        resolvedMarkets: resolvedRes.count || 0,
        totalUsers: usersRes.count || 0,
        totalTrades: tradesRes.data?.length || 0,
        totalVolume: tradesRes.data?.reduce((s, t) => s + (t.total_cost || 0), 0) || 0,
        countryCounts,
        categoryCounts,
      });
    } catch (err) {
      console.error('Stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 flex justify-center">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform Statistics</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {[
          { label: 'Markets', value: stats.totalMarkets, icon: BarChart3 },
          { label: 'Active', value: stats.activeMarkets, icon: Activity },
          { label: 'Resolved', value: stats.resolvedMarkets, icon: TrendingUp },
          { label: 'Traders', value: stats.totalUsers, icon: Users },
          { label: 'Trades', value: stats.totalTrades, icon: Zap },
          { label: 'Volume', value: formatSatoshis(stats.totalVolume), icon: Bitcoin },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <s.icon size={18} className="text-gray-400 mb-2" />
            <div className="text-xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Markets by Country */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe size={16} />
            Markets by Country
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.countryCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([country, count]) => (
                <div key={country} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{country}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(count / stats.totalMarkets) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-900 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Markets by Category */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={16} />
            Markets by Category
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.categoryCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{category}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(count / stats.totalMarkets) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-900 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
