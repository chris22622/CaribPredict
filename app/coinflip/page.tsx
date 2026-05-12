'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { useCp } from '@/app/layout-client';
import { fmtUsdt } from '@/lib/cp-data';
import { Button } from '@/components/cp/Primitives';

export default function CoinFlipPage() {
  const { user } = useCp();
  const [pick, setPick] = useState<'HEADS' | 'TAILS'>('HEADS');
  const [stake, setStake] = useState<number>(5);
  const [last, setLast] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function flip() {
    if (!user) { toast.error('Sign in to bet'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/games/coinflip', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, pick, amountUsdt: stake }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Flip failed');
      setLast(d);
      if (d.won) toast.success(`${d.side} — won ${fmtUsdt(d.payoutUsdt)}`);
      else toast.error(`${d.side}${d.miss ? ' (house edge)' : ''} — lost ${fmtUsdt(stake)}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally { setBusy(false); }
  }

  return (
    <main className="cp-page-pad" style={{ maxWidth: 720, margin: '0 auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--cp-serif)', fontWeight: 400, fontSize: 36, letterSpacing: '-0.015em' }}>
        Coin Flip
      </h1>
      <p style={{ margin: 0, color: 'var(--cp-text-3)', fontSize: 13.5 }}>
        Double up in one tap. 1.95× payout, 5% house edge.
      </p>

      <div style={{
        background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)',
        padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {(['HEADS', 'TAILS'] as const).map(s => (
            <button key={s} onClick={() => setPick(s)} style={{
              height: 110, borderRadius: 14, border: 0, cursor: 'pointer',
              background: pick === s
                ? 'linear-gradient(180deg, var(--cp-sun) 0%, #E0941F 100%)'
                : 'var(--cp-card-sub)',
              color: pick === s ? 'var(--cp-ink)' : 'var(--cp-text-2)',
              fontFamily: 'var(--cp-serif)', fontSize: 36, fontWeight: 400,
              transition: 'all .15s',
              boxShadow: pick === s ? '0 6px 14px rgba(232,165,60,0.35)' : 'none',
            }}>{s === 'HEADS' ? '♔' : '♛'} {s}</button>
          ))}
        </div>

        <div>
          <label style={{ fontSize: 11.5, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stake</label>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, background: 'var(--cp-card-sub)', borderRadius: 10, border: '1px solid var(--cp-line)', padding: '8px 12px' }}>
            <input
              type="text" inputMode="decimal" value={stake}
              onChange={e => setStake(Math.max(0, parseFloat(e.target.value.replace(/[^\d.]/g,'')) || 0))}
              className="cp-num"
              style={{ flex: 1, height: 36, border: 0, outline: 'none', background: 'transparent', fontSize: 22, fontWeight: 600 }}
            />
            <span className="cp-num" style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-text-3)' }}>USDT</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {[1, 5, 10, 25, 100].map(v => (
              <button key={v} onClick={() => setStake(v)} style={{
                height: 26, padding: '0 12px', borderRadius: 999, border: '1px solid var(--cp-line-strong)',
                background: 'var(--cp-card)', color: 'var(--cp-text-2)', fontSize: 12, cursor: 'pointer',
              }}><span className="cp-num">${v}</span></button>
            ))}
          </div>
        </div>

        <Button kind="sun" size="lg" full onClick={flip} disabled={busy || !user || stake < 1}>
          {!user ? 'Sign in to bet' : busy ? 'Flipping…' : `Flip · win ${fmtUsdt(stake * 1.95)}`}
        </Button>
      </div>

      {last && (
        <div style={{
          background: last.won ? 'var(--cp-yes-soft)' : 'var(--cp-no-soft)',
          color: last.won ? 'var(--cp-yes-ink)' : 'var(--cp-no-ink)',
          borderRadius: 12, padding: '14px 16px', fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <strong>{last.side}</strong> {last.miss && ' (5% house edge)'} ·
            {last.won ? ` won ${fmtUsdt(last.payoutUsdt)}` : ` lost ${fmtUsdt(stake)}`}
          </div>
          <a href={`/verify?seed=${last.serverSeed}&hash=${last.serverSeedHash}&cs=${last.clientSeed}&nonce=${last.nonce}&game=coinflip`}
             style={{ color: 'inherit', fontSize: 11.5, textDecoration: 'underline' }}>Verify →</a>
        </div>
      )}
    </main>
  );
}
