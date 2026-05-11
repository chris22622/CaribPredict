'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase-client';
import { supabase as supabaseAnon } from '@/lib/supabase';
import WalletModal from '@/components/WalletModal';
import AuthModal from '@/components/AuthModal';
import TopNav from '@/components/cp/TopNav';
import SearchModal from '@/components/cp/SearchModal';
import { toCpMarket, CpMarket } from '@/lib/cp-data';
import { Market, MarketOption } from '@/lib/types';

interface CpAppContext {
  user: User | null;
  balanceSats: number;
  refreshBalance: () => void;
  openSearch: () => void;
  openWallet: () => void;
  openAuth: () => void;
}
const Ctx = createContext<CpAppContext | null>(null);
export function useCp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCp must be inside LayoutClient');
  return c;
}

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [walletOpen, setWalletOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [allMarkets, setAllMarkets] = useState<CpMarket[]>([]);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadBalance(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadBalance(session.user.id);
      else setBalance(0);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadMarketsIndex();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  async function loadMarketsIndex() {
    try {
      const { data: ms } = await supabaseAnon.from('markets').select('*').eq('resolved', false).limit(80);
      const { data: os } = await supabaseAnon.from('market_options').select('*');
      if (ms && os) {
        const byMarket: Record<string, MarketOption[]> = {};
        os.forEach((o: MarketOption) => { (byMarket[o.market_id] ||= []).push(o); });
        const cps = (ms as Market[]).map(m => toCpMarket(m, byMarket[m.id] || []));
        setAllMarkets(cps);
      }
    } catch {/* silent */}
  }

  async function loadBalance(uid: string) {
    const { data } = await supabase.from('users').select('balance_satoshis').eq('id', uid).single();
    if (data) setBalance(data.balance_satoshis);
  }

  function handleWalletClick() { user ? setWalletOpen(true) : setAuthOpen(true); }
  function handleAvatarClick() { user ? (window.location.href = '/profile') : setAuthOpen(true); }

  return (
    <Ctx.Provider value={{
      user, balanceSats: balance,
      refreshBalance: () => user && loadBalance(user.id),
      openSearch: () => setSearchOpen(true),
      openWallet: handleWalletClick,
      openAuth: () => setAuthOpen(true),
    }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 30 }}>
        <TopNav
          onSearch={() => setSearchOpen(true)}
          balance={user ? balance : undefined}
          onWalletClick={handleWalletClick}
          onAvatarClick={handleAvatarClick}
          isLoggedIn={!!user}
        />
      </div>

      {children}

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} markets={allMarkets}/>

      {user && walletOpen && (
        <WalletModal
          user={{
            id: user.id,
            telegram_id: undefined,
            username: user.email?.split('@')[0] || 'user',
            balance_satoshis: balance,
            created_at: new Date().toISOString(),
          }}
          onClose={() => setWalletOpen(false)}
          onUpdate={() => loadBalance(user.id)}
        />
      )}

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) loadBalance(session.user.id);
          });
        }}
      />
    </Ctx.Provider>
  );
}
