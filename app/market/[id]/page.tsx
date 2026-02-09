'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase, getOrCreateUser } from '@/lib/supabase';
import { Market, MarketOption, User, Position } from '@/lib/types';
import TradingInterface from '@/components/TradingInterface';
import BalanceDisplay from '@/components/BalanceDisplay';
import { ArrowLeft, Calendar, MapPin, TrendingUp } from 'lucide-react';
import { formatSatoshis } from '@/lib/amm';
import Link from 'next/link';

export default function MarketPage() {
  const params = useParams();
  const router = useRouter();
  const marketId = params.id as string;

  const [market, setMarket] = useState<Market | null>(null);
  const [options, setOptions] = useState<MarketOption[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [positions, setPositions] = useState<{ [optionIndex: number]: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMarketData();
  }, [marketId]);

  const loadMarketData = async () => {
    setLoading(true);
    setError('');

    try {
      // Load market
      const { data: marketData, error: marketError } = await supabase
        .from('markets')
        .select('*')
        .eq('id', marketId)
        .single();

      if (marketError) throw marketError;
      setMarket(marketData);

      // Load options
      const { data: optionsData, error: optionsError } = await supabase
        .from('market_options')
        .select('*')
        .eq('market_id', marketId)
        .order('option_index', { ascending: true });

      if (optionsError) throw optionsError;
      setOptions(optionsData || []);

      // Load or create user
      const userData = await getOrCreateUser();
      setUser(userData);

      // Load user positions for this market
      const { data: positionsData, error: positionsError } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', userData.id)
        .eq('market_id', marketId);

      if (positionsError) throw positionsError;

      // Convert to map
      const positionsMap: { [key: number]: number } = {};
      positionsData?.forEach((pos: Position) => {
        positionsMap[pos.option_index] = pos.shares;
      });
      setPositions(positionsMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load market');
    } finally {
      setLoading(false);
    }
  };

  const handleTrade = async (
    optionIndex: number,
    tradeType: 'buy' | 'sell',
    shares: number,
    cost: number
  ) => {
    if (!user || !market) return;

    try {
      // Call trade API
      const response = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          marketId: market.id,
          optionIndex,
          tradeType,
          shares,
          cost,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Trade failed');
      }

      // Reload market data to get updated prices and balances
      await loadMarketData();
    } catch (err: any) {
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-caribbean-blue"></div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error || 'Market not found'}
      </div>
    );
  }

  const closeDate = new Date(market.close_date);

  return (
    <div>
      {/* Back Button & Balance */}
      <div className="flex justify-between items-center mb-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-caribbean-blue hover:text-caribbean-teal transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Markets</span>
        </Link>
        {user && <BalanceDisplay balance={user.balance_satoshis} size="md" />}
      </div>

      {/* Market Details */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-caribbean-navy mb-4">{market.question}</h1>

        {market.description && (
          <p className="text-gray-700 mb-4">{market.description}</p>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <MapPin size={16} className="text-caribbean-coral" />
            <span>{market.country}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar size={16} />
            <span>Closes: {closeDate.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp size={16} className="text-caribbean-green" />
            <span>Volume: {formatSatoshis(market.total_volume)}</span>
          </div>
        </div>

        <div className="mt-4 px-3 py-2 bg-caribbean-sand rounded inline-block text-sm font-medium">
          {market.category}
        </div>
      </div>

      {/* Trading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TradingInterface
            market={market}
            options={options}
            userBalance={user?.balance_satoshis || 0}
            userPositions={positions}
            onTrade={handleTrade}
          />
        </div>

        {/* Your Positions Sidebar */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-caribbean-navy mb-4">Your Positions</h3>
          {Object.keys(positions).length === 0 ? (
            <p className="text-gray-600 text-sm">You don't have any positions in this market yet.</p>
          ) : (
            <div className="space-y-3">
              {options.map((option, idx) => {
                const shares = positions[idx];
                if (!shares || shares <= 0) return null;

                return (
                  <div key={option.id} className="border-l-4 border-caribbean-green pl-3 py-2">
                    <div className="text-sm font-medium text-gray-700">{option.option_text}</div>
                    <div className="text-lg font-bold text-caribbean-navy">
                      {shares.toFixed(2)} shares
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
