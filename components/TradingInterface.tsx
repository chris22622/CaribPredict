'use client';

import { useState, useEffect } from 'react';
import { Market, MarketOption } from '@/lib/types';
import { calculateBuyCost, calculateSellPayout, formatSatoshis, formatProbability, MarketState } from '@/lib/amm';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { toast } from 'sonner';

interface TradingInterfaceProps {
  market: Market;
  options: MarketOption[];
  userBalance: number;
  userPositions: { [optionId: string]: number }; // optionId -> shares owned
  onTrade: (optionId: string, tradeType: 'buy' | 'sell', shares: number, cost: number) => Promise<void>;
}

export default function TradingInterface({
  market,
  options,
  userBalance,
  userPositions,
  onTrade,
}: TradingInterfaceProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string>(options[0]?.id || '');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [shares, setShares] = useState('10');
  const [quote, setQuote] = useState<{ price: number; cost: number; newProbability: number } | null>(null);
  const [isTrading, setIsTrading] = useState(false);
  const [error, setError] = useState('');

  // Set default selected option when options load
  useEffect(() => {
    if (!selectedOptionId && options.length > 0) {
      setSelectedOptionId(options[0].id);
    }
  }, [options, selectedOptionId]);

  // Calculate quote when inputs change
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
    if (!quote || !selectedOptionId) return;

    const sharesNum = parseFloat(shares);
    const userShares = userPositions[selectedOptionId] || 0;

    // Validation
    if (tradeType === 'buy' && quote.cost > userBalance) {
      setError('Insufficient balance');
      toast.error('Insufficient balance');
      return;
    }

    if (tradeType === 'sell' && sharesNum > userShares) {
      setError(`You only have ${userShares.toFixed(2)} shares`);
      toast.error(`You only have ${userShares.toFixed(2)} shares`);
      return;
    }

    setIsTrading(true);
    setError('');

    try {
      await onTrade(selectedOptionId, tradeType, sharesNum, quote.cost);
      toast.success(
        `Successfully ${tradeType === 'buy' ? 'bought' : 'sold'} ${sharesNum} shares for ${formatSatoshis(quote.cost)}`
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

  return (
    <div className="bg-white rounded-xl border border-caribbean-gray-200 p-6 sticky top-6">
      {/* Header with Balance */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-caribbean-navy">Trade</h3>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-caribbean-sand rounded-lg">
          <Wallet size={16} className="text-caribbean-gray-600" />
          <span className="text-sm font-semibold text-caribbean-navy">
            {formatSatoshis(userBalance)}
          </span>
        </div>
      </div>

      {/* Buy/Sell Toggle */}
      <div className="flex gap-2 mb-6 p-1 bg-caribbean-gray-100 rounded-lg">
        <button
          onClick={() => setTradeType('buy')}
          className={`flex-1 py-2.5 px-4 rounded-md font-semibold transition-all ${
            tradeType === 'buy'
              ? 'bg-white text-caribbean-green shadow-sm'
              : 'text-caribbean-gray-600 hover:text-caribbean-navy'
          }`}
        >
          <TrendingUp className="inline mr-2" size={18} />
          Buy
        </button>
        <button
          onClick={() => setTradeType('sell')}
          className={`flex-1 py-2.5 px-4 rounded-md font-semibold transition-all ${
            tradeType === 'sell'
              ? 'bg-white text-caribbean-coral shadow-sm'
              : 'text-caribbean-gray-600 hover:text-caribbean-navy'
          }`}
        >
          <TrendingDown className="inline mr-2" size={18} />
          Sell
        </button>
      </div>

      {/* Option Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-caribbean-gray-700 mb-3">Outcome</label>
        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedOptionId(option.id)}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                selectedOptionId === option.id
                  ? 'border-caribbean-blue bg-blue-50'
                  : 'border-caribbean-gray-200 hover:border-caribbean-gray-300 hover:bg-caribbean-gray-50'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-caribbean-navy">{option.label}</span>
                <span className="text-lg font-bold text-caribbean-blue">
                  {formatProbability(option.probability)}
                </span>
              </div>
              {userPositions[option.id] > 0 && (
                <div className="text-xs text-caribbean-green font-medium">
                  You own {userPositions[option.id].toFixed(2)} shares
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Shares Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-caribbean-gray-700 mb-3">Amount</label>
        <div className="relative">
          <input
            type="number"
            min="1"
            step="1"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            className="w-full px-4 py-3 border-2 border-caribbean-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-caribbean-blue focus:border-transparent text-lg font-semibold"
            placeholder="Enter shares"
          />
          <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-caribbean-gray-500 text-sm">
            shares
          </span>
        </div>
        <div className="flex gap-2 mt-2">
          {[10, 25, 50, 100].map((amount) => (
            <button
              key={amount}
              onClick={() => setShares(amount.toString())}
              className="flex-1 px-2 py-1.5 text-xs font-medium text-caribbean-gray-600 border border-caribbean-gray-200 rounded hover:bg-caribbean-gray-50 transition-colors"
            >
              {amount}
            </button>
          ))}
        </div>
      </div>

      {/* Quote Display */}
      {quote && selectedOption && (
        <div className="bg-caribbean-sand border border-caribbean-gray-200 rounded-lg p-4 mb-6 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-caribbean-gray-600">Avg price</span>
            <span className="font-semibold text-caribbean-navy">{formatProbability(quote.price)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-caribbean-gray-700 font-medium">
              {tradeType === 'buy' ? 'Total cost' : 'You receive'}
            </span>
            <span className="text-lg font-bold text-caribbean-navy">{formatSatoshis(quote.cost)}</span>
          </div>
          <div className="pt-3 border-t border-caribbean-gray-200">
            <div className="flex justify-between items-center text-sm">
              <span className="text-caribbean-gray-600">New probability</span>
              <span className={`font-semibold ${
                quote.newProbability > selectedOption.probability ? 'text-caribbean-green' : 'text-caribbean-coral'
              }`}>
                {formatProbability(quote.newProbability)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Trade Button */}
      <button
        onClick={handleTrade}
        disabled={!quote || isTrading || !selectedOptionId}
        className={`w-full py-3.5 px-4 rounded-lg font-bold text-white transition-all ${
          !quote || isTrading || !selectedOptionId
            ? 'bg-caribbean-gray-300 cursor-not-allowed'
            : tradeType === 'buy'
            ? 'bg-caribbean-green hover:bg-caribbean-green/90 shadow-sm hover:shadow'
            : 'bg-caribbean-coral hover:bg-caribbean-coral/90 shadow-sm hover:shadow'
        }`}
      >
        {isTrading ? 'Processing...' : tradeType === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
      </button>

      <p className="text-xs text-caribbean-gray-500 text-center mt-4">
        Trades are executed instantly at market price
      </p>
    </div>
  );
}
