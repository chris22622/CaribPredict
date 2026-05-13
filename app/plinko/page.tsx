'use client';

import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useCp } from '@/app/layout-client';
import { fmtUsdt } from '@/lib/cp-data';
import { Button } from '@/components/cp/Primitives';
import { plinkoMultipliers, PlinkoRisk } from '@/lib/games';

const ROW_OPTIONS = [8, 12, 16];
const RISK_OPTIONS: PlinkoRisk[] = ['low', 'medium', 'high'];

type BallState = { row: number; col: number; settling: boolean } | null;

export default function PlinkoPage() {
  const { user } = useCp();
  const [stake, setStake] = useState<number>(5);
  const [rows, setRows] = useState<number>(8);
  const [risk, setRisk] = useState<PlinkoRisk>('medium');
  const [last, setLast] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [ball, setBall] = useState<BallState>(null);
  const [activeBin, setActiveBin] = useState<number | null>(null);
  const animTimer = useRef<NodeJS.Timeout | null>(null);

  const mults = plinkoMultipliers(rows, risk);

  useEffect(() => () => { if (animTimer.current) clearTimeout(animTimer.current); }, []);

  async function drop() {
    if (!user) { toast.error('Sign in to bet'); return; }
    setBusy(true);
    setActiveBin(null);
    try {
      const r = await fetch('/api/games/plinko', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, rows, risk, amountUsdt: stake }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Plinko failed');
      setLast(d);
      animatePath(d.path, d.bin, d.multiplier, d.payoutUsdt);
    } catch (e: any) {
      toast.error(e.message || 'Failed');
      setBusy(false);
    }
  }

  function animatePath(path: ('L' | 'R')[], finalBin: number, multiplier: number, payoutUsdt: number) {
    // Start at top center: col = rows/2 (using fractional col positions)
    // Each row, col shifts by -0.5 (L) or +0.5 (R). After N rows, col = bin.
    const stepMs = 90;
    setBall({ row: 0, col: rows / 2, settling: false });
    let i = 0;
    const tick = () => {
      i++;
      if (i > path.length) {
        // Done
        setBall({ row: path.length, col: finalBin, settling: true });
        setActiveBin(finalBin);
        if (multiplier >= 2) toast.success(`Bin ${finalBin}: ${multiplier}× — won ${fmtUsdt(payoutUsdt)}`);
        else if (multiplier >= 1) toast(`Bin ${finalBin}: ${multiplier}× — won ${fmtUsdt(payoutUsdt)}`);
        else toast.error(`Bin ${finalBin}: ${multiplier}× — kept ${fmtUsdt(payoutUsdt)}`);
        setBusy(false);
        return;
      }
      const d = path[i - 1];
      setBall(b => b && ({ row: i, col: b.col + (d === 'L' ? -0.5 : 0.5), settling: false }));
      animTimer.current = setTimeout(tick, stepMs);
    };
    animTimer.current = setTimeout(tick, stepMs);
  }

  // Rendering
  const boardW = 520;
  const boardH = 360 + rows * 8; // taller for more rows
  const padX = 24;
  const innerW = boardW - 2 * padX;
  const rowGap = (boardH - 80) / (rows + 1);
  const colUnit = innerW / rows;  // distance between adjacent pegs at the bottom

  function pegPos(row: number, col: number) {
    // Triangle of pegs: row r has r+1 pegs from col 0..r
    const y = 40 + row * rowGap;
    const xCenter = boardW / 2 + (col - row / 2) * colUnit;
    return { x: xCenter, y };
  }
  function ballPos() {
    if (!ball) return null;
    // Visual col on the triangle is 0..ball.row, with cell-center spacing colUnit
    const y = 40 + ball.row * rowGap - 12;
    const xCenter = boardW / 2 + (ball.col - ball.row / 2) * colUnit;
    return { x: xCenter, y };
  }

  return (
    <main className="cp-page-pad" style={{ maxWidth: 780, margin: '0 auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--cp-serif)', fontWeight: 400, fontSize: 36, letterSpacing: '-0.015em' }}>Plinko</h1>
      <p style={{ margin: 0, color: 'var(--cp-text-3)', fontSize: 13.5 }}>
        Drop a ball through {rows} rows of pegs. Edges pay big. Middle pays little.
      </p>

      {/* Board */}
      <div style={{
        background: 'linear-gradient(180deg, var(--cp-ink) 0%, var(--cp-ink-2) 100%)',
        borderRadius: 16, padding: '12px 12px 0', position: 'relative', overflow: 'hidden',
      }}>
        <svg width={boardW} height={boardH} viewBox={`0 0 ${boardW} ${boardH}`}
          style={{ display: 'block', width: '100%', height: 'auto', maxWidth: '100%' }}>
          {/* Pegs */}
          {Array.from({ length: rows + 1 }, (_, r) =>
            Array.from({ length: r + 1 }, (_, c) => {
              const p = pegPos(r, c);
              return <circle key={`${r}-${c}`} cx={p.x} cy={p.y} r={3.2} fill="rgba(241,236,222,0.85)"/>;
            })
          )}

          {/* Ball */}
          {ball && (() => {
            const pos = ballPos();
            if (!pos) return null;
            return (
              <circle cx={pos.x} cy={pos.y} r={10} fill="var(--cp-sun)"
                style={{ transition: 'cx 0.09s ease-out, cy 0.09s ease-out', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}/>
            );
          })()}

          {/* Bins */}
          {mults.map((m, i) => {
            const x = boardW / 2 + (i - rows / 2) * colUnit - colUnit / 2 + 2;
            const w = colUnit - 4;
            const y = 40 + rows * rowGap + 8;
            const h = 38;
            const isActive = activeBin === i;
            const tone = m >= 5 ? 'var(--cp-no)' : m >= 2 ? 'var(--cp-sun)' : m >= 1 ? 'var(--cp-yes)' : 'rgba(241,236,222,0.18)';
            const fg = m >= 1 ? '#fff' : 'var(--cp-text-on-ink-2)';
            return (
              <g key={i}>
                <rect x={x} y={y} width={w} height={h} rx={5} fill={tone}
                  opacity={isActive ? 1 : 0.7}
                  style={{
                    transition: 'opacity .2s',
                    filter: isActive ? 'drop-shadow(0 0 12px var(--cp-sun))' : 'none',
                  }}/>
                <text x={x + w / 2} y={y + h / 2 + 4}
                  fontSize={Math.min(13, Math.max(9, colUnit * 0.32))}
                  fontFamily="var(--cp-mono)" fontWeight={700}
                  textAnchor="middle" fill={fg}>
                  {m < 10 ? m.toFixed(m % 1 ? 1 : 0) : Math.round(m)}×
                </text>
              </g>
            );
          })}
        </svg>
      </div>

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
