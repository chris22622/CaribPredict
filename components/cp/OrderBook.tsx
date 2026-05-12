'use client';

import React, { useEffect, useState } from 'react';
import { fmtUsdt, multiplierFromProb } from '@/lib/cp-data';

interface OrderBookProps {
  marketId: string;
  refreshMs?: number;
}

interface OptionBook {
  optionId: string;
  label: string;
  probability: number;
  yesMultiplier: string;
  noMultiplier: string;
  matched: { yesUsdt: number; noUsdt: number; poolUsdt: number; feeUsdt: number; count: number };
  unmatched: { yesUsdt: number; noUsdt: number; count: number };
}

export default function OrderBook({ marketId, refreshMs = 8000 }: OrderBookProps) {
  const [books, setBooks] = useState<OptionBook[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/bet/orderbook/${marketId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const list: OptionBook[] = Object.values(data.options || {});
        setBooks(list);
        setError(null);
      } catch (e: any) {
        if (cancelled) return;
        setError(e.message || 'Failed to load order book');
      }
    }
    load();
    const t = setInterval(load, refreshMs);
    return () => { cancelled = true; clearInterval(t); };
  }, [marketId, refreshMs]);

  return (
    <section style={{
      background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)',
      padding: 20, boxShadow: 'var(--cp-shadow-card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, gap: 8 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--cp-serif)', fontWeight: 400, fontSize: 22, letterSpacing: '-0.01em' }}>
          Order book
        </h3>
        <span style={{ fontSize: 11.5, color: 'var(--cp-text-3)' }}>
          Peer-to-peer · refreshes every {Math.round(refreshMs / 1000)}s
        </span>
      </div>

      {!books && !error && (
        <div style={{ padding: '14px 0', color: 'var(--cp-text-3)', fontSize: 13 }}>Loading order book…</div>
      )}
      {error && (
        <div style={{
          padding: '12px 14px', background: 'var(--cp-no-soft)', color: 'var(--cp-no-ink)',
          borderRadius: 8, fontSize: 13,
        }}>{error}</div>
      )}

      {books && books.length === 0 && (
        <div style={{ padding: '14px 0', color: 'var(--cp-text-3)', fontSize: 13 }}>No active orders yet on this market.</div>
      )}

      {books && books.map(b => (
        <div key={b.optionId} style={{
          padding: '14px 0',
          borderBottom: '1px solid var(--cp-line)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 500, fontSize: 14 }}>{b.label}</span>
            <span className="cp-num" style={{
              fontFamily: 'var(--cp-serif)', fontSize: 18, fontWeight: 500,
            }}>{Math.round(b.probability * 100)}%</span>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
            marginBottom: 8,
          }}>
            <SideCell side="YES" prob={b.probability} multiplier={b.yesMultiplier}
              matchedUsdt={b.matched.yesUsdt} unmatchedUsdt={b.unmatched.yesUsdt}/>
            <SideCell side="NO" prob={1 - b.probability} multiplier={b.noMultiplier}
              matchedUsdt={b.matched.noUsdt} unmatchedUsdt={b.unmatched.noUsdt}/>
          </div>

          <div style={{
            fontSize: 11.5, color: 'var(--cp-text-3)', display: 'flex', justifyContent: 'space-between',
          }}>
            <span>Total matched pool: <span className="cp-num" style={{ fontWeight: 600, color: 'var(--cp-text-2)' }}>{fmtUsdt(b.matched.poolUsdt)}</span></span>
            <span>House fee earned so far: <span className="cp-num">{fmtUsdt(b.matched.feeUsdt)}</span></span>
          </div>
        </div>
      ))}
    </section>
  );
}

function SideCell({ side, prob, multiplier, matchedUsdt, unmatchedUsdt }: {
  side: 'YES' | 'NO'; prob: number; multiplier: string; matchedUsdt: number; unmatchedUsdt: number;
}) {
  const soft = side === 'YES' ? 'var(--cp-yes-soft)' : 'var(--cp-no-soft)';
  const ink = side === 'YES' ? 'var(--cp-yes-ink)' : 'var(--cp-no-ink)';
  return (
    <div style={{
      background: soft, borderRadius: 10, padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        color: ink, fontWeight: 600, fontSize: 13,
      }}>
        <span>{side}</span>
        <span className="cp-num">{Math.round(prob * 100)}% <span style={{ opacity: 0.7, fontWeight: 500 }}>({multiplier})</span></span>
      </div>
      <div style={{ fontSize: 11.5, color: ink, opacity: 0.85, display: 'flex', justifyContent: 'space-between' }}>
        <span>Matched</span>
        <span className="cp-num" style={{ fontWeight: 600 }}>{fmtUsdt(matchedUsdt)}</span>
      </div>
      <div style={{ fontSize: 11.5, color: ink, opacity: 0.85, display: 'flex', justifyContent: 'space-between' }}>
        <span>Open</span>
        <span className="cp-num">{fmtUsdt(unmatchedUsdt)}</span>
      </div>
    </div>
  );
}
