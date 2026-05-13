'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { SunDot } from '@/components/cp/Icon';
import Icon from '@/components/cp/Icon';

interface GameCard {
  href: string;
  name: string;
  tagline: string;
  edge: string;
  glyph: string;
  gradient: [string, string];
  accent: string;
}

const GAMES: GameCard[] = [
  {
    href: '/',
    name: 'Prediction markets',
    tagline: 'Peer-to-peer matched bets on Caribbean events.',
    edge: '5% on matched pool',
    glyph: 'gavel',
    gradient: ['#0B1F2E', '#1B3A50'],
    accent: '#E8A53C',
  },
  {
    href: '/crash',
    name: 'CaribCrash',
    tagline: 'Cash out before the multiplier crashes.',
    edge: '5% house edge',
    glyph: 'flame',
    gradient: ['#0B1F2E', '#102A3D'],
    accent: '#0E7C66',
  },
  {
    href: '/plinko',
    name: 'Plinko',
    tagline: 'Drop the ball. Bins on the edges pay big.',
    edge: '~1% house edge',
    glyph: 'sparkle',
    gradient: ['#1B3A50', '#0B1F2E'],
    accent: '#D24A3A',
  },
  {
    href: '/mines',
    name: 'Mines',
    tagline: 'Reveal safe tiles. Cash out before you hit a mine.',
    edge: '5% house edge',
    glyph: 'storm',
    gradient: ['#102A3D', '#0B1F2E'],
    accent: '#E8A53C',
  },
  {
    href: '/dice',
    name: 'Dice',
    tagline: 'Pick a target. Roll over or under. Lowest edge.',
    edge: '5% house edge',
    glyph: 'chart',
    gradient: ['#0B1F2E', '#1B3A50'],
    accent: '#0E7C66',
  },
  {
    href: '/coinflip',
    name: 'Coin Flip',
    tagline: 'Heads or tails. 1.95× on a winning call.',
    edge: '5% house edge',
    glyph: 'check',
    gradient: ['#1B3A50', '#102A3D'],
    accent: '#E8A53C',
  },
];

export default function GamesHubPage() {
  const router = useRouter();
  return (
    <main className="cp-page-pad" style={{
      maxWidth: 1280, margin: '0 auto', padding: '28px', width: '100%',
      display: 'flex', flexDirection: 'column', gap: 22,
    }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <SunDot size={28} color="var(--cp-sun)"/>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--cp-serif)', fontWeight: 400, fontSize: 36, letterSpacing: '-0.015em' }}>
            Games
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--cp-text-3)', fontSize: 14 }}>
            Six ways to bet. All settle in USDT, all provably fair, all peer-to-peer or fixed-edge transparent.
          </p>
        </div>
      </header>

      <section className="cp-grid-3" style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16,
      }}>
        {GAMES.map(g => (
          <button
            key={g.href}
            onClick={() => router.push(g.href)}
            style={{
              position: 'relative', overflow: 'hidden',
              border: 0, padding: 0, cursor: 'pointer', textAlign: 'left',
              background: `linear-gradient(155deg, ${g.gradient[0]} 0%, ${g.gradient[1]} 100%)`,
              borderRadius: 16, color: 'var(--cp-text-on-ink)',
              minHeight: 200, display: 'flex', flexDirection: 'column',
              transition: 'transform .15s ease, box-shadow .15s ease',
              boxShadow: 'var(--cp-shadow-card)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--cp-shadow-hov)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--cp-shadow-card)'; }}
          >
            {/* Decorative glow */}
            <div style={{
              position: 'absolute', right: -50, top: -50, width: 220, height: 220,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${g.accent}33 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}/>

            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12, flex: 1, position: 'relative' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: g.accent, color: 'var(--cp-ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 14px ${g.accent}55`,
              }}>
                <Icon name={g.glyph} size={22} color="currentColor"/>
              </div>

              <div>
                <h3 style={{
                  margin: 0, fontFamily: 'var(--cp-serif)', fontWeight: 400,
                  fontSize: 24, letterSpacing: '-0.01em', color: 'var(--cp-text-on-ink)',
                }}>{g.name}</h3>
                <p style={{
                  margin: '4px 0 0', fontSize: 13, color: 'var(--cp-text-on-ink-2)',
                  lineHeight: 1.5,
                }}>{g.tagline}</p>
              </div>

              <div style={{
                marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 11.5, color: 'var(--cp-text-on-ink-3)',
              }}>
                <span style={{
                  padding: '3px 9px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--cp-ink-line)',
                  fontFamily: 'var(--cp-mono)', fontWeight: 600,
                }}>{g.edge}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: g.accent, fontWeight: 600 }}>
                  Play <Icon name="chevron-r" size={13} color="currentColor"/>
                </span>
              </div>
            </div>
          </button>
        ))}
      </section>

      <div style={{
        marginTop: 6, padding: 16, borderRadius: 12,
        background: 'var(--cp-card-sub)', border: '1px solid var(--cp-line)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ fontSize: 13, color: 'var(--cp-text-2)', maxWidth: 540, lineHeight: 1.55 }}>
          Every game settles via HMAC-SHA256 with a server seed we publish the
          hash of <em>before</em> you bet. After settlement we reveal the seed
          so you can verify the outcome yourself.
        </div>
        <a href="/verify" style={{
          height: 38, padding: '0 16px', borderRadius: 8,
          background: 'var(--cp-ink)', color: 'var(--cp-text-on-ink)',
          textDecoration: 'none', fontWeight: 600, fontSize: 13,
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          Open verifier <Icon name="chevron-r" size={13}/>
        </a>
      </div>
    </main>
  );
}
