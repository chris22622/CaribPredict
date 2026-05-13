'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useCp } from '@/app/layout-client';
import { fmtUsdt } from '@/lib/cp-data';
import { Button } from '@/components/cp/Primitives';

type Side = 'HEADS' | 'TAILS';

export default function CoinFlipPage() {
  const { user, refreshBalance } = useCp();
  const [pick, setPick] = useState<Side>('HEADS');
  const [stake, setStake] = useState<number>(5);
  const [last, setLast] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [coinSide, setCoinSide] = useState<Side>('HEADS');     // which side is showing
  const [flipping, setFlipping] = useState(false);             // animating
  const [flipKey, setFlipKey] = useState(0);                   // bumps to re-trigger CSS animation
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function flip() {
    if (!user) { toast.error('Sign in to bet'); return; }
    setBusy(true);
    setLast(null);
    setFlipping(true);
    setFlipKey(k => k + 1);

    try {
      const r = await fetch('/api/games/coinflip', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, pick, amountUsdt: stake }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Flip failed');

      // Hold the spin for a beat so it feels weighty.
      await new Promise(res => setTimeout(res, 1500));
      setFlipping(false);
      setCoinSide(d.side as Side);
      setLast(d);
      refreshBalance();

      setTimeout(() => {
        if (d.won) toast.success(`${d.side} — won ${fmtUsdt(d.payoutUsdt)}`);
        else toast.error(`${d.side}${d.miss ? ' (house edge)' : ''} — lost ${fmtUsdt(stake)}`);
      }, 200);
    } catch (e: any) {
      setFlipping(false);
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
        background: 'linear-gradient(165deg, #0B1F2E 0%, #15243A 100%)',
        borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', padding: 24,
        display: 'flex', flexDirection: 'column', gap: 22,
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        color: '#F5EFE2', position: 'relative', overflow: 'hidden',
      }}>
        {/* Aurora */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(60% 50% at 50% 10%, rgba(232,165,60,0.16), transparent 70%)',
        }}/>

        {/* COIN STAGE */}
        <div style={{
          position: 'relative', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Shadow ellipse */}
          <div style={{
            position: 'absolute', bottom: 24, width: 140, height: 12,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.45), transparent 70%)',
            filter: 'blur(2px)',
            transform: flipping ? 'scale(0.5)' : 'scale(1)',
            opacity: flipping ? 0.4 : 0.9,
            transition: 'transform 0.7s, opacity 0.7s',
          }}/>
          <Coin
            key={flipKey}
            side={coinSide}
            flipping={flipping}
            big={!last}
            won={last?.won ?? null}
          />
          {/* Result label */}
          {last && !flipping && (
            <div style={{
              position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center',
              fontSize: 12, color: 'rgba(245,239,226,0.7)',
              letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700,
            }}>
              Landed on <span style={{ color: last.won ? '#7CE0BC' : '#FF6B6B' }}>{last.side}</span>
            </div>
          )}
        </div>

        {/* PICK */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, position: 'relative' }}>
          {(['HEADS', 'TAILS'] as const).map(s => (
            <button key={s} onClick={() => setPick(s)} disabled={busy} style={{
              height: 64, borderRadius: 12, border: 0, cursor: busy ? 'wait' : 'pointer',
              background: pick === s
                ? 'linear-gradient(180deg, #E8A53C, #B57920)'
                : 'rgba(255,255,255,0.05)',
              color: pick === s ? '#0B1F2E' : '#F5EFE2',
              fontFamily: 'var(--cp-serif)', fontSize: 22, fontWeight: 400,
              letterSpacing: '0.04em',
              boxShadow: pick === s
                ? 'inset 0 1px 0 rgba(255,255,255,0.4), 0 6px 18px rgba(232,165,60,0.35)'
                : 'inset 0 1px 0 rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 28 }}>{s === 'HEADS' ? '♔' : '♛'}</span> {s}
            </button>
          ))}
        </div>

        {/* STAKE */}
        <div style={{ position: 'relative' }}>
          <label style={{ fontSize: 11, color: 'rgba(245,239,226,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Stake</label>
          <div style={{
            marginTop: 6, display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(0,0,0,0.25)', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.08)', padding: '8px 12px',
          }}>
            <input
              type="text" inputMode="decimal" value={stake}
              onChange={e => setStake(Math.max(0, parseFloat(e.target.value.replace(/[^\d.]/g,'')) || 0))}
              className="cp-num" disabled={busy}
              style={{ flex: 1, height: 36, border: 0, outline: 'none', background: 'transparent', fontSize: 22, fontWeight: 600, color: '#F5EFE2' }}
            />
            <span className="cp-num" style={{ fontSize: 12, fontWeight: 600, color: 'rgba(245,239,226,0.6)' }}>USDT</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {[1, 5, 10, 25, 100].map(v => (
              <button key={v} onClick={() => setStake(v)} disabled={busy} style={{
                height: 26, padding: '0 12px', borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.15)',
                background: stake === v ? 'rgba(232,165,60,0.25)' : 'rgba(255,255,255,0.05)',
                color: '#F5EFE2', fontSize: 12, cursor: 'pointer',
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
          background: last.won ? 'rgba(124,224,188,0.18)' : 'rgba(255,107,107,0.18)',
          color: last.won ? '#9FFFD0' : '#FFB1A4',
          border: `1px solid ${last.won ? 'rgba(124,224,188,0.35)' : 'rgba(255,107,107,0.35)'}`,
          borderRadius: 12, padding: '14px 16px', fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <strong>{last.side}</strong>{last.miss && ' (5% house edge)'} ·
            {last.won ? ` won ${fmtUsdt(last.payoutUsdt)}` : ` lost ${fmtUsdt(stake)}`}
          </div>
          <a href={`/verify?seed=${last.serverSeed}&hash=${last.serverSeedHash}&cs=${last.clientSeed}&nonce=${last.nonce}&game=coinflip`}
             style={{ color: 'inherit', fontSize: 11.5, textDecoration: 'underline' }}>Verify →</a>
        </div>
      )}
    </main>
  );
}

// ─── Coin component ───────────────────────────────────────────────────────

function Coin({ side, flipping, big, won }: { side: Side; flipping: boolean; big: boolean; won: boolean | null }) {
  // Coin uses two stacked faces in a 3D-preserved container that spins on
  // the X axis. The active face is determined by which side is on top after
  // the spin settles.
  // - Heads = ♔ on a gold gradient
  // - Tails = ♛ on a slightly different gold tone
  const settleRot = side === 'HEADS' ? 0 : 180;
  return (
    <div style={{
      width: 160, height: 160, perspective: 800,
      filter: won === true ? 'drop-shadow(0 0 28px rgba(255,224,156,0.55))'
        : won === false ? 'drop-shadow(0 0 22px rgba(255,107,107,0.4))'
        : 'drop-shadow(0 6px 18px rgba(0,0,0,0.45))',
      transition: 'filter 0.4s',
    }}>
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        transform: flipping
          ? `rotateX(${1080 + settleRot}deg)`
          : `rotateX(${settleRot}deg)`,
        transition: flipping
          ? 'transform 1.5s cubic-bezier(.34,.04,.26,1)'
          : 'transform 0.5s cubic-bezier(.34,1.56,.64,1)',
      }}>
        <CoinFace label="HEADS" glyph="♔" front/>
        <CoinFace label="TAILS" glyph="♛"/>
      </div>
      {/* Subtle bobbing while flipping */}
      <style jsx>{`
        @keyframes coinBob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-22px); }
        }
      `}</style>
    </div>
  );
}

function CoinFace({ label, glyph, front }: { label: string; glyph: string; front?: boolean }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      backfaceVisibility: 'hidden',
      transform: front ? 'rotateX(0deg)' : 'rotateX(180deg)',
      borderRadius: '50%',
      background: front
        ? 'radial-gradient(circle at 30% 25%, #FFE9A6 0%, #E8A53C 55%, #8C5A14 100%)'
        : 'radial-gradient(circle at 30% 25%, #FFE0A4 0%, #C58A26 55%, #6F470F 100%)',
      boxShadow: 'inset 0 0 0 4px rgba(255,255,255,0.15), inset 0 -10px 24px rgba(0,0,0,0.35), 0 8px 22px rgba(0,0,0,0.45)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: '#2A1A05',
      fontFamily: 'var(--cp-serif)',
    }}>
      {/* Edge rim */}
      <div style={{
        position: 'absolute', inset: 6, borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.18)',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.18)',
      }}/>
      <div style={{ fontSize: 84, lineHeight: 1, marginTop: -8, textShadow: '0 2px 4px rgba(0,0,0,0.15)' }}>
        {glyph}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.16em', marginTop: 2, opacity: 0.85 }}>
        {label}
      </div>
    </div>
  );
}
