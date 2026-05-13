'use client';

import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useCp } from '@/app/layout-client';
import { fmtUsdt } from '@/lib/cp-data';
import { Button } from '@/components/cp/Primitives';
import { plinkoMultipliers, PlinkoRisk } from '@/lib/games';
import PlinkoStage from '@/components/cp/games/PlinkoStage';

const ROW_OPTIONS = [8, 12, 16];
const RISK_OPTIONS: PlinkoRisk[] = ['low', 'medium', 'high'];

interface PendingDrop {
  id: string;
  path: ('L' | 'R')[];
  bin: number;
  multiplier: number;
  payoutUsdt: number;
  stake: number;
}

export default function PlinkoPage() {
  const { user } = useCp();
  const [stake, setStake] = useState<number>(5);
  const [rows, setRows] = useState<number>(8);
  const [risk, setRisk] = useState<PlinkoRisk>('medium');
  const [last, setLast] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);

  const mults = plinkoMultipliers(rows, risk);

  async function drop() {
    if (!user) { toast.error('Sign in to bet'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/games/plinko', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, rows, risk, amountUsdt: stake }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Plinko failed');
      setLast(d);
      setPendingDrop({
        id: crypto.randomUUID(),
        path: d.path, bin: d.bin,
        multiplier: d.multiplier, payoutUsdt: d.payoutUsdt,
        stake,
      });
    } catch (e: any) {
      toast.error(e.message || 'Failed');
      setBusy(false);
    }
  }

  function handleDropComplete(bin: number, multiplier: number, payoutUsdt: number) {
    if (multiplier >= 2) toast.success(`Bin ${bin}: ${multiplier}× — won ${fmtUsdt(payoutUsdt)}`);
    else if (multiplier >= 1) toast(`Bin ${bin}: ${multiplier}× — won ${fmtUsdt(payoutUsdt)}`);
    else toast.error(`Bin ${bin}: ${multiplier}× — kept ${fmtUsdt(payoutUsdt)}`);
    setBusy(false);
  }

  return (
    <main className="cp-page-pad" style={{ maxWidth: 780, margin: '0 auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--cp-serif)', fontWeight: 400, fontSize: 36, letterSpacing: '-0.015em' }}>Plinko</h1>
      <p style={{ margin: 0, color: 'var(--cp-text-3)', fontSize: 13.5 }}>
        Drop a ball through {rows} rows of pegs. Edges pay big. Middle pays little.
      </p>

      {/* Board */}
      <PlinkoStage
        rows={rows}
        multipliers={mults}
        pendingDrop={pendingDrop}
        onDropComplete={handleDropComplete}
      />

      {/* Controls */}
      <div style={{
        background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)',
        padding: 18, display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk</label>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {RISK_OPTIONS.map(r => (
              <button key={r} onClick={() => setRisk(r)} style={{
                flex: 1, height: 36, borderRadius: 8, border: 0, cursor: 'pointer',
                background: risk === r ? 'var(--cp-ink)' : 'var(--cp-card-sub)',
                color: risk === r ? 'var(--cp-text-on-ink)' : 'var(--cp-text-2)',
                fontWeight: 600, fontSize: 13, textTransform: 'capitalize',
              }}>{r}</button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11.5, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rows</label>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {ROW_OPTIONS.map(n => (
              <button key={n} onClick={() => setRows(n)} style={{
                flex: 1, height: 36, borderRadius: 8, border: 0, cursor: 'pointer',
                background: rows === n ? 'var(--cp-ink)' : 'var(--cp-card-sub)',
                color: rows === n ? 'var(--cp-text-on-ink)' : 'var(--cp-text-2)',
                fontWeight: 600, fontSize: 13,
              }}><span className="cp-num">{n}</span></button>
            ))}
          </div>
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

        <Button kind="sun" size="lg" full onClick={drop} disabled={busy || !user || stake < 1}>
          {!user ? 'Sign in to bet' : busy ? 'Dropping…' : `Drop ball · ${fmtUsdt(stake)}`}
        </Button>
      </div>

      {last && !busy && (
        <div style={{
          background: last.payoutUsdt > stake ? 'var(--cp-yes-soft)' : last.payoutUsdt > 0 ? 'var(--cp-sun-soft)' : 'var(--cp-no-soft)',
          color: last.payoutUsdt > stake ? 'var(--cp-yes-ink)' : last.payoutUsdt > 0 ? 'var(--cp-ink)' : 'var(--cp-no-ink)',
          borderRadius: 12, padding: '14px 16px', fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            Bin <strong className="cp-num">{last.bin}</strong> · <strong className="cp-num">{last.multiplier}×</strong>
            {' '}· {last.payoutUsdt > stake ? `won ${fmtUsdt(last.payoutUsdt - stake)}` : last.payoutUsdt > 0 ? `kept ${fmtUsdt(last.payoutUsdt)}` : `lost ${fmtUsdt(stake)}`}
          </div>
          <a href={`/verify?seed=${last.serverSeed}&hash=${last.serverSeedHash}&cs=${last.clientSeed}&nonce=${last.nonce}&game=plinko`}
             style={{ color: 'inherit', fontSize: 11.5, textDecoration: 'underline' }}>Verify →</a>
        </div>
      )}
    </main>
  );
}
