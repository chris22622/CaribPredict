'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Market, MarketOption, Position } from '@/lib/types';
import TradingInterface from '@/components/TradingInterface';
import ActivityFeed from '@/components/ActivityFeed';
import MarketChart from '@/components/MarketChart';
import { ArrowLeft, Calendar, MapPin, Clock, Info, Share2, Star, TrendingUp, Users } from 'lucide-react';
import { formatProbability } from '@/lib/amm';
import Link from 'next/link';
import { useAuth } from '@/app/layout-client';
import { toast } from 'sonner';

export default function MarketPage() {
  const params = useParams();
  const marketId = params.id as string;
  const { user, balance, refreshBalance, openAuth } = useAuth();

  const [market, setMarket] = useState<Market | null>(null);
  const [options, setOptions] = useState<MarketOption[]>([]);
  const [positions, setPositions] = useState<{ [optionId: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'trade' | 'activity' | 'details'>('trade');
  const [tradeStats, setTradeStats] = useState({ totalTrades: 0, totalVolume: 0, uniqueTraders: 0 });

  const loadMarketData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data: marketData, error: marketError } = await supabase
        .from('markets')
        .select('*')
        .eq('id', marketId)
        .single();

      if (marketError) throw marketError;
      setMarket(marketData);

      const { data: optionsData, error: optionsError } = await supabase
        .from('market_options')
        .select('*')
        .eq('market_id', marketId)
        .order('created_at', { ascending: true });

      if (optionsError) throw optionsError;
      setOptions(optionsData || []);

      // Load trade stats
      const { data: trades } = await supabase
        .from('trades')
        .select('total_cost, user_id')
        .eq('market_id', marketId);

      if (trades) {
        const uniqueTraders = new Set(trades.map(t => t.user_id)).size;
        setTradeStats({
          totalTrades: trades.length,
          totalVolume: trades.reduce((s, t) => s + (t.total_cost || 0), 0),
          uniqueTraders,
        });
      }

      // Load user positions if authenticated
      if (user) {
        const { data: positionsData } = await supabase
          .from('positions')
          .select('*')
          .eq('user_id', user.id)
          .eq('market_id', marketId);

        const positionsMap: { [key: string]: number } = {};
        positionsData?.forEach((pos: Position) => {
          positionsMap[pos.option_id] = pos.shares;
        });
        setPositions(positionsMap);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load market');
    } finally {
      setLoading(false);
    }
  }, [marketId, user]);

  useEffect(() => {
    loadMarketData();
  }, [loadMarketData]);

  const handleTrade = async (
    optionId: string,
    tradeType: 'buy' | 'sell',
    shares: number,
    cost: number
  ) => {
    if (!user) {
      openAuth();
      return;
    }

    const response = await fetch('/api/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        marketId: market?.id,
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

    await Promise.all([loadMarketData(), refreshBalance()]);
  };

  const formatSats = (sats: number) => {
    if (sats >= 1000000) return `${(sats / 1000000).toFixed(2)}M sats`;
    if (sats >= 1000) return `${(sats / 1000).toFixed(1)}k sats`;
    return `${Math.round(sats)} sats`;
  };

  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = {
      'Jamaica': '\u{1F1EF}\u{1F1F2}',
      'Trinidad and Tobago': '\u{1F1F9}\u{1F1F9}',
      'Barbados': '\u{1F1E7}\u{1F1E7}',
      'Guyana': '\u{1F1EC}\u{1F1FE}',
      'Suriname': '\u{1F1F8}\u{1F1F7}',
      'Bahamas': '\u{1F1E7}\u{1F1F8}',
      'Belize': '\u{1F1E7}\u{1F1FF}',
      'Haiti': '\u{1F1ED}\u{1F1F9}',
    };
    return flags[country] || '\u{1F334}';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col items-center py-20">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-400">Loading market...</p>
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-4">
          <p className="font-medium">Error loading market</p>
          <p className="text-sm mt-1">{error || 'Market not found'}</p>
        </div>
        <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
          <ArrowLeft size={16} /> Back to Markets
        </Link>
      </div>
    );
  }

  const closeDate = new Date(market.close_date);
  const msLeft = closeDate.getTime() - Date.now();
  const hoursLeft = msLeft / (1000 * 60 * 60);
  const isClosed = msLeft <= 0;

  const isBinary = options.length === 2;
  const yesOption = isBinary ? options.find(o => o.label.toLowerCase() === 'yes') || options[0] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Back */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm mb-4 transition-colors">
        <ArrowLeft size={16} />
        <span>Markets</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Market Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3 text-xs">
              <span className="text-gray-400">
                {getCountryFlag(market.country_filter)} {market.country_filter}
              </span>
              <span className="text-gray-300">|</span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-medium">{market.category}</span>
              <span className="text-gray-300">|</span>
              <span className={`flex items-center gap-1 ${isClosed ? 'text-gray-400' : hoursLeft < 24 ? 'text-red-500' : 'text-gray-500'}`}>
                <Clock size={12} />
                {isClosed ? 'Closed' : `Closes ${closeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 leading-tight">
              {market.question}
            </h1>

            {market.description && (
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                {market.description}
              </p>
            )}

            {/* Big Probability Display */}
            {isBinary && yesOption && (
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <div className="text-4xl font-bold text-gray-900">
                    {Math.round(yesOption.probability * 100)}%
                  </div>
                  <div className="text-sm text-gray-500 mt-1">chance of Yes</div>
                </div>
                <div className="w-24 h-24 relative">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#e5e7eb" strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#10b981" strokeWidth="3"
                      strokeDasharray={`${yesOption.probability * 100}, 100`}
                    />
                  </svg>
                </div>
              </div>
            )}

            {/* Multi-option display */}
            {!isBinary && (
              <div className="space-y-3 mt-2">
                {options.map((option) => (
                  <div key={option.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{option.label}</span>
                        <span className="text-sm font-bold text-gray-900">{formatProbability(option.probability)}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${option.probability * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Market stats */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <TrendingUp size={13} />
                {tradeStats.totalTrades} trades
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={13} />
                {tradeStats.uniqueTraders} traders
              </span>
              <span className="flex items-center gap-1.5">
                Vol: {formatSats(tradeStats.totalVolume)}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1">
            {(['activity', 'details'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'activity' ? 'Activity' : 'Details'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'activity' && (
            <ActivityFeed marketId={marketId} options={options} />
          )}

          {activeTab === 'details' && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Resolution Criteria</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {market.description || 'This market will resolve based on official announcements and verified sources. Resolution will occur shortly after the event concludes.'}
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Created</span>
                  <p className="font-medium text-gray-900">
                    {new Date(market.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Close Date</span>
                  <p className="font-medium text-gray-900">
                    {closeDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Country</span>
                  <p className="font-medium text-gray-900">{market.country_filter}</p>
                </div>
                <div>
                  <span className="text-gray-500">Category</span>
                  <p className="font-medium text-gray-900">{market.category}</p>
                </div>
              </div>
            </div>
          )}

          {/* Chart */}
          <MarketChart options={options} />
        </div>

        {/* Right Column - Trading */}
        <div className="space-y-4">
          <TradingInterface
            market={market}
            options={options}
            userBalance={balance}
            userPositions={positions}
            onTrade={handleTrade}
          />

          {/* Your Positions */}
          {Object.keys(positions).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Your Positions</h3>
              <div className="space-y-2">
                {options.map((option) => {
                  const shares = positions[option.id];
                  if (!shares || shares <= 0) return null;
                  return (
                    <div key={option.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{option.label}</div>
                        <div className="text-xs text-gray-500">{shares.toFixed(1)} shares</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">{formatProbability(option.probability)}</div>
                        <div className="text-xs text-emerald-600">Current price</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
