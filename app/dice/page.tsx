'use client';

import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useCp } from '@/app/layout-client';
import { fmtUsdt } from '@/lib/cp-data';
import { Button } from '@/components/cp/Primitives';

export default function DicePage() {
  const { user } = useCp();
  const [stake, setStake] = useState<number>(5);
  const [target, setTarget] = useState<number>(50);
  const [direction, setDirection] = useState<'over' | 'under'>('over');
  const [last, setLast] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const winProb = direction === 'under' ? (target - 1) / 100 : (99 - target) / 100;
  const mult = winProb > 0 ? Math.floor((0.95 / winProb) * 100) / 100 : 0;
  const potentialWin = stake * mult;

  async function roll() {
    if (!user) { toast.error('Sign in to bet'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/games/dice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, target, direction, amountUsdt: stake }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Roll failed');
      setLast(d);
      if (d.won) toast.success(`Rolled ${d.roll.toFixed(2)} — won ${fmtUsdt(d.payoutUsdt)}`);
      else toast.error(`Rolled ${d.roll.toFixed(2)} — lost ${fmtUsdt(stake)}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally { setBusy(false); }
  }

  // Visual slider showing win-band on a 0-100 strip
  const winBandLeft  = direction === 'under' ? 0 : target;
  const winBandRight = direction === 'under' ? target : 100;

  return (
    <main className="cp-page-pad" style={{ maxWidth: 720, margin: '0 auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--cp-serif)', fontWeight: 400, fontSize: 36, letterSpacing: '-0.015em' }}>Dice</h1>
      <p style={{ margin: 0, color: 'var(--cp-text-3)', fontSize: 13.5 }}>
        Pick a target. Roll 0.00–99.99. Lowest house edge in the casino.
      </p>

      <div style={{ background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Strip viz */}
        <div style={{ position: 'relative', height: 38, background: 'var(--cp-no-soft)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${winBandLeft}%`, width: `${winBandRight - winBandLeft}%`,
            background: 'var(--cp-yes-soft)',
          }}/>
          {last && (
            <div style={{
              position: 'absolute', top: -4, bottom: -4,
              left: `${last.roll}%`, width: 3,
              background: 'var(--cp-ink)',
              transform: 'translateX(-50%)',
              borderRadius: 999,
            }}/>
          )}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 14px', fontSize: 11, color: 'var(--cp-text-2)', fontFamily: 'var(--cp-mono)', fontWeight: 600,
          }}>
            <span>0</span><span>{target.toFixed(0)}</span><span>100</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {(['under', 'over'] as const).map(d => (
            <button key={d} onClick={() => setDirection(d)} style={{
              height: 44, borderRadius: 10, border: 0, cursor: 'pointer',
              background: direction === d ? 'var(--cp-ink)' : 'var(--cp-card-sub)',
              color: direction === d ? 'var(--cp-text-on-ink)' : 'var(--cp-text-2)',
              fontWeight: 600, fontSize: 14,
            }}>Roll {d === 'under' ? 'UNDER' : 'OVER'} {target.toFixed(0)}</button>
          ))}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <label style={{ fontSize: 11.5, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target</label>
            <span className="cp-num" style={{ fontWeight: 600 }}>{target.toFixed(0)} · {(winProb * 100).toFixed(2)}% to win · {mult.toFixed(2)}×</span>
          </div>
          <input
            type="range" min={2} max={98} step={1} value={target}
            onChange={e => setTarget(parseInt(e.target.value, 10))}
            style={{ width: '100%', marginTop: 8 }}
          />
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

        <Button kind="sun" size="lg" full onClick={roll} disabled={busy || !user || stake < 1}>
          {!user ? 'Sign in to bet' : busy ? 'Rolling…' : `Roll · win up to ${fmtUsdt(potentialWin)}`}
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
            Roll <strong className="cp-num">{last.roll.toFixed(2)}</strong> · {last.won ? `won ${fmtUsdt(last.payoutUsdt)}` : `lost ${fmtUsdt(stake)}`}
          </div>
          <a href={`/verify?seed=${last.serverSeed}&hash=${last.serverSeedHash}&cs=${last.clientSeed}&nonce=${last.nonce}&game=dice`}
             style={{ color: 'inherit', fontSize: 11.5, textDecoration: 'underline' }}>Verify →</a>
        </div>
      )}
    </main>
  );
}
