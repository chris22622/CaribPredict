'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Market, MarketOption, CaricomCountry } from '@/lib/types';
import MarketCard from '@/components/MarketCard';
import CountryFilter from '@/components/CountryFilter';
import PlatformStats from '@/components/PlatformStats';
import { TrendingUp, Flame } from 'lucide-react';

const CATEGORIES = ['All', 'Politics', 'Sports', 'Economics', 'Entertainment', 'Technology', 'Culture'];

export default function HomePage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketOptions, setMarketOptions] = useState<{ [marketId: string]: MarketOption[] }>({});
  const [selectedCountry, setSelectedCountry] = useState<CaricomCountry>('All CARICOM');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'hot' | 'all'>('hot');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMarkets();
  }, [selectedCountry, selectedCategory]);

  const loadMarkets = async () => {
    setLoading(true);
    setError('');

    try {
      // Build query
      let query = supabase
        .from('markets')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false });

      // Filter by country if not "All CARICOM"
      if (selectedCountry !== 'All CARICOM') {
        query = query.eq('country_filter', selectedCountry);
      }

      // Filter by category if not "All"
      if (selectedCategory !== 'All') {
        query = query.eq('category', selectedCategory);
      }

      const { data: marketsData, error: marketsError } = await query;

      if (marketsError) throw marketsError;

      setMarkets(marketsData || []);

      // Load options for each market
      if (marketsData && marketsData.length > 0) {
        const marketIds = marketsData.map((m) => m.id);
        const { data: optionsData, error: optionsError } = await supabase
          .from('market_options')
          .select('*')
          .in('market_id', marketIds)
          .order('created_at', { ascending: true });

        if (optionsError) throw optionsError;

        // Group options by market_id
        const optionsByMarket: { [key: string]: MarketOption[] } = {};
        optionsData?.forEach((option) => {
          if (!optionsByMarket[option.market_id]) {
            optionsByMarket[option.market_id] = [];
          }
          optionsByMarket[option.market_id].push(option);
        });

        setMarketOptions(optionsByMarket);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load markets');
    } finally {
      setLoading(false);
    }
  };

  // Get hot markets (for demo, just show newest 6)
  const hotMarkets = markets.slice(0, 6);
  const displayedMarkets = activeTab === 'hot' ? hotMarkets : markets;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-caribbean-navy mb-2">
          Caribbean Prediction Markets
        </h1>
        <p className="text-caribbean-gray-600">
          Trade on outcomes you care about. Make informed predictions on Caribbean events.
        </p>
      </div>

      {/* Platform Stats */}
      <PlatformStats />

      {/* Tabs & Filters */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('hot')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'hot'
                  ? 'bg-caribbean-blue text-white'
                  : 'bg-white text-caribbean-gray-700 border border-caribbean-gray-200 hover:bg-caribbean-gray-50'
              }`}
            >
              <Flame size={18} />
              Hot Markets
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-caribbean-blue text-white'
                  : 'bg-white text-caribbean-gray-700 border border-caribbean-gray-200 hover:bg-caribbean-gray-50'
              }`}
            >
              <TrendingUp size={18} />
              All Markets
            </button>
          </div>

          {/* Country Filter */}
          <CountryFilter selected={selectedCountry} onChange={setSelectedCountry} />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-caribbean-teal text-white'
                  : 'bg-white text-caribbean-gray-700 border border-caribbean-gray-200 hover:bg-caribbean-gray-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-caribbean-gray-200 border-t-caribbean-blue mb-4"></div>
          <p className="text-caribbean-gray-500">Loading markets...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          <p className="font-medium">Error loading markets</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Markets Grid */}
      {!loading && !error && (
        <>
          {displayedMarkets.length === 0 ? (
            <div className="bg-white rounded-xl border border-caribbean-gray-200 p-12 text-center">
              <div className="max-w-md mx-auto">
                <TrendingUp size={48} className="text-caribbean-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-caribbean-navy mb-2">
                  No markets found
                </h3>
                <p className="text-caribbean-gray-600">
                  No active markets for {selectedCountry}. Check back soon for new prediction markets!
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedMarkets.map((market) => (
                  <MarketCard
                    key={market.id}
                    market={market}
                    options={marketOptions[market.id] || []}
                  />
                ))}
              </div>

              {activeTab === 'hot' && markets.length > 6 && (
                <div className="text-center mt-8">
                  <button
                    onClick={() => setActiveTab('all')}
                    className="px-6 py-3 bg-white border border-caribbean-gray-200 text-caribbean-navy font-medium rounded-lg hover:bg-caribbean-gray-50 transition-colors"
                  >
                    View All Markets
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
