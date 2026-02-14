'use client';

import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase-client';
import Navbar from '@/components/Navbar';
import WalletModal from '@/components/WalletModal';
import AuthModal from '@/components/AuthModal';
import Footer from '@/components/Footer';

interface AuthContextType {
  user: User | null;
  balance: number;
  loading: boolean;
  refreshBalance: () => Promise<void>;
  openAuth: () => void;
  openWallet: () => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  balance: 0,
  loading: true,
  refreshBalance: async () => {},
  openAuth: () => {},
  openWallet: () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [walletOpen, setWalletOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const supabase = createClient();

  const loadBalance = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('balance_satoshis')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setBalance(data.balance_satoshis);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadBalance(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadBalance(session.user.id);
      } else {
        setBalance(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshBalance = useCallback(async () => {
    if (user) {
      await loadBalance(user.id);
    }
  }, [user, loadBalance]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setBalance(0);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        balance,
        loading,
        refreshBalance,
        openAuth: () => setAuthOpen(true),
        openWallet: () => (user ? setWalletOpen(true) : setAuthOpen(true)),
        logout,
      }}
    >
      <Navbar />
      {children}
      <Footer />

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
          onUpdate={refreshBalance}
        />
      )}

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
              loadBalance(session.user.id);
            }
          });
        }}
      />
    </AuthContext.Provider>
  );
}
