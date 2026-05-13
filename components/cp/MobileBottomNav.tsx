'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Icon from './Icon';

interface MobileBottomNavProps {
  isLoggedIn?: boolean;
  onAccountClick?: () => void;
}

export default function MobileBottomNav({ isLoggedIn, onAccountClick }: MobileBottomNavProps) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const active =
    pathname === '/' ? 'home'
    : pathname.startsWith('/?live') ? 'live'
    : pathname.startsWith('/games') || pathname.startsWith('/crash')
      || pathname.startsWith('/plinko') || pathname.startsWith('/mines')
      || pathname.startsWith('/dice') || pathname.startsWith('/coinflip') ? 'games'
    : pathname.startsWith('/profile') || pathname.startsWith('/portfolio') ? 'account'
    : 'home';

  function go(href: string, key: string) {
    if (key === 'account' && !isLoggedIn) { onAccountClick?.(); return; }
    router.push(href);
  }
  const active2 = active; // keep narrow type

  return (
    <nav className="cp-mobile-bottom-nav" style={{
      position: 'fixed', left: 0, right: 0, bottom: 0,
      background: 'var(--cp-ink)', color: 'var(--cp-text-on-ink)',
      borderTop: '1px solid var(--cp-ink-line)',
      display: 'none', // shown via media query at <= 640px
      paddingBottom: 'env(safe-area-inset-bottom, 0)',
      zIndex: 50,
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        height: 56, alignItems: 'stretch',
      }}>
        <Item active={active2 === 'home'}    icon="gavel"    label="Markets" onClick={() => go('/', 'home')}/>
        <Item active={active2 === 'live'}    icon="flame"    label="Live"    onClick={() => go('/?live=1', 'live')}/>
        <Item active={active2 === 'games'}   icon="sparkle"  label="Games"   onClick={() => go('/games', 'games')}/>
        <Item active={active2 === 'account'} icon="wallet"   label="Account" onClick={() => go('/profile', 'account')}/>
      </div>
    </nav>
  );
}

function Item({ active, icon, label, onClick }: { active?: boolean; icon: string; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent', border: 0, cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 3, color: active ? 'var(--cp-sun)' : 'var(--cp-text-on-ink-2)',
      fontSize: 10.5, fontWeight: 600, padding: 0,
    }}>
      <Icon name={icon} size={20} color="currentColor"/>
      <span>{label}</span>
    </button>
  );
}
