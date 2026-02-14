'use client';

import { useState, useEffect } from 'react';
import { Market, MarketOption } from '@/lib/types';
import { calculateBuyCost, calculateSellPayout, formatSatoshis, formatProbability, MarketState } from '@/lib/amm';
import { TrendingUp, TrendingDown, Wallet, Zap, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/layout-client';

interface TradingInterfaceProps {
  market: Market;
  options: MarketOption[];
  userBalance: number;
  userPositions: { [optionId: string]: number };
  onTrade: (optionId: string, tradeType: 'buy' | 'sell', shares: number, cost: number) => Promise<void>;
}

export default function TradingInterface({
  market,
  options,
  userBalance,
  userPositions,
  onTrade,
}: TradingInterfaceProps) {
  const { user, openAuth } = useAuth();
  const [selectedOptionId, setSelectedOptionId] = useState<string>(options[0]?.id || '');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [shares, setShares] = useState('10');
  const [quote, setQuote] = useState<{ price: number; cost: number; newProbability: number } | null>(null);
  const [isTrading, setIsTrading] = useState(false);
  const [error, setError] = useState('');

  // For binary markets, determine Yes/No
  const isBinary = options.length === 2;
  const yesOption = isBinary ? options.find(o => o.label.toLowerCase() === 'yes') || options[0] : null;
  const noOption = isBinary ? options.find(o => o.label.toLowerCase() === 'no') || options[1] : null;
  const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no'>('yes');

  useEffect(() => {
    if (!selectedOptionId && options.length > 0) {
      setSelectedOptionId(options[0].id);
    }
  }, [options, selectedOptionId]);

  // For binary: sync selectedOptionId with outcome
  useEffect(() => {
    if (isBinary) {
      if (selectedOutcome === 'yes' && yesOption) {
        setSelectedOptionId(yesOption.id);
      } else if (selectedOutcome === 'no' && noOption) {
        setSelectedOptionId(noOption.id);
      }
    }
  }, [selectedOutcome, isBinary, yesOption, noOption]);

  // Calculate quote
  useEffect(() => {
    const sharesNum = parseFloat(shares);
    if (isNaN(sharesNum) || sharesNum <= 0 || !selectedOptionId) {
      setQuote(null);
      return;
    }

    const selectedIndex = options.findIndex(opt => opt.id === selectedOptionId);
    if (selectedIndex === -1) {
      setQuote(null);
      return;
    }

    const marketState: MarketState = {
      shares: options.map((opt) => opt.total_shares),
      liquidityParameter: market.liquidity_parameter,
    };

    try {
      if (tradeType === 'buy') {
        const result = calculateBuyCost(marketState, selectedIndex, sharesNum);
        setQuote(result);
      } else {
        const result = calculateSellPayout(marketState, selectedIndex, sharesNum);
        setQuote(result);
      }
      setError('');
    } catch (err) {
      setQuote(null);
      setError('Error calculating price');
    }
  }, [shares, selectedOptionId, tradeType, options, market.liquidity_parameter]);

  const handleTrade = async () => {
    if (!user) {
      openAuth();
      return;
    }

    if (!quote || !selectedOptionId) return;

    const sharesNum = parseFloat(shares);
    const userShares = userPositions[selectedOptionId] || 0;

    if (tradeType === 'buy' && quote.cost > userBalance) {
      toast.error('Insufficient balance. Deposit more sats to trade.');
      return;
    }

    if (tradeType === 'sell' && sharesNum > userShares) {
      toast.error(`You only have ${userShares.toFixed(1)} shares`);
      return;
    }

    setIsTrading(true);
    setError('');

    try {
      await onTrade(selectedOptionId, tradeType, sharesNum, quote.cost);
      toast.success(
        `${tradeType === 'buy' ? 'Bought' : 'Sold'} ${sharesNum} shares for ${formatSatoshis(quote.cost)}`
      );
      setShares('10');
    } catch (err: any) {
      const errorMsg = err.message || 'Trade failed';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsTrading(false);
    }
  };

  const selectedOption = options.find(opt => opt.id === selectedOptionId);
  const potentialReturn = quote && tradeType === 'buy' ? parseFloat(shares) - quote.cost : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 sticky top-20">
      {/* Buy/Sell Toggle */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setTradeType('buy')}
          className={`flex-1 py-3 text-sm font-semibold text-center transition-all ${
            tradeType === 'buy'
              ? 'text-emerald-600 border-b-2 border-emerald-500'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setTradeType('sell')}
          className={`flex-1 py-3 text-sm font-semibold text-center transition-all ${
            tradeType === 'sell'
              ? 'text-red-600 border-b-2 border-red-500'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Sell
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Outcome Selection */}
        {isBinary ? (
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedOutcome('yes')}
              className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                selectedOutcome === 'yes'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Yes {yesOption ? `${Math.round(yesOption.probability * 100)}\u00A2` : ''}
            </button>
            <button
              onClick={() => setSelectedOutcome('no')}
              className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                selectedOutcome === 'no'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              }`}
            >
              No {noOption ? `${Math.round(noOption.probability * 100)}\u00A2` : ''}
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Outcome</label>
            <div className="space-y-1">
              {options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedOptionId(option.id)}
                  className={`w-full p-3 rounded-lg text-left transition-all text-sm ${
                    selectedOptionId === option.id
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{option.label}</span>
                    <span className="font-bold text-gray-900">{formatProbability(option.probability)}</span>
                  </div>
                  {userPositions[option.id] > 0 && (
                    <div className="text-xs text-emerald-600 mt-1">
                      You own {userPositions[option.id].toFixed(1)} shares
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Shares</label>
          <div className="relative mt-1.5">
            <input
              type="number"
              min="1"
              step="1"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              placeholder="0"
            />
          </div>
          <div className="flex gap-1.5 mt-2">
            {[10, 25, 50, 100].map((amount) => (
              <button
                key={amount}
                onClick={() => setShares(amount.toString())}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  shares === amount.toString()
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {amount}
              </button>
            ))}
          </div>
        </div>

        {/* Quote */}
        {quote && selectedOption && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Avg price</span>
              <span className="font-medium text-gray-900">{formatProbability(quote.price)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">
                {tradeType === 'buy' ? 'Total cost' : 'You receive'}
              </span>
              <span className="font-bold text-gray-900">{formatSatoshis(quote.cost)}</span>
            </div>
            {tradeType === 'buy' && potentialReturn > 0 && (
              <div className="flex justify-between text-xs pt-2 border-t border-gray-200">
                <span className="text-gray-500">Potential return</span>
                <span className="font-medium text-emerald-600">+{formatSatoshis(potentialReturn)}</span>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {/* Trade Button */}
        {user ? (
          <button
            onClick={handleTrade}
            disabled={!quote || isTrading || !selectedOptionId}
            className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${
              !quote || isTrading || !selectedOptionId
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : tradeType === 'buy'
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:shadow'
                : 'bg-red-500 hover:bg-red-600 text-white shadow-sm hover:shadow'
            }`}
          >
            {isTrading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              tradeType === 'buy' ? 'Buy' : 'Sell'
            )}
          </button>
        ) : (
          <button
            onClick={openAuth}
            className="w-full py-3 rounded-lg font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white transition-all"
          >
            Sign up to trade
          </button>
        )}

        {/* Balance */}
        {user && (
          <div className="text-center text-xs text-gray-400">
            Balance: {formatSatoshis(userBalance)}
          </div>
        )}
      </div>
    </div>
  );
}
