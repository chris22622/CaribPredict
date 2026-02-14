'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Market, MarketOption } from '@/lib/types';
import MarketCard from '@/components/MarketCard';
import { Sparkles } from 'lucide-react';

interface RelatedMarketsProps {
  currentMarketId: string;
  category: string;
  country: string;
  limit?: number;
}

export default function RelatedMarkets({
  currentMarketId,
  category,
  country,
  limit = 3,
}: RelatedMarketsProps) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketOptions, setMarketOptions] = useState<{ [marketId: string]: MarketOption[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRelatedMarkets();
  }, [currentMarketId, category, country]);

  const loadRelatedMarkets = async () => {
    setLoading(true);
    try {
      // Find markets with same category or same country (excluding current market)
      const { data: marketsData, error: marketsError } = await supabase
        .from('markets')
        .select('*')
        .eq('resolved', false)
        .neq('id', currentMarketId)
        .or(`category.eq.${category},country_filter.eq.${country}`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (marketsError) throw marketsError;

      setMarkets(marketsData || []);

      // Load options for related markets
      if (marketsData && marketsData.length > 0) {
        const marketIds = marketsData.map((m) => m.id);
        const { data: optionsData, error: optionsError } = await supabase
          .from('market_options')
          .select('*')
          .in('market_id', marketIds);

        if (optionsError) throw optionsError;

        // Group by market_id
        const optionsByMarket: { [key: string]: MarketOption[] } = {};
        optionsData?.forEach((option) => {
          if (!optionsByMarket[option.market_id]) {
            optionsByMarket[option.market_id] = [];
          }
          optionsByMarket[option.market_id].push(option);
        });

        setMarketOptions(optionsByMarket);
      }
    } catch (error) {
      console.error('Error loading related markets:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-caribbean-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={20} className="text-caribbean-blue" />
          <h2 className="text-lg font-bold text-caribbean-navy">Related Markets</h2>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-caribbean-gray-200 border-t-caribbean-blue"></div>
        </div>
      </div>
    );
  }

  if (markets.length === 0) {
    return null; // Don't show section if no related markets
  }

  return (
    <div className="bg-white rounded-xl border border-caribbean-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={20} className="text-caribbean-blue" />
        <h2 className="text-lg font-bold text-caribbean-navy">Related Markets</h2>
      </div>
      <div className="space-y-4">
        {markets.map((market) => (
          <MarketCard
            key={market.id}
            market={market}
            options={marketOptions[market.id] || []}
            compact
          />
        ))}
      </div>
    </div>
  );
}
