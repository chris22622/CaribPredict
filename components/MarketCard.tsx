'use client';

import Link from 'next/link';
import { Market, MarketOption } from '@/lib/types';
import { formatProbability, formatSatoshis } from '@/lib/amm';
import { TrendingUp, Calendar, MapPin } from 'lucide-react';

interface MarketCardProps {
  market: Market;
  options: MarketOption[];
}

export default function MarketCard({ market, options }: MarketCardProps) {
  const closeDate = new Date(market.close_date);
  const isClosingSoon = closeDate.getTime() - Date.now() < 24 * 60 * 60 * 1000; // 24 hours

  return (
    <Link href={`/market/${market.id}`}>
      <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 p-5 cursor-pointer border-l-4 border-caribbean-teal">
        {/* Market Question */}
        <h3 className="text-lg font-semibold text-caribbean-navy mb-3 line-clamp-2">
          {market.question}
        </h3>

        {/* Country & Category */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <MapPin size={16} className="text-caribbean-coral" />
            <span>{market.country}</span>
          </div>
          <div className="px-2 py-1 bg-caribbean-sand rounded text-xs font-medium">
            {market.category}
          </div>
        </div>

        {/* Options with Probabilities */}
        <div className="space-y-2 mb-4">
          {options.slice(0, 2).map((option) => (
            <div key={option.id} className="flex justify-between items-center">
              <span className="text-sm text-gray-700">{option.option_text}</span>
              <span className="text-lg font-bold text-caribbean-blue">
                {formatProbability(option.current_probability)}
              </span>
            </div>
          ))}
          {options.length > 2 && (
            <div className="text-xs text-gray-500">+{options.length - 2} more options</div>
          )}
        </div>

        {/* Market Stats */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-200">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <TrendingUp size={16} className="text-caribbean-green" />
            <span>{formatSatoshis(market.total_volume)}</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Calendar size={16} className={isClosingSoon ? 'text-caribbean-coral' : 'text-gray-500'} />
            <span className={isClosingSoon ? 'text-caribbean-coral font-medium' : 'text-gray-600'}>
              {isClosingSoon ? 'Closing soon' : closeDate.toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
