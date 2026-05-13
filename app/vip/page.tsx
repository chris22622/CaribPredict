'use client';

import React, { useEffect, useState } from 'react';
import { useCp } from '@/app/layout-client';
import { fmtUsdt } from '@/lib/cp-data';
import { VipTier } from '@/lib/vip';

interface VipStatus {
  lifetimeWageredUsdt: number;
  wageredLast30Usdt: number;
  lifetimeFeesPaidEstUsdt: number;
  currentTier: VipTier;
  nextTier: VipTier | null;
  progress: number;
  remainingToNextUsdt: number;
  rakebackPendingThisWeekUsdt: number;
  tiers: VipTier[];
}

export default function VipPage() {
  const { user } = useCp();
  const [s, setS] = useState<VipStatus | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/vip/status?userId=${user.id}`).then(r => r.json()).then(setS).catch(() => {/*ignore*/});
  }, [user]);

  if (!user) {
    return (
      <main className="cp-page-pad" style={{ maxWidth: 720, margin: '0 auto', padding: '28px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--cp-serif)', fontWeight: 400, fontSize: 36 }}>VIP</h1>
        <p style={{ marginTop: 12, color: 'var(--cp-text-3)' }}>Sign in to see your VIP tier and rakeback.</p>
      </main>
    );
  }
  if (!s) {
    return (
      <main className="cp-page-pad" style={{ maxWidth: 720, margin: '0 auto', padding: '28px' }}>
        <div style={{ color: 'var(--cp-text-3)', fontSize: 13 }}>Loading…</div>
      </main>
    );
  }

  const t = s.currentTier;
  const n = s.nextTier;

  return (
    <main className="cp-page-pad" style={{ maxWidth: 920, margin: '0 auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(155deg, var(--cp-ink) 0%, var(--cp-ink-3) 100%)`,
        borderRadius: 18, padding: '28px 28px 22px',
        color: 'var(--cp-text-on-ink)', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: -60, top: -60, width: 280, height: 280, borderRadius: '50%',
          background: `radial-gradient(circle, ${t.color}66 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}/>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--cp-text-on-ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
              Your tier
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
              <span style={{ fontSize: 48, lineHeight: 1 }}>{t.emoji}</span>
              <h1 style={{ margin: 0, fontFamily: 'var(--cp-serif)', fontWeight: 400, fontSize: 48, letterSpacing: '-0.02em' }}>
                {t.name}
              </h1>
            </div>
            <div className="cp-num" style={{ marginTop: 10, fontSize: 14, color: 'var(--cp-text-on-ink-2)' }}>
              {(t.rakebackBps / 100).toFixed(0)}% rakeback · {fmtUsdt(s.lifetimeWageredUsdt)} wagered lifetime
            </div>
          </div>
          <div style={{
            textAlign: 'right', minWidth: 200,
          }}>
            <div style={{ fontSize: 11.5, color: 'var(--cp-text-on-ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
              Rakeback this week
            </div>
            <div className="cp-num" style={{ fontFamily: 'var(--cp-serif)', fontSize: 36, color: t.color, marginTop: 4 }}>
              {fmtUsdt(s.rakebackPendingThisWeekUsdt)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--cp-text-on-ink-3)', marginTop: 4 }}>
              Paid every Monday
            </div>
          </div>
        </div>

        {/* Progress to next */}
        {n ? (
          <div style={{ marginTop: 22 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--cp-text-on-ink-2)' }}>
                Progress to <strong style={{ color: 'var(--cp-text-on-ink)' }}>{n.name}</strong>
              </span>
              <span className="cp-num" style={{ fontSize: 12, color: 'var(--cp-text-on-ink-2)' }}>
                {fmtUsdt(s.remainingToNextUsdt)} to go
              </span>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${s.progress * 100}%`,
                background: `linear-gradient(90deg, ${t.color}, ${n.color})`,
                transition: 'width .35s ease',
              }}/>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 22, fontSize: 13, color: 'var(--cp-sun)' }}>
            🏆 Top tier reached — Obsidian. Concierge desk applies.
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="cp-portfolio-grid" style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12,
      }}>
        <Stat label="Wagered last 30 days" value={fmtUsdt(s.wageredLast30Usdt)}/>
        <Stat label="House fees paid (est.)" value={fmtUsdt(s.lifetimeFeesPaidEstUsdt)}/>
        <Stat label="Rakeback rate" value={`${(t.rakebackBps / 100).toFixed(0)}%`}/>
      </div>

      {/* Tier ladder */}
      <section style={{
        background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)',
        padding: 18, display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <h2 style={{ margin: '0 0 8px', fontFamily: 'var(--cp-serif)', fontWeight: 400, fontSize: 22 }}>
          Tier ladder
        </h2>
        {s.tiers.map(row => {
          const isCurrent = row.id === t.id;
          const reached = s.lifetimeWageredUsdt >= row.minWageredUsdt;
          return (
            <div key={row.id} style={{
              display: 'grid', gridTemplateColumns: '36px 1fr auto auto', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 10,
              background: isCurrent ? `${row.color}1A` : 'var(--cp-card-sub)',
              border: '1px solid', borderColor: isCurrent ? `${row.color}AA` : 'var(--cp-line)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: row.color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>{row.emoji}</div>
              <div>
                <div style={{
                  fontFamily: 'var(--cp-serif)', fontSize: 16,
                  color: reached ? 'var(--cp-text)' : 'var(--cp-text-3)', fontWeight: 500,
                }}>{row.name}{isCurrent && <span style={{ marginLeft: 8, fontSize: 11, color: row.color, fontFamily: 'var(--cp-mono)', fontWeight: 700 }}>YOU</span>}</div>
                <div style={{ fontSize: 11.5, color: 'var(--cp-text-3)', marginTop: 1 }}>
                  {row.perks.join(' · ')}
                </div>
              </div>
              <div className="cp-num" style={{ fontSize: 12.5, color: 'var(--cp-text-2)', textAlign: 'right' }}>
                {fmtUsdt(row.minWageredUsdt)}+
              </div>
              <div className="cp-num" style={{
                fontSize: 13, fontWeight: 700,
                color: reached ? row.color : 'var(--cp-text-3)',
                minWidth: 56, textAlign: 'right',
              }}>
                {(row.rakebackBps / 100).toFixed(0)}%
              </div>
            </div>
          );
        })}
      </section>

      <div style={{
        padding: 14, borderRadius: 12, background: 'var(--cp-card-sub)',
        border: '1px solid var(--cp-line)', fontSize: 12.5, color: 'var(--cp-text-2)', lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--cp-text)' }}>How rakeback works.</strong>{' '}
        Every bet you place pays a small house fee (5% on matched markets and CaribCrash, ~5% via the
        edge baked into instant games). Your tier rakeback rate is applied to that fee and credited to
        your balance every Monday. Tiers are based on lifetime wagered USDT across all games and only
        go up — they never demote.
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'var(--cp-card)', borderRadius: 12, border: '1px solid var(--cp-line)',
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
      <div className="cp-num" style={{ fontFamily: 'var(--cp-serif)', fontSize: 26, marginTop: 4 }}>{value}</div>
    </div>
  );
}
