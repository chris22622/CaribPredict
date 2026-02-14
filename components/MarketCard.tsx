'use client';

import Link from 'next/link';
import { Market, MarketOption } from '@/lib/types';
import { formatProbability } from '@/lib/amm';
import { Clock, TrendingUp } from 'lucide-react';

interface MarketCardProps {
  market: Market;
  options: MarketOption[];
  compact?: boolean;
}

export default function MarketCard({ market, options, compact = false }: MarketCardProps) {
  const closeDate = new Date(market.close_date);
  const now = new Date();
  const msLeft = closeDate.getTime() - now.getTime();
  const hoursLeft = msLeft / (1000 * 60 * 60);
  const daysLeft = Math.floor(hoursLeft / 24);
  const isClosingSoon = hoursLeft < 24 && hoursLeft > 0;
  const isClosed = msLeft <= 0;

  const isBinary = options.length === 2;
  const yesOption = isBinary ? options.find(o => o.label.toLowerCase() === 'yes') || options[0] : null;
  const noOption = isBinary ? options.find(o => o.label.toLowerCase() === 'no') || options[1] : null;

  const getTimeLabel = () => {
    if (isClosed) return 'Closed';
    if (hoursLeft < 1) return `${Math.max(1, Math.floor(hoursLeft * 60))}m left`;
    if (hoursLeft < 24) return `${Math.floor(hoursLeft)}h left`;
    if (daysLeft < 7) return `${daysLeft}d left`;
    return closeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Politics: 'bg-blue-50 text-blue-700',
      Sports: 'bg-green-50 text-green-700',
      Economics: 'bg-yellow-50 text-yellow-700',
      Entertainment: 'bg-purple-50 text-purple-700',
      Technology: 'bg-cyan-50 text-cyan-700',
      Culture: 'bg-pink-50 text-pink-700',
      Crypto: 'bg-orange-50 text-orange-700',
      Weather: 'bg-sky-50 text-sky-700',
    };
    return colors[category] || 'bg-gray-50 text-gray-700';
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
      'Dominica': '\u{1F1E9}\u{1F1F2}',
      'Grenada': '\u{1F1EC}\u{1F1E9}',
      'Haiti': '\u{1F1ED}\u{1F1F9}',
      'Saint Lucia': '\u{1F1F1}\u{1F1E8}',
      'Saint Vincent and the Grenadines': '\u{1F1FB}\u{1F1E8}',
      'Antigua and Barbuda': '\u{1F1E6}\u{1F1EC}',
      'Saint Kitts and Nevis': '\u{1F1F0}\u{1F1F3}',
      'Montserrat': '\u{1F1F2}\u{1F1F8}',
    };
    return flags[country] || '\u{1F334}';
  };

  return (
    <Link href={`/market/${market.id}`}>
      <div className={`bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-card-hover transition-all duration-200 cursor-pointer group ${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${getCategoryColor(market.category)}`}>
              {market.category}
            </span>
            <span className="text-xs text-gray-400">
              {getCountryFlag(market.country_filter)} {market.country_filter}
            </span>
          </div>
          <span className={`text-xs font-medium flex items-center gap-1 ${
            isClosingSoon ? 'text-red-500' : isClosed ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <Clock size={12} />
            {getTimeLabel()}
          </span>
        </div>

        <h3 className="text-sm font-semibold text-gray-900 mb-3 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
          {market.question}
        </h3>

        {isBinary && yesOption && noOption ? (
          <div className="flex gap-2">
            <div className="flex-1 flex items-center justify-between px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
              <span className="text-xs font-medium text-emerald-700">Yes</span>
              <span className="text-sm font-bold text-emerald-700">
                {Math.round(yesOption.probability * 100)}¢
              </span>
            </div>
            <div className="flex-1 flex items-center justify-between px-3 py-2 bg-red-50 rounded-lg border border-red-100">
              <span className="text-xs font-medium text-red-600">No</span>
              <span className="text-sm font-bold text-red-600">
                {Math.round(noOption.probability * 100)}¢
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {options.slice(0, 3).map((option) => (
              <div key={option.id} className="flex items-center justify-between">
                <span className="text-xs text-gray-600 truncate mr-2">{option.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${option.probability * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-900 w-8 text-right">
                    {formatProbability(option.probability)}
                  </span>
                </div>
              </div>
            ))}
            {options.length > 3 && (
              <p className="text-xs text-gray-400">+{options.length - 3} more options</p>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <TrendingUp size={11} />
            {options.reduce((sum, o) => sum + o.total_shares, 0) > 0
              ? `${options.reduce((sum, o) => sum + o.total_shares, 0).toLocaleString()} shares`
              : 'New market'}
          </span>
        </div>
      </div>
    </Link>
  );
}
