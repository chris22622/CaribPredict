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

    // Subscribe to real-time trades
    const subscription = supabase
      .channel(`trades:market_id=eq.${marketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades',
          filter: `market_id=eq.${marketId}`,
        },
        (payload) => {
          loadTrades(); // Reload on new trade
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
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

      // Enrich with option and user data
      if (tradesData && tradesData.length > 0) {
        const userIds = [...new Set(tradesData.map((t) => t.user_id))];
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .in('id', userIds);

        const usersMap = new Map(usersData?.map((u) => [u.id, u]));
        const optionsMap = new Map(options.map((o) => [o.id, o]));

        const enriched = tradesData.map((trade) => ({
          ...trade,
          user: usersMap.get(trade.user_id),
          option: optionsMap.get(trade.option_id),
        }));

        setTrades(enriched);
      }
    } catch (error) {
      console.error('Error loading trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-caribbean-gray-200 p-6">
        <h3 className="text-lg font-bold text-caribbean-navy mb-4">Recent Activity</h3>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-caribbean-gray-200 border-t-caribbean-blue"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-caribbean-gray-200 p-6">
      <h3 className="text-lg font-bold text-caribbean-navy mb-4">Recent Activity</h3>

      {trades.length === 0 ? (
        <p className="text-caribbean-gray-500 text-sm text-center py-8">
          No trades yet. Be the first to trade on this market!
        </p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {trades.map((trade) => {
            if (!trade.option) return null;

            return (
              <div
                key={trade.id}
                className="flex items-start gap-3 p-3 bg-caribbean-sand/50 rounded-lg hover:bg-caribbean-sand transition-colors"
              >
                <div
                  className={`p-2 rounded-lg ${
                    trade.is_buy ? 'bg-green-100' : 'bg-red-100'
                  }`}
                >
                  {trade.is_buy ? (
                    <TrendingUp className="text-caribbean-green" size={16} />
                  ) : (
                    <TrendingDown className="text-caribbean-coral" size={16} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-caribbean-navy">
                      {trade.user?.username || `User ${trade.user_id.substring(0, 8)}`}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        trade.is_buy ? 'text-caribbean-green' : 'text-caribbean-coral'
                      }`}
                    >
                      {trade.is_buy ? 'BOUGHT' : 'SOLD'}
                    </span>
                  </div>

                  <div className="text-sm text-caribbean-gray-700">
                    {trade.shares.toFixed(0)} shares of{' '}
                    <span className="font-semibold">{trade.option.label}</span>
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-xs text-caribbean-gray-500">
                    <span>@ {formatProbability(trade.price)}</span>
                    <span>•</span>
                    <span>{formatSatoshis(trade.total_cost)}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock size={10} />
                      <span>{getTimeAgo(trade.created_at)}</span>
                    </div>
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
