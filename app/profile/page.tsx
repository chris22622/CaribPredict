'use client';

import { useEffect, useState } from 'react';
import { supabase, getOrCreateUser } from '@/lib/supabase';
import { User, Position, Trade, Market, MarketOption } from '@/lib/types';
import BalanceDisplay from '@/components/BalanceDisplay';
import { Loader2, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { formatSatoshis, formatProbability } from '@/lib/amm';
import Link from 'next/link';

interface PositionWithMarket extends Position {
  market?: Market;
  option?: MarketOption;
}

interface TradeWithDetails extends Trade {
  market?: Market;
  option?: MarketOption;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [positions, setPositions] = useState<PositionWithMarket[]>([]);
  const [recentTrades, setRecentTrades] = useState<TradeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    setError('');

    try {
      // Load user
      const userData = await getOrCreateUser();
      setUser(userData);

      // Load positions
      const { data: positionsData, error: positionsError } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', userData.id)
        .gt('shares', 0)
        .order('updated_at', { ascending: false });

      if (positionsError) throw positionsError;

      // Load market and option details for positions
      if (positionsData && positionsData.length > 0) {
        const marketIds = [...new Set(positionsData.map((p: Position) => p.market_id))];

        const { data: marketsData } = await supabase
          .from('markets')
          .select('*')
          .in('id', marketIds);

        const { data: optionsData } = await supabase
          .from('market_options')
          .select('*')
          .in('market_id', marketIds);

        const marketsMap = new Map(marketsData?.map((m) => [m.id, m]));
        const optionsMap = new Map(
          optionsData?.map((o) => [o.id, o])
        );

        const enrichedPositions = positionsData.map((pos: Position) => ({
          ...pos,
          market: marketsMap.get(pos.market_id),
          option: optionsMap.get(pos.option_id),
        }));

        setPositions(enrichedPositions);
      }

      // Load recent trades
      const { data: tradesData, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (tradesError) throw tradesError;

      // Load market and option details for trades
      if (tradesData && tradesData.length > 0) {
        const tradeMarketIds = [...new Set(tradesData.map((t: Trade) => t.market_id))];

        const { data: tradeMarketsData } = await supabase
          .from('markets')
          .select('*')
          .in('id', tradeMarketIds);

        const { data: tradeOptionsData } = await supabase
          .from('market_options')
          .select('*')
          .in('market_id', tradeMarketIds);

        const tradeMarketsMap = new Map(tradeMarketsData?.map((m) => [m.id, m]));
        const tradeOptionsMap = new Map(
          tradeOptionsData?.map((o) => [o.id, o])
        );

        const enrichedTrades = tradesData.map((trade: Trade) => ({
          ...trade,
          market: tradeMarketsMap.get(trade.market_id),
          option: tradeOptionsMap.get(trade.option_id),
        }));

        setRecentTrades(enrichedTrades);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin text-caribbean-blue" size={48} />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error || 'Failed to load profile'}
      </div>
    );
  }

  return (
    <div>
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-caribbean-blue to-caribbean-teal text-white rounded-lg p-8 mb-6 shadow-lg">
        <h1 className="text-3xl font-bold mb-4">Your Profile</h1>
        <div className="bg-white bg-opacity-20 rounded-lg p-4 inline-block">
          <BalanceDisplay balance={user.balance_satoshis} size="lg" showLabel={false} />
        </div>
      </div>

      {/* Active Positions */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-caribbean-navy mb-4">Active Positions</h2>
        {positions.length === 0 ? (
          <p className="text-gray-600">You don't have any active positions yet.</p>
        ) : (
          <div className="space-y-4">
            {positions.map((position) => {
              if (!position.market || !position.option) return null;

              const currentValue = position.shares * position.option.probability;
              const costBasis = position.shares * position.avg_price;
              const profitLoss = currentValue - costBasis;
              const profitLossPercent = ((profitLoss / costBasis) * 100).toFixed(1);

              return (
                <Link
                  key={position.id}
                  href={`/market/${position.market_id}`}
                  className="block border-l-4 border-caribbean-teal hover:bg-gray-50 transition-colors rounded p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-caribbean-navy mb-1">
                        {position.market.question}
                      </h3>
                      <div className="text-sm text-gray-600">
                        {position.option.label}
                      </div>
                    </div>
                    <div
                      className={`text-lg font-bold ${
                        profitLoss >= 0 ? 'text-caribbean-green' : 'text-caribbean-coral'
                      }`}
                    >
                      {profitLoss >= 0 ? '+' : ''}
                      {profitLossPercent}%
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {position.shares.toFixed(2)} shares @ {formatProbability(position.avg_price)}
                    </span>
                    <span className="text-gray-600">
                      Current: {formatProbability(position.option.probability)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Trades */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-caribbean-navy mb-4">Recent Trades</h2>
        {recentTrades.length === 0 ? (
          <p className="text-gray-600">No trades yet. Start trading on prediction markets!</p>
        ) : (
          <div className="space-y-3">
            {recentTrades.map((trade) => {
              if (!trade.market || !trade.option) return null;

              return (
                <div key={trade.id} className="border-b border-gray-200 pb-3 last:border-b-0">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">
                        {trade.market.question}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {trade.option.label}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {trade.is_buy ? (
                        <TrendingUp size={16} className="text-caribbean-green" />
                      ) : (
                        <TrendingDown size={16} className="text-caribbean-coral" />
                      )}
                      <span
                        className={`text-sm font-bold ${
                          trade.is_buy ? 'text-caribbean-green' : 'text-caribbean-coral'
                        }`}
                      >
                        {trade.is_buy ? 'BUY' : 'SELL'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>
                      {trade.shares.toFixed(2)} shares @ {formatProbability(trade.price)}
                    </span>
                    <span>{formatSatoshis(trade.total_cost)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <Clock size={12} />
                    <span>{new Date(trade.created_at).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
