'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Market, MarketOption } from '@/lib/types';
import { formatProbability } from '@/lib/amm';
import { Clock, TrendingUp, Flame, Sparkles, Radio } from 'lucide-react';
import { getMarketImageUrl, CATEGORY_GRADIENTS, CATEGORY_ICONS } from '@/lib/market-images';

interface MarketCardProps {
  market: Market;
  options: MarketOption[];
  compact?: boolean;
}

export default function MarketCard({ market, options, compact = false }: MarketCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

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

  // Badge logic
  const createdAt = new Date(market.created_at);
  const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  const isNew = hoursSinceCreated < 48;
  const totalShares = options.reduce((sum, o) => sum + o.total_shares, 0);
  const isTrending = totalShares > 50;
  const isLive = !isClosed && hoursLeft < 24 && hoursLeft > 0;

  const getTimeLabel = () => {
    if (isClosed) return 'Closed';
    if (hoursLeft < 1) return `${Math.max(1, Math.floor(hoursLeft * 60))}m left`;
    if (hoursLeft < 24) return `${Math.floor(hoursLeft)}h left`;
    if (daysLeft < 7) return `${daysLeft}d left`;
    return closeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Politics: 'bg-blue-50/90 text-blue-700 border-blue-200/50',
      Sports: 'bg-green-50/90 text-green-700 border-green-200/50',
      Economics: 'bg-yellow-50/90 text-yellow-700 border-yellow-200/50',
      Entertainment: 'bg-purple-50/90 text-purple-700 border-purple-200/50',
      Technology: 'bg-cyan-50/90 text-cyan-700 border-cyan-200/50',
      Culture: 'bg-pink-50/90 text-pink-700 border-pink-200/50',
      Crypto: 'bg-orange-50/90 text-orange-700 border-orange-200/50',
      Weather: 'bg-sky-50/90 text-sky-700 border-sky-200/50',
    };
    return colors[category] || 'bg-gray-50/90 text-gray-700 border-gray-200/50';
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

  const imageUrl = getMarketImageUrl(market.id, market.category, market.country_filter, market.question);
  const gradient = CATEGORY_GRADIENTS[market.category] || 'from-gray-600 to-gray-800';

  return (
    <Link href={`/market/${market.id}`}>
      <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-card-hover transition-all duration-200 cursor-pointer group overflow-hidden">
        {/* AI-Generated Image Header */}
        <div className="relative h-36 w-full overflow-hidden">
          {/* Gradient placeholder (always visible behind image) */}
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            {!imgLoaded && !imgError && (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
            )}
            {imgError && (
              <span className="text-4xl opacity-40">{CATEGORY_ICONS[market.category] || '\u{1F30E}'}</span>
            )}
          </div>
          {!imgError && (
            <img
              src={imageUrl}
              alt=""
              className={`absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onError={() => setImgError(true)}
              onLoad={() => setImgLoaded(true)}
              loading="lazy"
            />
          )}
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Badges on image */}
          <div className="absolute top-2.5 left-2.5 flex gap-1.5">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold backdrop-blur-sm border ${getCategoryColor(market.category)}`}>
              {market.category}
            </span>
            {isLive && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500/90 text-white text-[10px] font-bold rounded-md backdrop-blur-sm">
                <Radio size={9} className="animate-pulse" /> LIVE
              </span>
            )}
            {isTrending && !isLive && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/90 text-white text-[10px] font-bold rounded-md backdrop-blur-sm">
                <Flame size={9} /> HOT
              </span>
            )}
            {isNew && !isTrending && !isLive && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/90 text-white text-[10px] font-bold rounded-md backdrop-blur-sm">
                <Sparkles size={9} /> NEW
              </span>
            )}
          </div>

          {/* Country + Time on image bottom */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
            <span className="text-[11px] text-white/90 font-medium drop-shadow-sm">
              {getCountryFlag(market.country_filter)} {market.country_filter}
            </span>
            <span className={`text-[11px] font-medium flex items-center gap-1 drop-shadow-sm ${
              isClosingSoon ? 'text-red-300' : isClosed ? 'text-gray-300' : 'text-white/80'
            }`}>
              <Clock size={11} />
              {getTimeLabel()}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className={compact ? 'p-3' : 'p-4'}>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
            {market.question}
          </h3>

          {isBinary && yesOption && noOption ? (
            <div className="flex gap-2">
              <div className="flex-1 flex items-center justify-between px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                <span className="text-xs font-medium text-emerald-700">Yes</span>
                <span className="text-sm font-bold text-emerald-700">
                  {Math.round(yesOption.probability * 100)}&cent;
                </span>
              </div>
              <div className="flex-1 flex items-center justify-between px-3 py-2 bg-red-50 rounded-lg border border-red-100">
                <span className="text-xs font-medium text-red-600">No</span>
                <span className="text-sm font-bold text-red-600">
                  {Math.round(noOption.probability * 100)}&cent;
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

          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <TrendingUp size={11} />
              {totalShares > 0
                ? `${totalShares.toLocaleString()} shares`
                : 'New market'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
