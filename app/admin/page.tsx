'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/layout-client';
import { useRouter } from 'next/navigation';
import { Settings, Users, BarChart3, CheckCircle, XCircle, Clock, TrendingUp, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { formatSatoshis } from '@/lib/amm';
import { toast } from 'sonner';
import Link from 'next/link';

interface MarketWithOptions {
  id: string;
  question: string;
  category: string;
  country_filter: string;
  close_date: string;
  resolved: boolean;
  resolution?: string;
  created_at: string;
  options: Array<{ id: string; label: string; probability: number }>;
}

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [markets, setMarkets] = useState<MarketWithOptions[]>([]);
  const [stats, setStats] = useState({ totalMarkets: 0, activeMarkets: 0, resolvedMarkets: 0, totalUsers: 0, totalTrades: 0, totalVolume: 0 });
  const [loading, setLoading] = useState(true);
  const [resolveModal, setResolveModal] = useState<{ market: MarketWithOptions; optionId: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'markets' | 'resolve' | 'questions'>('overview');

  useEffect(() => {
    loadAdmin();
  }, []);

  const loadAdmin = async () => {
    setLoading(true);
    try {
      // Stats
      const [marketsRes, activeRes, resolvedRes, usersRes, tradesRes] = await Promise.all([
        supabase.from('markets').select('*', { count: 'exact', head: true }),
        supabase.from('markets').select('*', { count: 'exact', head: true }).eq('resolved', false),
        supabase.from('markets').select('*', { count: 'exact', head: true }).eq('resolved', true),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('trades').select('total_cost'),
      ]);

      setStats({
        totalMarkets: marketsRes.count || 0,
        activeMarkets: activeRes.count || 0,
        resolvedMarkets: resolvedRes.count || 0,
        totalUsers: usersRes.count || 0,
        totalTrades: tradesRes.data?.length || 0,
        totalVolume: tradesRes.data?.reduce((s, t) => s + (t.total_cost || 0), 0) || 0,
      });

      // Markets with options
      const { data: marketsData } = await supabase
        .from('markets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (marketsData && marketsData.length > 0) {
        const marketIds = marketsData.map(m => m.id);
        const { data: optionsData } = await supabase
          .from('market_options')
          .select('*')
          .in('market_id', marketIds);

        const optionsByMarket: Record<string, any[]> = {};
        optionsData?.forEach(o => {
          if (!optionsByMarket[o.market_id]) optionsByMarket[o.market_id] = [];
          optionsByMarket[o.market_id].push(o);
        });

        setMarkets(marketsData.map(m => ({ ...m, options: optionsByMarket[m.id] || [] })));
      }
    } catch (err) {
      console.error('Admin load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resolveMarket = async (marketId: string, winningOptionId: string) => {
    try {
      // Mark market resolved
      const { error: marketError } = await supabase
        .from('markets')
        .update({ resolved: true, resolution: winningOptionId })
        .eq('id', marketId);

      if (marketError) throw marketError;

      // Get winning option label
      const market = markets.find(m => m.id === marketId);
      const winningOption = market?.options.find(o => o.id === winningOptionId);

      // Update winning option to 100% and others to 0%
      if (market) {
        for (const option of market.options) {
          await supabase
            .from('market_options')
            .update({ probability: option.id === winningOptionId ? 1.0 : 0.0 })
            .eq('id', option.id);
        }
      }

      // Pay out winners - get all positions on winning option
      const { data: winningPositions } = await supabase
        .from('positions')
        .select('*')
        .eq('market_id', marketId)
        .eq('option_id', winningOptionId)
        .gt('shares', 0);

      if (winningPositions) {
        for (const pos of winningPositions) {
          // Each share pays out 1 sat (full value) - user bought at avg_price
          const payout = Math.floor(pos.shares);

          // Update user balance
          const { data: userData } = await supabase
            .from('users')
            .select('balance_satoshis')
            .eq('id', pos.user_id)
            .single();

          if (userData) {
            await supabase
              .from('users')
              .update({ balance_satoshis: userData.balance_satoshis + payout })
              .eq('id', pos.user_id);

            // Record payout transaction
            await supabase.from('transactions').insert({
              user_id: pos.user_id,
              type: 'payout',
              amount_satoshis: payout,
              status: 'confirmed',
              metadata: { market_id: marketId, option_id: winningOptionId, shares: pos.shares },
            });
          }
        }
      }

      toast.success(`Market resolved! ${winningOption?.label || 'Option'} wins. Payouts processed.`);
      setResolveModal(null);
      loadAdmin();
    } catch (err: any) {
      toast.error(err.message || 'Failed to resolve market');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  const unresolvedExpired = markets.filter(m => !m.resolved && new Date(m.close_date) < new Date());
  const activeMarkets = markets.filter(m => !m.resolved);
  const resolvedMarkets = markets.filter(m => m.resolved);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <button
          onClick={loadAdmin}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Total Markets', value: stats.totalMarkets, icon: BarChart3, color: 'blue' },
          { label: 'Active', value: stats.activeMarkets, icon: TrendingUp, color: 'green' },
          { label: 'Resolved', value: stats.resolvedMarkets, icon: CheckCircle, color: 'purple' },
          { label: 'Users', value: stats.totalUsers, icon: Users, color: 'cyan' },
          { label: 'Trades', value: stats.totalTrades, icon: TrendingUp, color: 'orange' },
          { label: 'Volume', value: formatSatoshis(stats.totalVolume), icon: BarChart3, color: 'yellow' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
            <div className="text-lg font-bold text-gray-900">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Needs Resolution Alert */}
      {unresolvedExpired.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-900">{unresolvedExpired.length} markets need resolution</h3>
            <p className="text-xs text-amber-700 mt-0.5">These markets have passed their close date and need to be resolved.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-4">
        {([
          { key: 'overview', label: 'Overview' },
          { key: 'resolve', label: `Resolve (${unresolvedExpired.length})` },
          { key: 'markets', label: 'All Markets' },
          { key: 'questions', label: 'Questions' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Recent Markets</h3>
          {markets.slice(0, 10).map((market) => (
            <div key={market.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Link href={`/market/${market.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                    {market.question}
                  </Link>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>{market.category}</span>
                    <span>|</span>
                    <span>{market.country_filter}</span>
                    <span>|</span>
                    <span>{new Date(market.close_date).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                  market.resolved ? 'bg-purple-50 text-purple-700' : 'bg-green-50 text-green-700'
                }`}>
                  {market.resolved ? 'Resolved' : 'Active'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'resolve' && (
        <div className="space-y-3">
          {unresolvedExpired.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <CheckCircle size={32} className="text-emerald-500 mx-auto mb-3" />
              <p className="text-sm text-gray-500">All markets are up to date. No resolutions needed.</p>
            </div>
          ) : (
            unresolvedExpired.map((market) => (
              <div key={market.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{market.question}</h3>
                <div className="text-xs text-gray-500 mb-3">
                  {market.country_filter} | {market.category} | Closed {new Date(market.close_date).toLocaleDateString()}
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-700">Select winning outcome:</p>
                  <div className="flex flex-wrap gap-2">
                    {market.options.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setResolveModal({ market, optionId: option.id })}
                        className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'markets' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {markets.map((market) => (
              <div key={market.id} className="px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <Link href={`/market/${market.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-1">
                      {market.question}
                    </Link>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {market.country_filter} | {market.category}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      market.resolved ? 'bg-purple-50 text-purple-700' : 
                      new Date(market.close_date) < new Date() ? 'bg-amber-50 text-amber-700' : 
                      'bg-green-50 text-green-700'
                    }`}>
                      {market.resolved ? 'Resolved' : new Date(market.close_date) < new Date() ? 'Needs Resolution' : 'Active'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'questions' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-500 mb-3">Manage auto-generated questions</p>
          <Link
            href="/admin/questions"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Open Question Queue
          </Link>
        </div>
      )}

      {/* Resolve Confirmation Modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-modal">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Resolution</h3>
            <p className="text-sm text-gray-600 mb-4">
              Resolve "<strong>{resolveModal.market.question}</strong>" with winner:
              <br />
              <strong className="text-emerald-600">
                {resolveModal.market.options.find(o => o.id === resolveModal.optionId)?.label}
              </strong>
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg mb-4">
              This action cannot be undone. All winning positions will be paid out automatically.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setResolveModal(null)}
                className="flex-1 py-2.5 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => resolveMarket(resolveModal.market.id, resolveModal.optionId)}
                className="flex-1 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
              >
                Confirm & Pay Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
