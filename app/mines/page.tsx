'use client';

import React, { useEffect, useState } from 'react';
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
  const [recentlyHit, setRecentlyHit] = useState<number | null>(null);
  const [boardShake, setBoardShake] = useState(false);
  const [revealOrder, setRevealOrder] = useState<Record<number, number>>({}); // tile idx → reveal sequence number for stagger

  // When player busts, reveal the remaining mines in a dramatic stagger so
  // it feels like the board is "exposing" itself.
  useEffect(() => {
    if (!game?.hitMine || !game.finalMines) return;
    setBoardShake(true);
    const t = setTimeout(() => setBoardShake(false), 700);
    // assign reveal order: clicked mine first (instant), others staggered
    const order: Record<number, number> = { ...revealOrder };
    let n = 1;
    game.finalMines.forEach(m => {
      if (m !== recentlyHit && order[m] == null) order[m] = n++;
    });
    setRevealOrder(order);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.hitMine]);

  // Sparkle pop when a safe tile reveals — track most recently revealed.
  const [poppedTile, setPoppedTile] = useState<number | null>(null);
  useEffect(() => {
    if (!game || game.hitMine) return;
    if (game.revealed.length === 0) { setPoppedTile(null); return; }
    const newest = game.revealed[game.revealed.length - 1];
    setPoppedTile(newest);
    const t = setTimeout(() => setPoppedTile(null), 700);
    return () => clearTimeout(t);
  }, [game?.revealed.length]);

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
        setRecentlyHit(idx);
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
        <div style={{
          background: 'linear-gradient(165deg, #0B1F2E 0%, #15243A 100%)',
          borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', padding: 24,
          display: 'flex', flexDirection: 'column', gap: 18,
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          color: '#F5EFE2',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative aurora glow */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(60% 45% at 50% 0%, rgba(232,165,60,0.18), transparent 70%)',
          }}/>
          {/* Red bust flash overlay */}
          {game.hitMine && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5,
              background: 'radial-gradient(50% 40% at 50% 50%, rgba(210,74,58,0.35), transparent 70%)',
              animation: 'minesBustFlash 1.4s ease-out forwards',
            }}/>
          )}

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            position: 'relative', zIndex: 1,
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(245,239,226,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Multiplier</div>
              <div className="cp-num" style={{
                fontFamily: 'var(--cp-serif)', fontSize: 48, fontWeight: 400,
                color: game.hitMine ? '#FF6B6B' : '#7CE0BC',
                textShadow: game.hitMine ? '0 0 18px rgba(255,107,107,0.5)' : '0 0 18px rgba(124,224,188,0.4)',
                transition: 'color .3s',
              }}>
                {game.multiplier.toFixed(2)}×
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'rgba(245,239,226,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Cashout</div>
              <div className="cp-num" style={{ fontFamily: 'var(--cp-serif)', fontSize: 32, color: '#FFE0A4' }}>
                {fmtUsdt(stake * game.multiplier)}
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8,
            position: 'relative', zIndex: 1,
            transform: boardShake ? 'translate3d(2px,1px,0)' : undefined,
            animation: boardShake ? 'minesShake 0.55s ease-out' : undefined,
          }}>
            {Array.from({ length: game.total }, (_, i) => i).map(i => {
              const isRevealed = game.revealed.includes(i);
              const isMine = game.mineHits.includes(i) || (game.hitMine && game.finalMines?.includes(i));
              const isHitMine = game.mineHits.includes(i);
              const sequenceDelay = revealOrder[i] != null ? revealOrder[i] * 120 : 0;
              const justPopped = poppedTile === i;
              const flipped = isRevealed || isMine;
              return (
                <button
                  key={i}
                  onClick={() => reveal(i)}
                  disabled={busy || isRevealed || game.hitMine}
                  style={{
                    aspectRatio: '1 / 1',
                    border: 0, padding: 0, cursor: isRevealed || game.hitMine ? 'default' : 'pointer',
                    background: 'transparent', perspective: 600,
                    position: 'relative',
                  }}
                  className={justPopped ? 'mines-tile mines-pop' : 'mines-tile'}
                >
                  <div style={{
                    position: 'absolute', inset: 0, transformStyle: 'preserve-3d',
                    transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    transition: `transform 0.55s cubic-bezier(.4,.6,.3,1) ${sequenceDelay}ms`,
                  }}>
                    {/* FRONT — unrevealed tile */}
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: 10,
                      backfaceVisibility: 'hidden',
                      background: 'linear-gradient(155deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 10px rgba(0,0,0,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{
                        width: '40%', height: '40%', borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(232,165,60,0.12), transparent 70%)',
                      }}/>
                    </div>
                    {/* BACK — revealed gem or bomb */}
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: 10,
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      background: isMine
                        ? 'radial-gradient(circle at 30% 25%, #E8704E 0%, #7A1F1F 80%)'
                        : 'radial-gradient(circle at 30% 25%, #2EBB87 0%, #0A5E48 80%)',
                      border: isMine
                        ? '1px solid rgba(255,180,160,0.55)'
                        : '1px solid rgba(180,255,220,0.4)',
                      boxShadow: isMine
                        ? `0 0 20px rgba(210,74,58,${isHitMine ? 0.9 : 0.45}), inset 0 1px 0 rgba(255,255,255,0.15)`
                        : '0 0 18px rgba(46,187,135,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isMine ? <BombSvg/> : <GemSvg/>}
                    </div>
                  </div>
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
            <Button kind="primary" size="lg" full onClick={() => { setGame(null); setRevealOrder({}); setRecentlyHit(null); }}>
              New game
            </Button>
          )}

          <style jsx>{`
            @keyframes minesBustFlash {
              0% { opacity: 0; }
              30% { opacity: 1; }
              100% { opacity: 0; }
            }
            @keyframes minesShake {
              0%, 100% { transform: translate3d(0,0,0); }
              15% { transform: translate3d(-6px, -2px, 0); }
              30% { transform: translate3d(5px, 3px, 0); }
              45% { transform: translate3d(-4px, 2px, 0); }
              60% { transform: translate3d(3px, -3px, 0); }
              75% { transform: translate3d(-2px, 1px, 0); }
            }
            :global(.mines-tile.mines-pop)::after {
              content: '';
              position: absolute;
              inset: -8px;
              border-radius: 14px;
              pointer-events: none;
              background: radial-gradient(circle, rgba(124,224,188,0.55), transparent 65%);
              animation: minesPop 0.7s ease-out forwards;
            }
            @keyframes minesPop {
              0%   { opacity: 1; transform: scale(0.6); }
              100% { opacity: 0; transform: scale(1.3); }
            }
          `}</style>
        </div>
      )}
    </main>
  );
}

