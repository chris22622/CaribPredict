'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';

interface GameTile {
  href: string;
  name: string;
  tag: string;
  glyph: string;
  accent: string;
  bgStart: string;
  bgEnd: string;
}

const TILES: GameTile[] = [
  { href: '/crash',    name: 'CaribCrash', tag: 'Cash out before crash', glyph: 'flame',   accent: '#0E7C66', bgStart: '#0B1F2E', bgEnd: '#102A3D' },
  { href: '/plinko',   name: 'Plinko',     tag: 'Drop. Pegs. Big bins',   glyph: 'sparkle', accent: '#D24A3A', bgStart: '#1B3A50', bgEnd: '#0B1F2E' },
  { href: '/mines',    name: 'Mines',      tag: 'Reveal. Cash. Repeat',   glyph: 'storm',   accent: '#E8A53C', bgStart: '#102A3D', bgEnd: '#0B1F2E' },
  { href: '/dice',     name: 'Dice',       tag: 'Lowest house edge',       glyph: 'chart',   accent: '#0E7C66', bgStart: '#0B1F2E', bgEnd: '#1B3A50' },
  { href: '/coinflip', name: 'Coin Flip',  tag: '1.95× double up',        glyph: 'check',   accent: '#E8A53C', bgStart: '#1B3A50', bgEnd: '#102A3D' },
];

export default function QuickGames() {
  const router = useRouter();

  return (
    <section style={{ marginTop: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 12, gap: 16,
      }}>
        <div>
          <h2 style={{
            margin: 0, fontFamily: 'var(--cp-serif)', fontWeight: 400,
            fontSize: 26, color: 'var(--cp-text)', letterSpacing: '-0.01em',
          }}>Quick games</h2>
          <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--cp-text-3)' }}>
            Instant settle · provably fair · USDT
          </div>
        </div>
        <button onClick={() => router.push('/games')} style={{
          height: 32, padding: '0 12px', borderRadius: 999,
          border: '1px solid var(--cp-line-strong)', background: 'var(--cp-card)',
          color: 'var(--cp-text-2)', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          All games <Icon name="chevron-r" size={12}/>
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 12,
      }}>
        {TILES.map(t => (
          <button key={t.href} onClick={() => router.push(t.href)} style={{
            position: 'relative', overflow: 'hidden', textAlign: 'left',
            border: 0, padding: 16, cursor: 'pointer',
            background: `linear-gradient(155deg, ${t.bgStart} 0%, ${t.bgEnd} 100%)`,
            color: 'var(--cp-text-on-ink)',
            borderRadius: 14, minHeight: 110,
            transition: 'transform .15s ease, box-shadow .15s ease',
            boxShadow: 'var(--cp-shadow-card)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12,
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--cp-shadow-hov)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--cp-shadow-card)'; }}>
            <div style={{
              position: 'absolute', right: -40, top: -40, width: 140, height: 140, borderRadius: '50%',
              background: `radial-gradient(circle, ${t.accent}55 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}/>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: t.accent, color: 'var(--cp-ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
            }}>
              <Icon name={t.glyph} size={18} color="currentColor"/>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{
                fontFamily: 'var(--cp-serif)', fontSize: 19, fontWeight: 400,
                letterSpacing: '-0.01em', color: 'var(--cp-text-on-ink)',
              }}>{t.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--cp-text-on-ink-2)', marginTop: 2 }}>
                {t.tag}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
