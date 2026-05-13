'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  const [markerPos, setMarkerPos] = useState<number | null>(null);
  const [diceFace, setDiceFace] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [tumbling, setTumbling] = useState(false);
  const tumbleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const winProb = direction === 'under' ? (target - 1) / 100 : (99 - target) / 100;
  const mult = winProb > 0 ? Math.floor((0.95 / winProb) * 100) / 100 : 0;
  const potentialWin = stake * mult;

  async function roll() {
    if (!user) { toast.error('Sign in to bet'); return; }
    setBusy(true);
    setLast(null);
    setMarkerPos(null);
    setTumbling(true);

    // Tumble the dice with a fast face shuffle while the API call is in flight.
    let i = 0;
    tumbleTimerRef.current && clearInterval(tumbleTimerRef.current);
    tumbleTimerRef.current = setInterval(() => {
      i = (i + 1) % 6;
      setDiceFace((i + 1) as any);
    }, 90);

    try {
      const r = await fetch('/api/games/dice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, target, direction, amountUsdt: stake }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Roll failed');

      // Hold the tumble a little so it feels weighty, then settle.
      await new Promise(res => setTimeout(res, 650));
      if (tumbleTimerRef.current) { clearInterval(tumbleTimerRef.current); tumbleTimerRef.current = null; }
      setTumbling(false);
      // Final face — map 0..99.99 into 1..6
      const face = (Math.min(5, Math.floor(d.roll / (100 / 6))) + 1) as 1|2|3|4|5|6;
      setDiceFace(face);

      // Animate marker from 0 to roll value with overshoot.
      const start = performance.now();
      const dur = 800;
      const animMarker = () => {
        const t = Math.min(1, (performance.now() - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        setMarkerPos(eased * d.roll);
        if (t < 1) requestAnimationFrame(animMarker);
        else setMarkerPos(d.roll);
      };
      requestAnimationFrame(animMarker);

      setLast(d);
      // Show the toast slightly after the animation kicks off for drama.
      setTimeout(() => {
        if (d.won) toast.success(`Rolled ${d.roll.toFixed(2)} — won ${fmtUsdt(d.payoutUsdt)}`);
        else toast.error(`Rolled ${d.roll.toFixed(2)} — lost ${fmtUsdt(stake)}`);
      }, 400);
    } catch (e: any) {
      if (tumbleTimerRef.current) { clearInterval(tumbleTimerRef.current); tumbleTimerRef.current = null; }
      setTumbling(false);
      toast.error(e.message || 'Failed');
    } finally { setBusy(false); }
  }

  useEffect(() => () => { if (tumbleTimerRef.current) clearInterval(tumbleTimerRef.current); }, []);

  const winBandLeft  = direction === 'under' ? 0 : target;
  const winBandRight = direction === 'under' ? target : 100;

  return (
    <main className="cp-page-pad" style={{ maxWidth: 720, margin: '0 auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--cp-serif)', fontWeight: 400, fontSize: 36, letterSpacing: '-0.015em' }}>Dice</h1>
      <p style={{ margin: 0, color: 'var(--cp-text-3)', fontSize: 13.5 }}>
        Pick a target. Roll 0.00–99.99. Lowest house edge in the casino.
      </p>

      <div style={{
        background: 'linear-gradient(165deg, #0B1F2E 0%, #15243A 100%)',
        borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', padding: 24,
        display: 'flex', flexDirection: 'column', gap: 22,
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        color: '#F5EFE2', position: 'relative', overflow: 'hidden',
      }}>
        {/* Aurora glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(60% 50% at 50% 0%, rgba(232,165,60,0.18), transparent 70%)',
        }}/>

        {/* DICE + RESULT */}
        <div style={{
          position: 'relative', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 32, padding: '8px 0 4px',
        }}>
          <Dice3D face={diceFace} tumbling={tumbling}/>
          <div style={{ textAlign: 'center', minWidth: 180 }}>
            <div style={{
              fontSize: 11, color: 'rgba(245,239,226,0.55)', textTransform: 'uppercase',
              letterSpacing: '0.12em', fontWeight: 700, marginBottom: 4,
            }}>
              {last ? (last.won ? 'You won' : 'House wins') : 'Roll'}
            </div>
            <div className="cp-num" style={{
              fontFamily: 'var(--cp-serif)', fontSize: 64, lineHeight: 1, fontWeight: 400,
              color: last ? (last.won ? '#7CE0BC' : '#FF6B6B') : '#FFE0A4',
              textShadow: last
                ? `0 0 22px ${last.won ? 'rgba(124,224,188,0.55)' : 'rgba(255,107,107,0.55)'}`
                : '0 0 22px rgba(232,165,60,0.4)',
              transition: 'color .3s',
              letterSpacing: '-0.02em',
            }}>
              {last ? last.roll.toFixed(2) : '—'}
            </div>
            {last && (
              <div style={{ marginTop: 6, fontSize: 12.5, color: 'rgba(245,239,226,0.7)' }}>
                {last.won ? `Payout ${fmtUsdt(last.payoutUsdt)}` : `Lost ${fmtUsdt(stake)}`}
              </div>
            )}
          </div>
        </div>

        {/* TRACK STRIP */}
        <div style={{ position: 'relative', height: 46, borderRadius: 999, overflow: 'visible' }}>
          {/* base track */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 999,
            background: 'linear-gradient(90deg, rgba(210,74,58,0.6), rgba(210,74,58,0.3))',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
            overflow: 'hidden',
          }}>
            {/* win zone overlay */}
            <div style={{
              position: 'absolute', top: 0, bottom: 0,
              left: `${winBandLeft}%`, width: `${winBandRight - winBandLeft}%`,
              background: 'linear-gradient(180deg, rgba(124,224,188,0.85), rgba(14,124,102,0.85))',
              boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.18)',
              transition: 'left .2s, width .2s',
            }}/>
            {/* shimmer */}
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.18,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              animation: 'diceShine 3s linear infinite',
            }}/>
          </div>

          {/* threshold marker */}
          <div style={{
            position: 'absolute', top: -8, bottom: -8,
            left: `${target}%`, width: 4,
            background: '#FFE0A4',
            transform: 'translateX(-50%)',
            borderRadius: 999,
            boxShadow: '0 0 14px rgba(255,224,164,0.85), 0 0 4px rgba(255,255,255,0.6)',
          }}/>
          <div style={{
            position: 'absolute', top: -22, left: `${target}%`,
            transform: 'translateX(-50%)',
            fontSize: 11, fontWeight: 700, color: '#FFE0A4',
            fontFamily: 'ui-monospace, Menlo, monospace',
            textShadow: '0 1px 4px rgba(0,0,0,0.6)',
          }}>{target.toFixed(0)}</div>

          {/* result marker (animates from 0 to roll) */}
          {markerPos != null && (
            <div style={{
              position: 'absolute', top: -10, left: `${Math.max(0, Math.min(100, markerPos))}%`,
              transform: 'translateX(-50%)',
              width: 28, height: 66,
              pointerEvents: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: last?.won ? '#7CE0BC' : '#FF6B6B',
                boxShadow: last?.won
                  ? '0 0 18px rgba(124,224,188,0.85), 0 0 4px #fff'
                  : '0 0 18px rgba(255,107,107,0.85), 0 0 4px #fff',
                border: '2px solid #fff',
              }}/>
              <div style={{
                fontSize: 10.5, fontWeight: 700, color: '#fff', marginTop: 6,
                fontFamily: 'ui-monospace, Menlo, monospace',
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              }}>{markerPos.toFixed(1)}</div>
            </div>
          )}

          {/* tick labels */}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '0 12px',
            fontSize: 10.5, color: 'rgba(255,255,255,0.7)', pointerEvents: 'none',
            fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 600,
          }}>
            <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
          </div>
        </div>

        {/* DIRECTION TOGGLES */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, position: 'relative' }}>
          {(['under', 'over'] as const).map(d => (
            <button key={d} onClick={() => setDirection(d)} disabled={busy} style={{
              height: 44, borderRadius: 10, border: 0, cursor: busy ? 'wait' : 'pointer',
              background: direction === d
                ? 'linear-gradient(180deg, #E8A53C, #B57920)'
                : 'rgba(255,255,255,0.05)',
              color: direction === d ? '#0B1F2E' : '#F5EFE2',
              fontWeight: 700, fontSize: 14, letterSpacing: '0.02em',
              boxShadow: direction === d
                ? 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 14px rgba(232,165,60,0.3)'
                : 'inset 0 1px 0 rgba(255,255,255,0.1)',
              transition: 'background .15s, color .15s',
            }}>Roll {d === 'under' ? 'UNDER' : 'OVER'} {target.toFixed(0)}</button>
          ))}
        </div>

        {/* TARGET SLIDER */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: 'rgba(245,239,226,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Target</label>
            <span className="cp-num" style={{ fontSize: 13, fontWeight: 600, color: '#FFE0A4' }}>
              {target.toFixed(0)} · {(winProb * 100).toFixed(2)}% win · {mult.toFixed(2)}×
            </span>
          </div>
          <input
            type="range" min={2} max={98} step={1} value={target}
            disabled={busy}
            onChange={e => setTarget(parseInt(e.target.value, 10))}
            style={{ width: '100%' }}
          />
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

        <Button kind="sun" size="lg" full onClick={roll} disabled={busy || !user || stake < 1}>
          {!user ? 'Sign in to bet' : busy ? 'Rolling…' : `Roll · win up to ${fmtUsdt(potentialWin)}`}
        </Button>

        <style jsx>{`
          @keyframes diceShine {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
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
            Roll <strong className="cp-num">{last.roll.toFixed(2)}</strong> · {last.won ? `won ${fmtUsdt(last.payoutUsdt)}` : `lost ${fmtUsdt(stake)}`}
          </div>
          <a href={`/verify?seed=${last.serverSeed}&hash=${last.serverSeedHash}&cs=${last.clientSeed}&nonce=${last.nonce}&game=dice`}
             style={{ color: 'inherit', fontSize: 11.5, textDecoration: 'underline' }}>Verify →</a>
        </div>
      )}
    </main>
  );
}

// ─── 3D dice ──────────────────────────────────────────────────────────────

function Dice3D({ face, tumbling }: { face: 1|2|3|4|5|6; tumbling: boolean }) {
  // Single face that tumbles via 3D rotation; pips change rapidly while
  // tumbling, then settle on the result. Looks like a real die throw without
  // requiring perfect 6-face cube geometry.
  return (
    <div style={{
      width: 96, height: 96, perspective: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 84, height: 84,
        background: 'linear-gradient(155deg, #F8F2E4 0%, #DCCFAF 100%)',
        border: '1px solid rgba(0,0,0,0.15)', borderRadius: 14,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.5), inset 0 -10px 16px rgba(0,0,0,0.08), 0 12px 22px rgba(0,0,0,0.45)',
        padding: 10,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)',
        gap: 4,
        transform: tumbling ? 'rotateX(540deg) rotateY(720deg)' : 'rotateX(-12deg) rotateY(-18deg)',
        transition: tumbling
          ? 'transform 0.75s cubic-bezier(.34,.04,.22,1)'
          : 'transform 0.6s cubic-bezier(.34,1.56,.64,1)',
      }}>
        <PipGrid pips={face}/>
      </div>
    </div>
  );
}

function PipGrid({ pips }: { pips: number }) {
  // Pip positions on a 3x3 grid (1=top-left ... 9=bottom-right).
  const layouts: Record<number, number[]> = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 4, 7, 3, 6, 9],   // two vertical columns
  };
  const cells = new Set(layouts[pips] || []);
  return (
    <>
      {Array.from({ length: 9 }, (_, i) => i + 1).map(idx => (
        <div key={idx} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {cells.has(idx) && (
            <div style={{
              width: '70%', height: '70%', borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #6e503a 0%, #2a1810 90%)',
              boxShadow: 'inset 0 1px 1.5px rgba(255,255,255,0.3), 0 1px 1px rgba(0,0,0,0.35)',
            }}/>
          )}
        </div>
      ))}
    </>
  );
}
