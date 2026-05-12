'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { useCp } from '@/app/layout-client';
import { fmtUsdt } from '@/lib/cp-data';
import { Button } from '@/components/cp/Primitives';

interface GameState {
  betId: string;
  total: number;
  mines: number;
  multiplier: number;
  revealed: number[];
  mineHits: number[];
  hitMine: boolean;
  finalMines?: number[];
}

export default function MinesPage() {
  const { user } = useCp();
  const [stake, setStake] = useState<number>(5);
  const [minesCount, setMinesCount] = useState<number>(3);
  const [game, setGame] = useState<GameState | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    if (!user) { toast.error('Sign in to bet'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/games/mines/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, amountUsdt: stake, minesCount }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Start failed');
      setGame({
        betId: d.betId, total: d.total, mines: d.mines,
        multiplier: d.multiplierAfterRevealed,
        revealed: [], mineHits: [], hitMine: false,
      });
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally { setBusy(false); }
  }

  async function reveal(idx: number) {
    if (!user || !game || game.hitMine) return;
    if (game.revealed.includes(idx)) return;
    setBusy(true);
    try {
      const r = await fetch('/api/games/mines/reveal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, betId: game.betId, tileIndex: idx }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Reveal failed');
      if (d.hitMine) {
        setGame(g => g && ({ ...g, revealed: d.revealed, mineHits: [idx], hitMine: true, finalMines: d.minePositions }));
        toast.error(`Boom. Lost ${fmtUsdt(stake)}.`);
      } else {
        setGame(g => g && ({ ...g, revealed: d.revealed, multiplier: d.multiplier }));
        if (d.autoCashedOut) {
          toast.success(`All safe tiles revealed — auto cashout ${fmtUsdt(d.payoutUsdt)}`);
          setGame(null);
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally { setBusy(false); }
  }

  async function cashout() {
    if (!user || !game) return;
    setBusy(true);
    try {
      const r = await fetch('/api/games/mines/cashout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, betId: game.betId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Cashout failed');
      toast.success(`Cashed out @${d.multiplier.toFixed(2)}× — won ${fmtUsdt(d.payoutUsdt)}`);
      setGame(null);
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally { setBusy(false); }
  }

  return (
    <main className="cp-page-pad" style={{ maxWidth: 720, margin: '0 auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--cp-serif)', fontWeight: 400, fontSize: 36, letterSpacing: '-0.015em' }}>Mines</h1>
      <p style={{ margin: 0, color: 'var(--cp-text-3)', fontSize: 13.5 }}>
        25 tiles. {minesCount} mines. Reveal safe tiles to raise the multiplier. Cash out anytime.
      </p>

      {!game ? (
        <div style={{ background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 11.5, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mines</label>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {[1, 3, 5, 10, 15, 24].map(n => (
                <button key={n} onClick={() => setMinesCount(n)} style={{
                  height: 36, padding: '0 14px', borderRadius: 999,
                  border: '1px solid', borderColor: minesCount === n ? 'transparent' : 'var(--cp-line-strong)',
                  background: minesCount === n ? 'var(--cp-ink)' : 'var(--cp-card)',
                  color: minesCount === n ? 'var(--cp-text-on-ink)' : 'var(--cp-text-2)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
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

          <Button kind="sun" size="lg" full onClick={start} disabled={busy || !user || stake < 1}>
            {!user ? 'Sign in to play' : busy ? 'Starting…' : `Place bet · ${fmtUsdt(stake)} · ${minesCount} mines`}
          </Button>
        </div>
      ) : (
        <div style={{ background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Multiplier</div>
              <div className="cp-num" style={{ fontFamily: 'var(--cp-serif)', fontSize: 40, fontWeight: 400, color: 'var(--cp-yes-ink)' }}>
                {game.multiplier.toFixed(2)}×
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11.5, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cashout</div>
              <div className="cp-num" style={{ fontFamily: 'var(--cp-serif)', fontSize: 28, color: 'var(--cp-text)' }}>
                {fmtUsdt(stake * game.multiplier)}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {Array.from({ length: game.total }, (_, i) => i).map(i => {
              const isRevealed = game.revealed.includes(i);
              const isMine = game.mineHits.includes(i) || (game.hitMine && game.finalMines?.includes(i));
              return (
                <button key={i} onClick={() => reveal(i)} disabled={busy || isRevealed || game.hitMine} style={{
                  aspectRatio: '1 / 1', borderRadius: 10, border: 0, cursor: isRevealed || game.hitMine ? 'default' : 'pointer',
                  background: isMine
                    ? 'var(--cp-no)' : isRevealed
                    ? 'var(--cp-yes-soft)' : 'var(--cp-card-sub)',
                  color: isMine ? '#fff' : isRevealed ? 'var(--cp-yes-ink)' : 'var(--cp-text-3)',
                  fontSize: 22, fontWeight: 600,
                  transition: 'all .15s', transform: isRevealed || isMine ? 'scale(1.0)' : 'scale(1.0)',
                }}>
                  {isMine ? '💣' : isRevealed ? '✓' : ''}
                </button>
              );
            })}
          </div>

          {!game.hitMine && game.revealed.length > 0 && (
            <Button kind="yes" size="lg" full onClick={cashout} disabled={busy}>
              Cash out @ {game.multiplier.toFixed(2)}× = {fmtUsdt(stake * game.multiplier)}
            </Button>
          )}
          {game.hitMine && (
            <Button kind="primary" size="lg" full onClick={() => setGame(null)}>
              New game
            </Button>
          )}
        </div>
      )}
    </main>
  );
}
