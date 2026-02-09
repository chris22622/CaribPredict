'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Market, MarketOption, CaricomCountry } from '@/lib/types';
import MarketCard from '@/components/MarketCard';
import CountryFilter from '@/components/CountryFilter';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketOptions, setMarketOptions] = useState<{ [marketId: string]: MarketOption[] }>({});
  const [selectedCountry, setSelectedCountry] = useState<CaricomCountry>('All CARICOM');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMarkets();
  }, [selectedCountry]);

  const loadMarkets = async () => {
    setLoading(true);
    setError('');

    try {
      // Build query
      let query = supabase
        .from('markets')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // Filter by country if not "All CARICOM"
      if (selectedCountry !== 'All CARICOM') {
        query = query.eq('country', selectedCountry);
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
          .order('option_index', { ascending: true });

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

  return (
    <div>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-caribbean-blue to-caribbean-teal text-white rounded-lg p-8 mb-6 shadow-lg">
        <h2 className="text-3xl font-bold mb-2">Welcome to CaribPredict</h2>
        <p className="text-lg opacity-90">
          Trade predictions on Caribbean events. Put your satoshis where your predictions are.
        </p>
      </div>

      {/* Country Filter */}
      <CountryFilter selected={selectedCountry} onChange={setSelectedCountry} />

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="animate-spin text-caribbean-blue" size={48} />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Markets Grid */}
      {!loading && !error && (
        <>
          {markets.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600 text-lg">
                No active markets found for {selectedCountry}.
              </p>
              <p className="text-gray-500 mt-2">Check back soon for new prediction markets!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {markets.map((market) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  options={marketOptions[market.id] || []}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
