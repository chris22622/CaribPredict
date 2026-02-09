'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase, getOrCreateUser } from '@/lib/supabase';
import { Market, MarketOption, User, Position } from '@/lib/types';
import TradingInterface from '@/components/TradingInterface';
import ActivityFeed from '@/components/ActivityFeed';
import MarketChart from '@/components/MarketChart';
import MarketStats from '@/components/MarketStats';
import { ArrowLeft, Calendar, MapPin, Clock, Info } from 'lucide-react';
import { formatProbability } from '@/lib/amm';
import Link from 'next/link';
import CategoryBadge from '@/components/CategoryBadge';
import ProbabilityBar from '@/components/ProbabilityBar';

export default function MarketPage() {
  const params = useParams();
  const marketId = params.id as string;

  const [market, setMarket] = useState<Market | null>(null);
  const [options, setOptions] = useState<MarketOption[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [positions, setPositions] = useState<{ [optionId: string]: number }>({});
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
        .order('created_at', { ascending: true });

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
      const positionsMap: { [key: string]: number } = {};
      positionsData?.forEach((pos: Position) => {
        positionsMap[pos.option_id] = pos.shares;
      });
      setPositions(positionsMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load market');
    } finally {
      setLoading(false);
    }
  };

  const handleTrade = async (
    optionId: string,
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
          optionId,
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
      <div className="flex flex-col justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-caribbean-gray-200 border-t-caribbean-blue mb-4"></div>
        <p className="text-caribbean-gray-500">Loading market...</p>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          <p className="font-medium">Error loading market</p>
          <p className="text-sm mt-1">{error || 'Market not found'}</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-4 text-caribbean-blue hover:text-caribbean-teal transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Markets</span>
        </Link>
      </div>
    );
  }

  const closeDate = new Date(market.close_date);
  const isClosingSoon = closeDate.getTime() - Date.now() < 24 * 60 * 60 * 1000;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 mb-6 text-caribbean-gray-600 hover:text-caribbean-blue transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Markets</span>
      </Link>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Market Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Market Header */}
          <div className="bg-white rounded-xl border border-caribbean-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <CategoryBadge category={market.category} size="md" />
              {isClosingSoon && (
                <span className="px-3 py-1 bg-red-50 text-red-600 text-sm font-medium rounded-full flex items-center gap-1">
                  <Clock size={14} />
                  Closing soon
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-caribbean-navy mb-4">
              {market.question}
            </h1>

            {market.description && (
              <p className="text-caribbean-gray-600 mb-6 leading-relaxed">
                {market.description}
              </p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-caribbean-gray-500">
              <div className="flex items-center gap-1">
                <MapPin size={16} />
                <span>{market.country_filter}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                <span>Closes: {closeDate.toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
            </div>
          </div>

          {/* Market Options Overview */}
          <div className="bg-white rounded-xl border border-caribbean-gray-200 p-6">
            <h2 className="text-lg font-bold text-caribbean-navy mb-4">Market Odds</h2>
            <div className="space-y-4">
              {options.map((option) => (
                <div key={option.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-caribbean-navy">{option.label}</span>
                    <span className="text-2xl font-bold text-caribbean-blue">
                      {formatProbability(option.probability)}
                    </span>
                  </div>
                  <ProbabilityBar probability={option.probability} showPercentage={false} />
                </div>
              ))}
            </div>
          </div>

          {/* Probability Chart */}
          <MarketChart options={options} />

          {/* Resolution Criteria */}
          {market.description && (
            <div className="bg-white rounded-xl border border-caribbean-gray-200 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Info size={18} className="text-caribbean-blue" />
                <h2 className="text-lg font-bold text-caribbean-navy">Resolution Criteria</h2>
              </div>
              <p className="text-caribbean-gray-600 text-sm">
                This market will resolve based on official announcements and verified sources.
                Resolution will occur shortly after the event concludes.
              </p>
            </div>
          )}

          {/* Activity Feed */}
          <ActivityFeed marketId={marketId} options={options} />

          {/* Your Positions (mobile view) */}
          {Object.keys(positions).length > 0 && (
            <div className="lg:hidden bg-white rounded-xl border border-caribbean-gray-200 p-6">
              <h3 className="text-lg font-bold text-caribbean-navy mb-4">Your Positions</h3>
              <div className="space-y-3">
                {options.map((option) => {
                  const shares = positions[option.id];
                  if (!shares || shares <= 0) return null;

                  return (
                    <div key={option.id} className="flex justify-between items-center p-3 bg-caribbean-sand rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-caribbean-gray-700">{option.label}</div>
                        <div className="text-xs text-caribbean-gray-500 mt-1">{shares.toFixed(2)} shares</div>
                      </div>
                      <div className="text-lg font-bold text-caribbean-green">
                        {formatProbability(option.probability)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Trading Interface */}
        <div className="space-y-6">
          <TradingInterface
            market={market}
            options={options}
            userBalance={user?.balance_satoshis || 0}
            userPositions={positions}
            onTrade={handleTrade}
          />

          {/* Market Stats */}
          <MarketStats marketId={marketId} />

          {/* Your Positions (desktop view) */}
          <div className="hidden lg:block bg-white rounded-xl border border-caribbean-gray-200 p-6">
            <h3 className="text-lg font-bold text-caribbean-navy mb-4">Your Positions</h3>
            {Object.keys(positions).length === 0 ? (
              <p className="text-caribbean-gray-500 text-sm">
                You don't have any positions in this market yet.
              </p>
            ) : (
              <div className="space-y-3">
                {options.map((option) => {
                  const shares = positions[option.id];
                  if (!shares || shares <= 0) return null;

                  return (
                    <div key={option.id} className="border-l-4 border-caribbean-green pl-3 py-2">
                      <div className="text-sm font-medium text-caribbean-gray-700">{option.label}</div>
                      <div className="text-lg font-bold text-caribbean-navy">
                        {shares.toFixed(2)} shares
                      </div>
                      <div className="text-xs text-caribbean-gray-500 mt-1">
                        Current: {formatProbability(option.probability)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
