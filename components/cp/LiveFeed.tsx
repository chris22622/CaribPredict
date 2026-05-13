'use client';

import React, { useEffect, useRef, useState } from 'react';
import { fmtUsdt } from '@/lib/cp-data';

interface FeedItem {
  id: string;
  ts: string;
  game: string;
  user: string;
  stakeUsdt: number;
  won: boolean;
  multiplier: number | null;
  payoutUsdt: number;
}

const POLL_MS = 5000;

export default function LiveFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch('/api/feed?limit=25', { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled) return;
        const incoming: FeedItem[] = j.feed || [];
        setFeed(prev => {
          // Append truly-new items at the top, keep ~25 total.
          const newOnes = incoming.filter(i => !seenIds.current.has(i.id));
          newOnes.forEach(i => seenIds.current.add(i.id));
          const next = [...newOnes, ...prev].slice(0, 25);
          return next;
        });
      } catch {/* ignore */}
    }
    load();
    const t = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  if (!feed.length) return null;

  return (
    <section style={{
      background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)',
      padding: 14, marginTop: 24,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--cp-yes)', animation: 'cp-live-pulse 1.5s ease-in-out infinite',
          }}/>
          <span style={{ fontSize: 11.5, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Live bets
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--cp-text-3)' }}>
          refreshes every {POLL_MS / 1000}s
        </span>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 8, maxHeight: 220, overflowY: 'auto',
      }}>
        {feed.map(item => (
          <div key={item.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 10px', borderRadius: 8, gap: 8,
            background: item.won ? 'var(--cp-yes-soft)' : 'var(--cp-card-sub)',
            border: '1px solid var(--cp-line)',
            fontSize: 12.5,
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="cp-num" style={{ fontWeight: 600, color: 'var(--cp-text)' }}>{item.user}</div>
              <div style={{ fontSize: 10.5, color: 'var(--cp-text-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {item.game}
                {item.multiplier ? ` · ${item.multiplier.toFixed(2)}×` : ''}
              </div>
            </div>
            <div className="cp-num" style={{ textAlign: 'right', flexShrink: 0 }}>
              {item.won ? (
                <span style={{ color: 'var(--cp-yes-ink)', fontWeight: 700 }}>
                  +{fmtUsdt(item.payoutUsdt - item.stakeUsdt)}
                </span>
              ) : (
                <span style={{ color: 'var(--cp-text-3)' }}>
                  −{fmtUsdt(item.stakeUsdt)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes cp-live-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.35 } }`}</style>
    </section>
  );
}