function GemSvg() {
  return (
    <svg viewBox="0 0 32 32" width="46%" height="46%" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.45))' }}>
      <defs>
        <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#A6FFD8"/>
          <stop offset="100%" stopColor="#0E7C66"/>
        </linearGradient>
        <linearGradient id="g2" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85"/>
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points="16,2 28,12 16,30 4,12" fill="url(#g1)" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="0.6"/>
      <polygon points="16,2 28,12 16,12" fill="url(#g2)"/>
      <polygon points="4,12 16,12 16,30" fill="rgba(0,0,0,0.18)"/>
      <line x1="4" y1="12" x2="28" y2="12" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6"/>
      <line x1="16" y1="2" x2="16" y2="30" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4"/>
    </svg>
  );
}

function BombSvg() {
  return (
    <svg viewBox="0 0 32 32" width="55%" height="55%" style={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.5))' }}>
      <defs>
        <radialGradient id="b1" cx="0.35" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="#5b3d3d"/>
          <stop offset="100%" stopColor="#1a0808"/>
        </radialGradient>
      </defs>
      {/* fuse */}
      <path d="M22 7 Q26 5 27 2" stroke="#E8A53C" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      <circle cx="27" cy="2" r="1.8" fill="#FFE0A4"/>
      <circle cx="27" cy="2" r="0.9" fill="#FFFFFF"/>
      {/* bomb body */}
      <circle cx="14" cy="18" r="11" fill="url(#b1)" stroke="#000" strokeOpacity="0.6"/>
      {/* highlight */}
      <ellipse cx="10" cy="13" rx="3.5" ry="2.2" fill="rgba(255,255,255,0.25)"/>
      {/* glint dot */}
      <circle cx="9" cy="11.5" r="0.9" fill="rgba(255,255,255,0.9)"/>
    </svg>
  );
}
