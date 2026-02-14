'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trade, MarketOption, User } from '@/lib/types';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { formatSatoshis, formatProbability } from '@/lib/amm';

interface TradeWithDetails extends Trade {
  option?: MarketOption;
  user?: User;
}

interface ActivityFeedProps {
  marketId: string;
  options: MarketOption[];
}

export default function ActivityFeed({ marketId, options }: ActivityFeedProps) {
  const [trades, setTrades] = useState<TradeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrades();

    const subscription = supabase
      .channel(`trades:market_id=eq.${marketId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'trades',
        filter: `market_id=eq.${marketId}`,
      }, () => loadTrades())
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, [marketId]);

  const loadTrades = async () => {
    try {
      const { data: tradesData, error } = await supabase
        .from('trades')
        .select('*')
        .eq('market_id', marketId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (tradesData && tradesData.length > 0) {
        const userIds = [...new Set(tradesData.map((t) => t.user_id))];
        const { data: usersData } = await supabase.from('users').select('*').in('id', userIds);

        const usersMap = new Map(usersData?.map((u) => [u.id, u]));
        const optionsMap = new Map(options.map((o) => [o.id, o]));

        setTrades(tradesData.map((trade) => ({
          ...trade,
          user: usersMap.get(trade.user_id),
          option: optionsMap.get(trade.option_id),
        })));
      }
    } catch (error) {
      console.error('Error loading trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>

      {trades.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">No trades yet. Be the first!</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {trades.map((trade) => {
            if (!trade.option) return null;
            return (
              <div key={trade.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  trade.is_buy ? 'bg-emerald-50' : 'bg-red-50'
                }`}>
                  {trade.is_buy ? (
                    <TrendingUp size={13} className="text-emerald-600" />
                  ) : (
                    <TrendingDown size={13} className="text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-medium text-gray-900">
                      {trade.user?.username || 'Anon'}
                    </span>
                    <span className={`font-bold ${trade.is_buy ? 'text-emerald-600' : 'text-red-600'}`}>
                      {trade.is_buy ? 'bought' : 'sold'}
                    </span>
                    <span className="text-gray-600">
                      {trade.shares.toFixed(0)} {trade.option.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span>@ {formatProbability(trade.price)}</span>
                    <span>{formatSatoshis(trade.total_cost)}</span>
                    <span>{getTimeAgo(trade.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
