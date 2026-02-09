'use client';

import { useState, useEffect } from 'react';
import { Market, MarketOption } from '@/lib/types';
import { calculateBuyCost, calculateSellPayout, formatSatoshis, formatProbability, MarketState } from '@/lib/amm';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TradingInterfaceProps {
  market: Market;
  options: MarketOption[];
  userBalance: number;
  userPositions: { [optionIndex: number]: number }; // optionIndex -> shares owned
  onTrade: (optionIndex: number, tradeType: 'buy' | 'sell', shares: number, cost: number) => Promise<void>;
}

export default function TradingInterface({
  market,
  options,
  userBalance,
  userPositions,
  onTrade,
}: TradingInterfaceProps) {
  const [selectedOption, setSelectedOption] = useState(0);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [shares, setShares] = useState('10');
  const [quote, setQuote] = useState<{ price: number; cost: number; newProbability: number } | null>(null);
  const [isTrading, setIsTrading] = useState(false);
  const [error, setError] = useState('');

  // Calculate quote when inputs change
  useEffect(() => {
    const sharesNum = parseFloat(shares);
    if (isNaN(sharesNum) || sharesNum <= 0) {
      setQuote(null);
      return;
    }

    const marketState: MarketState = {
      shares: options.map((opt) => opt.current_shares),
      liquidityParameter: market.liquidity_parameter,
    };

    try {
      if (tradeType === 'buy') {
        const result = calculateBuyCost(marketState, selectedOption, sharesNum);
        setQuote(result);
      } else {
        const result = calculateSellPayout(marketState, selectedOption, sharesNum);
        setQuote(result);
      }
      setError('');
    } catch (err) {
      setQuote(null);
      setError('Error calculating price');
    }
  }, [shares, selectedOption, tradeType, options, market.liquidity_parameter]);

  const handleTrade = async () => {
    if (!quote) return;

    const sharesNum = parseFloat(shares);
    const userShares = userPositions[selectedOption] || 0;

    // Validation
    if (tradeType === 'buy' && quote.cost > userBalance) {
      setError('Insufficient balance');
      return;
    }

    if (tradeType === 'sell' && sharesNum > userShares) {
      setError(`You only have ${userShares.toFixed(2)} shares`);
      return;
    }

    setIsTrading(true);
    setError('');

    try {
      await onTrade(selectedOption, tradeType, sharesNum, quote.cost);
      setShares('10');
    } catch (err: any) {
      setError(err.message || 'Trade failed');
    } finally {
      setIsTrading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-caribbean-navy mb-4">Trade</h3>

      {/* Option Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Option</label>
        <div className="space-y-2">
          {options.map((option, idx) => (
            <button
              key={option.id}
              onClick={() => setSelectedOption(idx)}
              className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                selectedOption === idx
                  ? 'border-caribbean-blue bg-caribbean-blue bg-opacity-10'
                  : 'border-gray-200 hover:border-caribbean-teal'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{option.option_text}</span>
                <span className="text-caribbean-blue font-bold">
                  {formatProbability(option.current_probability)}
                </span>
              </div>
              {userPositions[idx] > 0 && (
                <div className="text-xs text-caribbean-green mt-1">
                  You own: {userPositions[idx].toFixed(2)} shares
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Buy/Sell Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTradeType('buy')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            tradeType === 'buy'
              ? 'bg-caribbean-green text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <TrendingUp className="inline mr-1" size={16} />
          Buy
        </button>
        <button
          onClick={() => setTradeType('sell')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            tradeType === 'sell'
              ? 'bg-caribbean-coral text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <TrendingDown className="inline mr-1" size={16} />
          Sell
        </button>
      </div>

      {/* Shares Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Number of Shares</label>
        <input
          type="number"
          min="0.01"
          step="1"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-caribbean-blue"
        />
      </div>

      {/* Quote Display */}
      {quote && (
        <div className="bg-caribbean-sand rounded-lg p-4 mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-gray-700">Avg Price per Share</span>
            <span className="font-bold">{formatProbability(quote.price)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-700">Total {tradeType === 'buy' ? 'Cost' : 'Payout'}</span>
            <span className="font-bold text-caribbean-navy">{formatSatoshis(quote.cost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">New Probability</span>
            <span className="font-bold text-caribbean-blue">{formatProbability(quote.newProbability)}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Trade Button */}
      <button
        onClick={handleTrade}
        disabled={!quote || isTrading}
        className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all ${
          !quote || isTrading
            ? 'bg-gray-400 cursor-not-allowed'
            : tradeType === 'buy'
            ? 'bg-caribbean-green hover:bg-opacity-90'
            : 'bg-caribbean-coral hover:bg-opacity-90'
        }`}
      >
        {isTrading ? 'Processing...' : tradeType === 'buy' ? 'Buy Shares' : 'Sell Shares'}
      </button>

      {/* Balance Info */}
      <div className="mt-4 text-sm text-gray-600 text-center">
        Your Balance: {formatSatoshis(userBalance)}
      </div>
    </div>
  );
}
