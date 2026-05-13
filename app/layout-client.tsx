'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase-client';
import { supabase as supabaseAnon } from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';
import TopNav from '@/components/cp/TopNav';
import SearchModal from '@/components/cp/SearchModal';
import MobileBottomNav from '@/components/cp/MobileBottomNav';
import DepositModal from '@/components/cp/DepositModal';
import CookieAgeBanner from '@/components/cp/CookieAgeBanner';
import PWAInstallPrompt from '@/components/cp/PWAInstallPrompt';
import LiveChat from '@/components/cp/LiveChat';
import BigWinToast from '@/components/cp/BigWinToast';
import OnboardingModal from '@/components/cp/OnboardingModal';
import { toCpMarket, CpMarket } from '@/lib/cp-data';
import { Market, MarketOption } from '@/lib/types';

interface CpAppContext {
  user: User | null;
  balance: number;
  balanceSats: number;
  loading: boolean;
  refreshBalance: () => void;
  openSearch: () => void;
  openWallet: () => void;
  openAuth: () => void;
  logout: () => Promise<void>;
}
const Ctx = createContext<CpAppContext | null>(null);
export function useCp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCp must be inside LayoutClient');
  return c;
}
// Back-compat alias for pages that imported useAuth from this module before
// the redesign. Exposes the same shape they previously used.
export function useAuth() {
  return useCp();
}

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [walletOpen, setWalletOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [allMarkets, setAllMarkets] = useState<CpMarket[]>([]);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadBalance(session.user.id);
        initUserAndClaimReferral(session.user.id);
      }
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadBalance(session.user.id);
        initUserAndClaimReferral(session.user.id);
      } else {
        setBalance(0);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Idempotent server call: credit welcome bonus, generate referral code,
  // and claim a referrer if the URL has ?ref=XXXXXX.
  async function initUserAndClaimReferral(uid: string) {
    let referredByCode: string | undefined;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        referredByCode = ref.trim().toUpperCase();
        // Also persist to localStorage so the ref survives the post-signup redirect
        try { window.localStorage.setItem('cp_ref', referredByCode); } catch {/*ignore*/}
      } else {
        try { referredByCode = window.localStorage.getItem('cp_ref') || undefined; } catch {/*ignore*/}
      }
    }
    try {
      const res = await fetch('/api/user/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, referredByCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.bonusJustCredited && data.bonusAmountUsdt > 0 && typeof window !== 'undefined') {
        // Dynamic import keeps sonner out of the synchronous init path
        const { toast } = await import('sonner');
        toast.success(`Welcome bonus credited: ${data.bonusAmountUsdt.toFixed(2)} USDT free play (10x wagering).`);
      }
    } catch {/* silent */}
  }

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

  // After a UI rewrite the previously-installed service worker can keep
  // serving stale JS chunks that no longer exist on the server, which shows
  // up to users as "TypeError: Failed to fetch" plus dead buttons. Force
  // every active worker to update and clean its caches on first visit.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => { reg.update().catch(() => { /* ignore */ }); });
    }).catch(() => { /* ignore */ });
  }, []);

  async function loadMarketsIndex() {
    // Browser-direct Supabase (the /api/markets server route is broken on
    // production). Anon access on the markets table works fine in browser.
    try {
      const { data: ms } = await supabaseAnon.from('markets').select('*').eq('resolved', false).limit(120);
      if (!ms || ms.length === 0) { setAllMarkets([]); return; }
      const ids = (ms as Market[]).map(m => m.id);
      const { data: os } = await supabaseAnon.from('market_options').select('*').in('market_id', ids);
      const byMarket: Record<string, MarketOption[]> = {};
      (os || []).forEach((o: MarketOption) => { (byMarket[o.market_id] ||= []).push(o); });
      const cps = (ms as Market[]).map(m => toCpMarket(m, byMarket[m.id] || []));
      setAllMarkets(cps);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[CaribPredict] loadMarketsIndex failed:', e);
    }
  }

  async function loadBalance(uid: string) {
    // All games and the bet/cashout/reveal routes update `balance_cents`. The
    // old `balance_satoshis` column is left over from the Polymarket-era code
    // and never gets touched by gameplay — reading it makes the top-nav
    // balance look frozen. Read cents and treat them as the source of truth.
    const { data } = await supabase.from('users')
      .select('balance_cents').eq('id', uid).single();
    if (data) setBalance(data.balance_cents || 0);
  }

  function handleWalletClick() { user ? setWalletOpen(true) : setAuthOpen(true); }
  function handleAvatarClick() { user ? (window.location.href = '/profile') : setAuthOpen(true); }

  return (
    <Ctx.Provider value={{
      user, balance, balanceSats: balance, loading,
      refreshBalance: () => { if (user) loadBalance(user.id); },
      openSearch: () => setSearchOpen(true),
      openWallet: handleWalletClick,
      openAuth: () => setAuthOpen(true),
      logout: async () => {
        await supabase.auth.signOut();
        setUser(null);
        setBalance(0);
      },
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

      <MobileBottomNav isLoggedIn={!!user} onAccountClick={() => setAuthOpen(true)}/>

      <CookieAgeBanner/>
      <PWAInstallPrompt/>
      <LiveChat/>
      <BigWinToast/>
      <OnboardingModal/>

      {user && (
        <DepositModal
          isOpen={walletOpen}
          onClose={() => setWalletOpen(false)}
          userId={user.id}
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
