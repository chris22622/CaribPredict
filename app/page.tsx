'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Market, MarketOption, CaricomCountry, CARICOM_COUNTRIES } from '@/lib/types';
import MarketCard from '@/components/MarketCard';
import { TrendingUp, Flame, Globe, ChevronDown, Search, Zap, BarChart3, Bitcoin, ArrowRight } from 'lucide-react';

const CATEGORIES = ['All', 'Politics', 'Sports', 'Economics', 'Entertainment', 'Technology', 'Culture', 'Crypto', 'Weather'];

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center py-20">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-3" />
        <p className="text-sm text-gray-400">Loading markets...</p>
      </div>
    }>
      <HomePageInner />
    </Suspense>
  );
}

function HomePageInner() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketOptions, setMarketOptions] = useState<{ [marketId: string]: MarketOption[] }>({});
  const searchParams = useSearchParams();
  const [selectedCountry, setSelectedCountry] = useState<string>('All CARICOM');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [stats, setStats] = useState({ markets: 0, traders: 0, volume: 0 });

  // Read search query from URL params (from navbar search)
  useEffect(() => {
    const urlSearch = searchParams?.get('search');
    const urlCategory = searchParams?.get('category');
    const urlCountry = searchParams?.get('country');
    if (urlSearch) setSearchQuery(urlSearch);
    if (urlCategory) setSelectedCategory(urlCategory);
    if (urlCountry) setSelectedCountry(urlCountry);
  }, [searchParams]);

  useEffect(() => {
    loadMarkets();
    loadStats();
  }, [selectedCountry, selectedCategory]);

  const loadStats = async () => {
    try {
      const [marketsRes, usersRes, tradesRes] = await Promise.all([
        supabase.from('markets').select('*', { count: 'exact', head: true }).eq('resolved', false),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('trades').select('total_cost'),
      ]);
      setStats({
        markets: marketsRes.count || 0,
        traders: usersRes.count || 0,
        volume: tradesRes.data?.reduce((s, t) => s + (t.total_cost || 0), 0) || 0,
      });
    } catch (e) {}
  };

  const loadMarkets = async () => {
    setLoading(true);
    setError('');
    try {
      let query = supabase
        .from('markets')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false });

      if (selectedCountry !== 'All CARICOM') {
        query = query.eq('country_filter', selectedCountry);
      }
      if (selectedCategory !== 'All') {
        query = query.eq('category', selectedCategory);
      }

      const { data: marketsData, error: marketsError } = await query;
      if (marketsError) throw marketsError;
      setMarkets(marketsData || []);

      if (marketsData && marketsData.length > 0) {
        const marketIds = marketsData.map((m) => m.id);
        const { data: optionsData, error: optionsError } = await supabase
          .from('market_options')
          .select('*')
          .in('market_id', marketIds)
          .order('created_at', { ascending: true });

        if (optionsError) throw optionsError;

        const optionsByMarket: { [key: string]: MarketOption[] } = {};
        optionsData?.forEach((option) => {
          if (!optionsByMarket[option.market_id]) {
            optionsByMarket[option.market_id] = [];
          }
          optionsByMarket[option.market_id].push(option);
        });
        setMarketOptions(optionsByMarket);
      } else {
        setMarketOptions({});
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load markets');
    } finally {
      setLoading(false);
    }
  };

  const filteredMarkets = searchQuery
    ? markets.filter(m => m.question.toLowerCase().includes(searchQuery.toLowerCase()))
    : markets;

  const trendingMarkets = filteredMarkets.slice(0, 6);
  const allMarkets = filteredMarkets;

  const formatVolume = (sats: number) => {
    if (sats >= 1000000) return `${(sats / 1000000).toFixed(1)}M`;
    if (sats >= 1000) return `${(sats / 1000).toFixed(0)}K`;
    return sats.toString();
  };

  const countries = CARICOM_COUNTRIES as readonly string[];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      {/* Hero Section */}
      <div className="py-8 sm:py-12">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Caribbean Prediction Markets
          </h1>
          <p className="text-gray-500 text-base sm:text-lg">
            Trade on real events across all CARICOM nations. Deposit with Bitcoin, earn sats.
          </p>
        </div>

        {/* Stats Bar - only show if there are meaningful stats */}
        {stats.markets > 0 && (
          <div className="flex items-center justify-center gap-6 sm:gap-10 mb-8">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.markets}</div>
              <div className="text-xs text-gray-500">Active Markets</div>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-gray-900">15</div>
              <div className="text-xs text-gray-500">CARICOM Nations</div>
            </div>
            {stats.traders > 0 && (
              <>
                <div className="w-px h-8 bg-gray-200" />
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.traders}</div>
                  <div className="text-xs text-gray-500">Traders</div>
                </div>
              </>
            )}
            {stats.volume > 0 && (
              <>
                <div className="w-px h-8 bg-gray-200" />
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-gray-900">{formatVolume(stats.volume)}</div>
                  <div className="text-xs text-gray-500">Volume (sats)</div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="sticky top-14 bg-[#f7f7f8] z-40 pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Category Tabs */}
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1 w-full sm:w-auto">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Country Dropdown */}
          <div className="relative">
            <button
              onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Globe size={14} />
              {selectedCountry}
              <ChevronDown size={14} />
            </button>
            {countryDropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50 max-h-80 overflow-y-auto animate-fade-in">
                {countries.map((country) => (
                  <button
                    key={country}
                    onClick={() => { setSelectedCountry(country); setCountryDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      selectedCountry === country ? 'bg-gray-50 font-medium text-gray-900' : 'text-gray-600'
                    }`}
                  >
                    {country}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center py-20">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-400">Loading markets...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
          {error}
        </div>
      )}

      {/* Markets */}
      {!loading && !error && (
        <>
          {filteredMarkets.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No markets found</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                {searchQuery
                  ? `No markets matching "${searchQuery}"`
                  : `No active markets for ${selectedCountry}. Check back soon!`}
              </p>
            </div>
          ) : (
            <>
              {/* Trending Section */}
              {trendingMarkets.length > 0 && !searchQuery && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Flame size={18} className="text-orange-500" />
                    <h2 className="text-lg font-bold text-gray-900">Trending</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {trendingMarkets.map((market) => (
                      <MarketCard
                        key={market.id}
                        market={market}
                        options={marketOptions[market.id] || []}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All Markets */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={18} className="text-gray-400" />
                    <h2 className="text-lg font-bold text-gray-900">
                      {searchQuery ? 'Search Results' : 'All Markets'}
                    </h2>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {allMarkets.length}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allMarkets.map((market) => (
                    <MarketCard
                      key={market.id}
                      market={market}
                      options={marketOptions[market.id] || []}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Bottom spacer */}
      <div className="h-12" />
    </div>
  );
}
