'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Icon, { Wordmark } from './Icon';
import { Avatar, Button } from './Primitives';
import { fmtUsdt, satsToUsd } from '@/lib/cp-data';

interface TopNavProps {
  onSearch?: () => void;
  balance?: number;
  onWalletClick?: () => void;
  onAvatarClick?: () => void;
  isLoggedIn?: boolean;
}

export default function TopNav({ onSearch, balance, onWalletClick, onAvatarClick, isLoggedIn }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const active =
    pathname === '/' ? 'home'
    : pathname?.startsWith('/games') || pathname?.startsWith('/crash')
      || pathname?.startsWith('/plinko') || pathname?.startsWith('/mines')
      || pathname?.startsWith('/dice') || pathname?.startsWith('/coinflip') ? 'games'
    : pathname?.startsWith('/vip') ? 'vip'
    : pathname?.startsWith('/profile') ? 'portfolio'
    : pathname?.startsWith('/leaderboard') ? 'activity'
    : 'home';

  return (
    <div style={{
      background: 'var(--cp-ink)', color: 'var(--cp-text-on-ink)',
      borderBottom: '1px solid var(--cp-ink-line)', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: -1, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(232,165,60,0.45), transparent)',
        pointerEvents: 'none',
      }}/>
      <div className="cp-topnav-inner" style={{
        maxWidth: 1400, margin: '0 auto',
        padding: '12px 28px',
        display: 'grid', gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center', gap: 12,
      }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <Wordmark size={24} color="var(--cp-text-on-ink)"/>
        </Link>

        <button onClick={onSearch} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(255,255,255,0.06)', border: '1px solid var(--cp-ink-line)',
          borderRadius: 999, padding: '0 12px', height: 38, width: '100%',
          maxWidth: 460, justifySelf: 'center',
          color: 'var(--cp-text-on-ink-3)', cursor: 'pointer',
          fontFamily: 'var(--cp-sans)',
        }}>
          <Icon name="search" size={16}/>
          <span className="cp-topnav-search-text" style={{ flex: 1, textAlign: 'left', fontSize: 13.5 }}>Search markets, traders, places…</span>
          <span className="cp-topnav-kbd" style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 6px', borderRadius: 4,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--cp-ink-line)',
            fontSize: 11, fontFamily: 'var(--cp-mono)',
          }}>⌘K</span>
        </button>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className="cp-topnav-routes" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RouteLink active={active === 'home'} label="Markets" onClick={() => router.push('/')}/>
            <RouteLink active={active === 'games'} label="Games" onClick={() => router.push('/games')}/>
            <RouteLink active={active === 'vip'} label="VIP" onClick={() => router.push('/vip')}/>
            <RouteLink active={active === 'portfolio'} label="Portfolio" onClick={() => router.push('/profile')}/>
            <RouteLink active={active === 'activity'} label="Activity" onClick={() => router.push('/leaderboard')}/>
          </span>
          {balance !== undefined && (
            <span className="cp-topnav-balance" style={{ display: 'inline-flex' }}>
              <BalanceChip balanceSats={balance}/>
            </span>
          )}
          <Button kind="sun" size="md" icon="plus" onClick={onWalletClick}>
            <span className="cp-topnav-deposit-label">Deposit</span>
          </Button>
          <button onClick={onAvatarClick} style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}>
            <Avatar name={isLoggedIn ? 'You' : '?'} size={32} tone="ink"/>
          </button>
        </div>
      </div>
    </div>
  );
}

function RouteLink({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent', border: 0, cursor: 'pointer',
      color: active ? 'var(--cp-text-on-ink)' : 'var(--cp-text-on-ink-2)',
      fontFamily: 'var(--cp-sans)', fontWeight: 500, fontSize: 13.5,
      padding: '6px 10px', borderRadius: 6, position: 'relative',
    }}>
      {label}
      {active && (
        <span style={{
          position: 'absolute', left: 10, right: 10, bottom: -2, height: 2,
          background: 'var(--cp-sun)', borderRadius: 2,
        }}/>
      )}
    </button>
  );
}

function BalanceChip({ balanceSats }: { balanceSats: number }) {
  // `balanceSats` is named for legacy reasons but is now the user's
  // balance_cents — the field every game writes to. Cents → USDT is just /100.
  const usd = balanceSats / 100;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '4px 10px 4px 6px', borderRadius: 999,
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid var(--cp-ink-line)',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        background: 'var(--cp-yes)', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', color: '#fff',
        fontSize: 9.5, fontWeight: 700, letterSpacing: '-0.02em',
      }}>₮</div>
      <span style={{ fontSize: 13, color: 'var(--cp-text-on-ink)' }} className="cp-num">{fmtUsdt(usd)}</span>
    </div>
  );
}
