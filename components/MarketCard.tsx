'use client';

import Link from 'next/link';
import { Market, MarketOption } from '@/lib/types';
import { formatProbability } from '@/lib/amm';
import { Clock, MapPin } from 'lucide-react';
import CategoryBadge from './CategoryBadge';
import ProbabilityBar from './ProbabilityBar';

interface MarketCardProps {
  market: Market;
  options: MarketOption[];
  compact?: boolean;
}

export default function MarketCard({ market, options, compact = false }: MarketCardProps) {
  const closeDate = new Date(market.close_date);
  const isClosingSoon = closeDate.getTime() - Date.now() < 24 * 60 * 60 * 1000; // 24 hours

  // Get the top option (highest probability)
  const topOption = options.length > 0
    ? options.reduce((max, opt) => opt.probability > max.probability ? opt : max, options[0])
    : null;

  return (
    <Link href={`/market/${market.id}`}>
      <div className={`bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer border border-caribbean-gray-200 hover:border-caribbean-blue group ${compact ? 'p-3' : 'p-5'}`}>
        {/* Header: Category Badge */}
        <div className="flex items-start justify-between mb-3">
          <CategoryBadge category={market.category} />
          {isClosingSoon && (
            <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs font-medium rounded-full flex items-center gap-1">
              <Clock size={12} />
              Closing soon
            </span>
          )}
        </div>

        {/* Market Question */}
        <h3 className="text-base font-semibold text-caribbean-navy mb-3 line-clamp-2 group-hover:text-caribbean-blue transition-colors">
          {market.question}
        </h3>

        {/* Top Option with Probability Bar */}
        {topOption && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-caribbean-gray-600">{topOption.label}</span>
              <span className="text-2xl font-bold text-caribbean-navy">
                {formatProbability(topOption.probability)}
              </span>
            </div>
            <ProbabilityBar probability={topOption.probability} showPercentage={false} />
          </div>
        )}

        {/* Multiple Options Display */}
        {options.length > 2 && (
          <div className="mb-4 space-y-1">
            {options.slice(0, 2).map((option) => (
              <div key={option.id} className="flex justify-between items-center">
                <span className="text-xs text-caribbean-gray-600">{option.label}</span>
                <span className="text-sm font-semibold text-caribbean-navy">
                  {formatProbability(option.probability)}
                </span>
              </div>
            ))}
            {options.length > 2 && (
              <p className="text-xs text-caribbean-gray-500 pt-1">+{options.length - 2} more</p>
            )}
          </div>
        )}

        {/* Footer: Location & Close Date */}
        <div className="flex items-center justify-between pt-3 border-t border-caribbean-gray-100 text-xs text-caribbean-gray-500">
          <div className="flex items-center gap-1">
            <MapPin size={14} />
            <span>{market.country_filter}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>{closeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
