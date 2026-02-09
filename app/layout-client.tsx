'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase-client';
import Navbar from '@/components/Navbar';
import WalletModal from '@/components/WalletModal';
import AuthModal from '@/components/AuthModal';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number | undefined>(undefined);
  const [walletOpen, setWalletOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadBalance(session.user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadBalance(session.user.id);
      } else {
        setBalance(undefined);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadBalance = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('balance_satoshis')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setBalance(data.balance_satoshis);
    }
  };

  const handleProfileClick = () => {
    if (user) {
      // Navigate to profile
      window.location.href = '/profile';
    } else {
      // Show auth modal
      setAuthOpen(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setBalance(undefined);
  };

  return (
    <>
      <Navbar balance={balance} onWalletClick={() => user ? setWalletOpen(true) : setAuthOpen(true)} />

      <div onClick={(e) => {
        const target = e.target as HTMLElement;
        // Check if clicking profile link/icon
        if (target.closest('[href="/profile"]') && !user) {
          e.preventDefault();
          setAuthOpen(true);
        }
      }}>
        {children}
      </div>

      {user && balance !== undefined && walletOpen && (
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
            if (session?.user) {
              loadBalance(session.user.id);
            }
          });
        }}
      />
    </>
  );
}
