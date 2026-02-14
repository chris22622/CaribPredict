'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Market, MarketOption } from '@/lib/types';
import MarketCard from '@/components/MarketCard';
import { Bookmark, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/app/layout-client';

export default function WatchlistPage() {
  const { user, openAuth } = useAuth();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketOptions, setMarketOptions] = useState<{ [marketId: string]: MarketOption[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadWatchlist = async () => {
      try {
        // Get bookmarked market IDs
        const { data: bookmarks, error: bookmarkError } = await supabase
          .from('bookmarks')
          .select('market_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (bookmarkError) throw bookmarkError;
        if (!bookmarks || bookmarks.length === 0) {
          setMarkets([]);
          setLoading(false);
          return;
        }

        const marketIds = bookmarks.map(b => b.market_id);

        // Load markets
        const { data: marketsData, error: marketsError } = await supabase
          .from('markets')
          .select('*')
          .in('id', marketIds);

        if (marketsError) throw marketsError;
        setMarkets(marketsData || []);

        // Load options
        if (marketsData && marketsData.length > 0) {
          const { data: optionsData } = await supabase
            .from('market_options')
            .select('*')
            .in('market_id', marketIds)
            .order('created_at', { ascending: true });

          const optionsByMarket: { [key: string]: MarketOption[] } = {};
          optionsData?.forEach(option => {
            if (!optionsByMarket[option.market_id]) {
              optionsByMarket[option.market_id] = [];
            }
            optionsByMarket[option.market_id].push(option);
          });
          setMarketOptions(optionsByMarket);
        }
      } catch (err) {
        console.error('Error loading watchlist:', err);
      } finally {
        setLoading(false);
      }
    };

    loadWatchlist();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bookmark size={24} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign in to view your watchlist</h3>
          <p className="text-sm text-gray-500 mb-4">Save markets you want to follow</p>
          <button
            onClick={openAuth}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm mb-4 transition-colors">
        <ArrowLeft size={16} />
        <span>Markets</span>
      </Link>

      <div className="flex items-center gap-2 mb-6">
        <Bookmark size={20} className="text-yellow-500" />
        <h1 className="text-xl font-bold text-gray-900">Watchlist</h1>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {markets.length}
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-20">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-400">Loading watchlist...</p>
        </div>
      ) : markets.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bookmark size={24} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No saved markets</h3>
          <p className="text-sm text-gray-500">Bookmark markets to add them to your watchlist</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {markets.map(market => (
            <MarketCard
              key={market.id}
              market={market}
              options={marketOptions[market.id] || []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
