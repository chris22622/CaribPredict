'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Position, Trade, Market, MarketOption, Transaction } from '@/lib/types';
import { formatSatoshis, formatProbability } from '@/lib/amm';
import { useAuth } from '@/app/layout-client';
import Link from 'next/link';
import { Wallet, TrendingUp, TrendingDown, Clock, ArrowUpRight, ArrowDownRight, Bitcoin, ChevronRight, BarChart3, History } from 'lucide-react';

interface PositionWithMarket extends Position {
  market?: Market;
  option?: MarketOption;
}

interface TradeWithDetails extends Trade {
  market?: Market;
  option?: MarketOption;
}

export default function PortfolioPage() {
  const { user, balance, openAuth, openWallet } = useAuth();
  const [positions, setPositions] = useState<PositionWithMarket[]>([]);
  const [recentTrades, setRecentTrades] = useState<TradeWithDetails[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'positions' | 'trades' | 'transactions'>('positions');

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Load positions
      const { data: positionsData } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', user.id)
        .gt('shares', 0)
        .order('updated_at', { ascending: false });

      if (positionsData && positionsData.length > 0) {
        const marketIds = [...new Set(positionsData.map((p: Position) => p.market_id))];
        const [marketsRes, optionsRes] = await Promise.all([
          supabase.from('markets').select('*').in('id', marketIds),
          supabase.from('market_options').select('*').in('market_id', marketIds),
        ]);

        const marketsMap = new Map(marketsRes.data?.map((m) => [m.id, m]));
        const optionsMap = new Map(optionsRes.data?.map((o) => [o.id, o]));

        setPositions(positionsData.map((pos: Position) => ({
          ...pos,
          market: marketsMap.get(pos.market_id),
          option: optionsMap.get(pos.option_id),
        })));
      }

      // Load trades
      const { data: tradesData } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (tradesData && tradesData.length > 0) {
        const tradeMarketIds = [...new Set(tradesData.map((t: Trade) => t.market_id))];
        const [marketsRes, optionsRes] = await Promise.all([
          supabase.from('markets').select('*').in('id', tradeMarketIds),
          supabase.from('market_options').select('*').in('market_id', tradeMarketIds),
        ]);

        const marketsMap = new Map(marketsRes.data?.map((m) => [m.id, m]));
        const optionsMap = new Map(optionsRes.data?.map((o) => [o.id, o]));

        setRecentTrades(tradesData.map((trade: Trade) => ({
          ...trade,
          market: marketsMap.get(trade.market_id),
          option: optionsMap.get(trade.option_id),
        })));
      }

      // Load transactions
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (txData) setTransactions(txData);
    } catch (err) {
      console.error('Portfolio load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <Wallet size={48} className="text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to view your portfolio</h2>
        <p className="text-sm text-gray-500 mb-6">Track your positions, trades, and balances</p>
        <button onClick={openAuth} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors">
          Sign In
        </button>
      </div>
    );
  }

  // Calculate total portfolio value
  const totalPositionValue = positions.reduce((sum, pos) => {
    if (!pos.option) return sum;
    return sum + pos.shares * pos.option.probability;
  }, 0);

  const totalCostBasis = positions.reduce((sum, pos) => {
    return sum + pos.shares * pos.avg_price;
  }, 0);

  const totalPnL = totalPositionValue - totalCostBasis;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Portfolio</h1>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Available Balance</div>
          <div className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bitcoin size={18} className="text-orange-500" />
            {formatSatoshis(balance)}
          </div>
          <button onClick={openWallet} className="mt-2 text-xs text-blue-600 font-medium hover:text-blue-700">
            Deposit / Withdraw
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Position Value</div>
          <div className="text-xl font-bold text-gray-900">
            {formatSatoshis(totalPositionValue)}
          </div>
          <div className="text-xs text-gray-400 mt-1">{positions.length} active positions</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Total P&L</div>
          <div className={`text-xl font-bold ${totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {totalPnL >= 0 ? '+' : ''}{formatSatoshis(totalPnL)}
          </div>
          <div className={`text-xs mt-1 ${totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {totalCostBasis > 0 ? `${((totalPnL / totalCostBasis) * 100).toFixed(1)}%` : '0%'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-4">
        {([
          { key: 'positions', label: 'Positions', icon: BarChart3 },
          { key: 'trades', label: 'Trades', icon: TrendingUp },
          { key: 'transactions', label: 'Transactions', icon: History },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Positions Tab */}
          {activeTab === 'positions' && (
            <div className="space-y-2">
              {positions.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <BarChart3 size={32} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No active positions. Start trading!</p>
                  <Link href="/" className="inline-block mt-3 text-sm text-blue-600 font-medium hover:text-blue-700">
                    Browse Markets
                  </Link>
                </div>
              ) : (
                positions.map((pos) => {
                  if (!pos.market || !pos.option) return null;
                  const currentValue = pos.shares * pos.option.probability;
                  const costBasis = pos.shares * pos.avg_price;
                  const pnl = currentValue - costBasis;
                  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

                  return (
                    <Link key={pos.id} href={`/market/${pos.market_id}`}>
                      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 mr-4">
                            <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{pos.market.question}</h3>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              <span className="font-medium text-gray-700">{pos.option.label}</span>
                              <span>|</span>
                              <span>{pos.shares.toFixed(1)} shares</span>
                              <span>|</span>
                              <span>Avg: {formatProbability(pos.avg_price)}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`text-sm font-bold ${pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500">{formatProbability(pos.option.probability)} now</div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          )}

          {/* Trades Tab */}
          {activeTab === 'trades' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {recentTrades.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">No trades yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentTrades.map((trade) => {
                    if (!trade.market || !trade.option) return null;
                    return (
                      <div key={trade.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="text-sm font-medium text-gray-900 line-clamp-1">{trade.market.question}</div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              <span className={`font-bold ${trade.is_buy ? 'text-emerald-600' : 'text-red-600'}`}>
                                {trade.is_buy ? 'BUY' : 'SELL'}
                              </span>
                              <span>{trade.option.label}</span>
                              <span>|</span>
                              <span>{trade.shares.toFixed(1)} @ {formatProbability(trade.price)}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-medium text-gray-900">{formatSatoshis(trade.total_cost)}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(trade.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {transactions.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">No transactions yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            tx.type === 'deposit' ? 'bg-emerald-50' :
                            tx.type === 'withdrawal' ? 'bg-red-50' :
                            'bg-blue-50'
                          }`}>
                            {tx.type === 'deposit' ? <ArrowDownRight size={16} className="text-emerald-600" /> :
                             tx.type === 'withdrawal' ? <ArrowUpRight size={16} className="text-red-600" /> :
                             <TrendingUp size={16} className="text-blue-600" />}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 capitalize">{tx.type}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-semibold ${tx.amount_satoshis >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {tx.amount_satoshis >= 0 ? '+' : ''}{formatSatoshis(Math.abs(tx.amount_satoshis))}
                          </div>
                          <div className={`text-xs capitalize ${
                            tx.status === 'confirmed' ? 'text-emerald-500' :
                            tx.status === 'pending' ? 'text-amber-500' :
                            'text-red-500'
                          }`}>
                            {tx.status}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
