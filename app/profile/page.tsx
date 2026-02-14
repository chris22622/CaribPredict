'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/layout-client';
import { createClient } from '@/lib/supabase-client';
import { User, Mail, Shield, Clock, Save, ArrowLeft, Wallet, LogOut } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatSatoshis } from '@/lib/amm';

export default function ProfilePage() {
  const { user, balance, loading, logout } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ totalTrades: 0, marketsTraded: 0, joinedDate: '' });

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadStats();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single();
    if (data?.username) {
      setUsername(data.username);
    } else {
      setUsername(user.email?.split('@')[0] || '');
    }
  };

  const loadStats = async () => {
    if (!user) return;
    try {
      const [tradesRes, marketsRes] = await Promise.all([
        supabase.from('trades').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('positions').select('market_id').eq('user_id', user.id),
      ]);

      const uniqueMarkets = new Set(marketsRes.data?.map(p => p.market_id) || []);

      setStats({
        totalTrades: tradesRes.count || 0,
        marketsTraded: uniqueMarkets.size,
        joinedDate: user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        }) : 'Unknown',
      });
    } catch (e) {
      console.error('Error loading stats:', e);
    }
  };

  const saveUsername = async () => {
    if (!user || !username.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ username: username.trim() })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Username updated!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update username');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft size={16} />
        Back to Markets
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Account Settings</h1>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">
              {(user.email?.[0] || 'U').toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{username || 'User'}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        {/* Username Edit */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Display Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              maxLength={30}
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <button
              onClick={saveUsername}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">This name appears on leaderboards and in comments.</p>
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email Address
          </label>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
            <Mail size={14} className="text-gray-400" />
            <span className="text-sm text-gray-600">{user.email}</span>
            <span className="ml-auto text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Verified</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Your Stats</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <div className="text-lg font-bold text-gray-900">{formatSatoshis(balance)}</div>
            <div className="text-xs text-gray-500">Balance</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <div className="text-lg font-bold text-gray-900">{stats.totalTrades}</div>
            <div className="text-xs text-gray-500">Total Trades</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <div className="text-lg font-bold text-gray-900">{stats.marketsTraded}</div>
            <div className="text-xs text-gray-500">Markets</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <div className="text-sm font-medium text-gray-900">{stats.joinedDate}</div>
            <div className="text-xs text-gray-500">Joined</div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Links</h3>
        <div className="space-y-2">
          <Link
            href="/portfolio"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Wallet size={18} className="text-gray-400" />
            <span className="text-sm text-gray-700">Portfolio & Positions</span>
          </Link>
          <Link
            href="/watchlist"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Shield size={18} className="text-gray-400" />
            <span className="text-sm text-gray-700">Watchlist</span>
          </Link>
          <Link
            href="/leaderboard"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Clock size={18} className="text-gray-400" />
            <span className="text-sm text-gray-700">Leaderboard</span>
          </Link>
        </div>
      </div>

      {/* Sign Out */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-3 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors"
      >
        <LogOut size={16} />
        Sign Out
      </button>
    </div>
  );
}
