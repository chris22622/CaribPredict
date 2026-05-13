'use client';

// CrashStage — a canvas-driven visual for the CaribCrash game.
//
// What it renders:
//   • Animated tropical sunset background (deep ocean → sun → sky)
//   • A glowing multiplier trail that climbs as the round runs, with a
//     plane sprite riding the leading edge
//   • Star particles that trail behind the plane at high multipliers
//   • A dramatic crash explosion + red flash + screen shake when the round
//     crashes
//   • A gold burst overlay when the user cashes out successfully
//   • The big multiplier number pulses with a glow that intensifies with
//     the value
//
// The component is self-contained — it just needs the current phase,
// multiplier, and a few event hooks (cash-out triggered, crash triggered)
// to know when to fire the particle bursts. The bet sidebar stays in the
// parent page and is unaffected.

import React, { useEffect, useRef, useState } from 'react';

export type CrashPhase = 'pending' | 'running' | 'crashed' | 'cooldown';

interface CrashStageProps {
  phase: CrashPhase;
  multiplier: number;            // live multiplier (1.00 when not running)
  crashAt?: number | null;       // final crash multiplier when phase === 'crashed'
  cashedOutAt?: number | null;   // multiplier at which the player cashed out (success burst trigger)
  msUntilStart?: number;         // for the pending countdown ring
  roundNumber?: number;
  history?: number[];            // recent crash multipliers (oldest → newest)
  seedHash?: string;
  serverSeed?: string;
  betsThisRound?: number;
  stakeUsdtThisRound?: number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  kind: 'spark' | 'star' | 'confetti';
}

export default function CrashStage(props: CrashStageProps) {
  const {
    phase, multiplier, crashAt, cashedOutAt, msUntilStart = 0,
    roundNumber, history = [], seedHash, serverSeed,
    betsThisRound = 0, stakeUsdtThisRound = 0,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const trailRef = useRef<{ t: number; m: number }[]>([]);
  const lastPhaseRef = useRef<CrashPhase>(phase);
  const lastCashedRef = useRef<number | null>(null);
  const shakeUntilRef = useRef<number>(0);
  const flashUntilRef = useRef<number>(0);
  const winFlashUntilRef = useRef<number>(0);

  const [size, setSize] = useState({ w: 800, h: 460 });

  // Resize the canvas to fit the wrapper, accounting for devicePixelRatio.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const w = Math.max(320, Math.floor(e.contentRect.width));
        const h = Math.max(280, Math.floor(e.contentRect.height));
        setSize({ w, h });
      }
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  // Phase transition hooks — fire particle bursts when the round changes
  // state, regardless of how many frames pass.
  useEffect(() => {
    const prev = lastPhaseRef.current;
    if (prev !== 'running' && phase === 'running') {
      // round started — reset trail
      trailRef.current = [];
      startedAtRef.current = performance.now();
    }
    if (prev !== 'crashed' && phase === 'crashed') {
      // explosion
      const cx = size.w * 0.78;
      const cy = size.h * (cashedOutAt ? 0.42 : 0.5);
      for (let i = 0; i < 70; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 2 + Math.random() * 6;
        particlesRef.current.push({
          x: cx, y: cy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0, maxLife: 50 + Math.random() * 40,
          size: 1 + Math.random() * 3,
          hue: 12 + Math.random() * 30,
          kind: 'spark',
        });
      }
      shakeUntilRef.current = performance.now() + 600;
      flashUntilRef.current = performance.now() + 300;
    }
    lastPhaseRef.current = phase;
  }, [phase, size.w, size.h, cashedOutAt]);

  // Win burst (gold confetti) when cashout multiplier appears.
  useEffect(() => {
    if (cashedOutAt && cashedOutAt !== lastCashedRef.current) {
      lastCashedRef.current = cashedOutAt;
      const cx = size.w * 0.5;
      const cy = size.h * 0.45;
      for (let i = 0; i < 90; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
        const sp = 3 + Math.random() * 7;
        particlesRef.current.push({
          x: cx + (Math.random() - 0.5) * 40,
          y: cy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 2,
          life: 0, maxLife: 80 + Math.random() * 50,
          size: 2 + Math.random() * 4,
          hue: 40 + Math.random() * 20, // gold range
          kind: 'confetti',
        });
      }
      winFlashUntilRef.current = performance.now() + 600;
    }
  }, [cashedOutAt, size.w, size.h]);

  // Animation loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(size.w * dpr);
    canvas.height = Math.floor(size.h * dpr);
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    const tick = (now: number) => {
      const w = size.w, h = size.h;
      ctx.clearRect(0, 0, w, h);

      // BACKGROUND — tropical sunset gradient that warms as multiplier grows.
      const heat = Math.max(0, Math.min(1, (multiplier - 1) / 8));
      const top = phase === 'crashed' ? '#0b1a26' : interp('#0B1F2E', '#15243a', heat);
      const mid = phase === 'crashed' ? '#23121b' : interp('#1B3A50', '#8A4734', heat);
      const bot = phase === 'crashed' ? '#3a0f12' : interp('#E8A53C', '#D24A3A', heat);
      const g1 = ctx.createLinearGradient(0, 0, 0, h);
      g1.addColorStop(0, top);
      g1.addColorStop(0.55, mid);
      g1.addColorStop(1, bot);
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      // Distant stars (only visible at low heat / start).
      if (heat < 0.5) {
        ctx.globalAlpha = (0.5 - heat) * 1.4;
        for (let i = 0; i < 36; i++) {
          const sx = (i * 73 + 31) % w;
          const sy = (i * 41 + 13) % (h * 0.4);
          ctx.fillStyle = '#fff';
          ctx.fillRect(sx, sy, 1.2, 1.2);
        }
        ctx.globalAlpha = 1;
      }

      // The sun (huge soft glow that swells with multiplier).
      const sunY = h * 0.78 - heat * 80;
      const sunR = 80 + heat * 60;
      const sg = ctx.createRadialGradient(w * 0.5, sunY, sunR * 0.2, w * 0.5, sunY, sunR);
      sg.addColorStop(0, 'rgba(255, 224, 156, 0.95)');
      sg.addColorStop(0.4, 'rgba(232, 165, 60, 0.55)');
      sg.addColorStop(1, 'rgba(232, 165, 60, 0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, w, h);

      // Horizon water reflection band.
      const horizonY = h * 0.78;
      ctx.fillStyle = 'rgba(11, 31, 46, 0.6)';
      ctx.fillRect(0, horizonY, w, h - horizonY);
      // shimmering reflection lines on the water
      for (let i = 0; i < 12; i++) {
        const yy = horizonY + 4 + i * ((h - horizonY) / 14);
        ctx.fillStyle = `rgba(255, 224, 156, ${0.12 - i * 0.008})`;
        ctx.fillRect(w * 0.3 + Math.sin(now / 700 + i) * 6, yy, w * 0.4, 1);
      }

      // Palm tree silhouettes (left and right).
      drawPalm(ctx, 30, horizonY + 8, 60, '#06121b');
      drawPalm(ctx, w - 70, horizonY + 12, 70, '#06121b');

      // TRAIL — sample the multiplier line over time and draw a glowing curve.
      if (phase === 'running' || phase === 'crashed') {
        const elapsed = (now - startedAtRef.current) / 1000;
        if (phase === 'running') {
          trailRef.current.push({ t: elapsed, m: multiplier });
        }
        const trail = trailRef.current;
        if (trail.length >= 2) {
          const last = trail[trail.length - 1];
          const tMax = Math.max(1.5, last.t);
          const mMax = Math.max(2.2, last.m * 1.15);

          // map (t, m) → (x, y)
          const padX = 50, padY = 50;
          const xFor = (t: number) => padX + (t / tMax) * (w * 0.78 - padX);
          const yFor = (m: number) => (horizonY - padY) - ((m - 1) / (mMax - 1)) * (horizonY - padY - 30);

          // Curve glow (large blur)
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = phase === 'crashed' ? 'rgba(255, 90, 90, 0.55)' : 'rgba(255, 224, 156, 0.55)';
          ctx.lineWidth = 18;
          ctx.beginPath();
          ctx.moveTo(xFor(trail[0].t), yFor(trail[0].m));
          for (let i = 1; i < trail.length; i++) {
            ctx.lineTo(xFor(trail[i].t), yFor(trail[i].m));
          }
          ctx.stroke();

          // Bright core line
          ctx.strokeStyle = phase === 'crashed' ? '#FF6B6B' : '#FFF1C9';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(xFor(trail[0].t), yFor(trail[0].m));
          for (let i = 1; i < trail.length; i++) {
            ctx.lineTo(xFor(trail[i].t), yFor(trail[i].m));
          }
          ctx.stroke();

          // Plane sprite at the leading edge.
          const px = xFor(last.t);
          const py = yFor(last.m);

          // Spark trail at high multipliers
          if (phase === 'running' && multiplier > 1.5 && Math.random() < 0.55) {
            particlesRef.current.push({
              x: px + (Math.random() - 0.5) * 6,
              y: py + (Math.random() - 0.5) * 6,
              vx: -2 - Math.random() * 2,
              vy: 1 + Math.random() * 2,
              life: 0, maxLife: 28 + Math.random() * 18,
              size: 1 + Math.random() * 2.5,
              hue: 38 + Math.random() * 12,
              kind: 'spark',
            });
          }

          // Star particle bursts above x10
          if (phase === 'running' && multiplier > 10 && Math.random() < 0.15) {
            particlesRef.current.push({
              x: px + (Math.random() - 0.5) * 60,
              y: py + (Math.random() - 0.5) * 60,
              vx: 0, vy: 0,
              life: 0, maxLife: 35,
              size: 1.5 + Math.random() * 2,
              hue: 50,
              kind: 'star',
            });
          }

          drawPlane(ctx, px, py, multiplier, phase === 'crashed');
        }
      }

      // Particles update + render.
      const ps = particlesRef.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.kind === 'confetti') p.vy += 0.18;
        if (p.kind === 'spark') p.vy += 0.05;
        p.life++;
        if (p.life >= p.maxLife) { ps.splice(i, 1); continue; }
        const alpha = 1 - p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        if (p.kind === 'star') {
          ctx.fillStyle = `hsl(${p.hue}, 100%, 75%)`;
          drawStar(ctx, p.x, p.y, p.size * 2);
        } else {
          ctx.fillStyle = `hsl(${p.hue}, 95%, 65%)`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Red flash on crash.
      if (now < flashUntilRef.current) {
        const a = (flashUntilRef.current - now) / 300;
        ctx.fillStyle = `rgba(210, 74, 58, ${a * 0.6})`;
        ctx.fillRect(0, 0, w, h);
      }
      // Gold flash on win.
      if (now < winFlashUntilRef.current) {
        const a = (winFlashUntilRef.current - now) / 600;
        ctx.fillStyle = `rgba(232, 184, 80, ${a * 0.35})`;
        ctx.fillRect(0, 0, w, h);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    rafRef.current = raf;
    return () => cancelAnimationFrame(raf);
  }, [size, phase, multiplier]);

  // Screen shake on crash — applied as transform on the wrapper element.
  const [shake, setShake] = useState(0);
  useEffect(() => {
    if (phase !== 'crashed') { setShake(0); return; }
    let stopped = false;
    const start = performance.now();
    const loop = () => {
      const t = performance.now();
      const left = shakeUntilRef.current - t;
      if (left <= 0 || stopped) { setShake(0); return; }
      setShake((Math.sin((t - start) / 18) * left) / 22);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return () => { stopped = true; };
  }, [phase]);

  const bigColor = phase === 'crashed' ? '#FF6B6B'
    : multiplier >= 5 ? '#FFE0A4'
    : multiplier >= 2 ? '#7CE0BC'
    : '#F5EFE2';

  const glow = phase === 'crashed' ? '#D24A3A'
    : multiplier >= 5 ? '#E8A53C'
    : multiplier >= 2 ? '#0E7C66'
    : '#E8A53C';

  return (
    <div style={{
      position: 'relative',
      borderRadius: 16,
      overflow: 'hidden',
      minHeight: 460,
      background: '#0B1F2E',
      boxShadow: '0 20px 60px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.05)',
      transform: shake ? `translate3d(${shake}px, ${shake * 0.6}px, 0)` : undefined,
      transition: shake ? 'none' : 'transform .3s',
    }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }}/>

      {/* HUD overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header: round + history */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          padding: '18px 22px', gap: 16,
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--cp-serif)', fontSize: 22, fontWeight: 400,
              color: '#F5EFE2', letterSpacing: '-0.01em',
              textShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}>
              CaribCrash
            </div>
            <div style={{
              fontSize: 11, color: 'rgba(245,239,226,0.6)', marginTop: 2, letterSpacing: '0.06em',
              textTransform: 'uppercase', fontWeight: 600,
            }}>
              Round #{roundNumber ?? '—'} · {phase.toUpperCase()}
            </div>
          </div>
          <div style={{
            display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end',
            maxWidth: 380,
          }}>
            {history.slice(-10).map((m, i) => (
              <span key={i} style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600,
                background: m >= 2 ? 'rgba(14,124,102,0.45)' : 'rgba(210,74,58,0.45)',
                color: m >= 2 ? '#9FFFD0' : '#FFB1A4',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(4px)',
              }}>{m.toFixed(2)}×</span>
            ))}
          </div>
        </div>

        {/* Center hero multiplier */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 6, paddingBottom: 30,
        }}>
          {phase === 'pending' && (
            <div style={{
              fontSize: 13, color: 'rgba(245,239,226,0.8)', marginBottom: 4,
              letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
            }}>
              Round opens in <span style={{ color: '#FFE0A4' }}>{Math.ceil(msUntilStart / 1000)}s</span>
            </div>
          )}
          <div style={{
            position: 'relative',
            fontFamily: 'var(--cp-serif)',
            fontSize: 'clamp(64px, 12vw, 140px)',
            fontWeight: 400,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            color: bigColor,
            textShadow: `0 0 30px ${glow}80, 0 0 60px ${glow}40, 0 4px 12px rgba(0,0,0,0.4)`,
            transition: 'color .25s, text-shadow .25s',
            animation: phase === 'running' ? 'crashPulse 1.4s ease-in-out infinite' : undefined,
          }}>
            {phase === 'pending' ? '1.00×'
              : phase === 'crashed' ? `${(crashAt ?? multiplier).toFixed(2)}×`
              : multiplier.toFixed(2) + '×'}
          </div>
          {phase === 'running' && (
            <div style={{
              marginTop: 6, fontSize: 12, color: 'rgba(245,239,226,0.65)',
              letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
            }}>
              Cash out before the crash
            </div>
          )}
          {phase === 'crashed' && (
            <div style={{
              marginTop: 6, padding: '6px 14px', borderRadius: 999,
              background: 'rgba(210,74,58,0.25)', border: '1px solid rgba(255,107,107,0.4)',
              color: '#FFB1A4', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              CRASHED at {(crashAt ?? multiplier).toFixed(2)}×
            </div>
          )}
          {phase === 'cooldown' && (
            <div style={{
              fontSize: 12, color: 'rgba(245,239,226,0.6)',
              letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
            }}>Next round opening…</div>
          )}
        </div>

        {/* Footer with bet stats */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px',
          background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.4))',
          fontSize: 11.5, color: 'rgba(245,239,226,0.65)',
        }}>
          <span>
            <strong style={{ color: '#FFE0A4' }}>{betsThisRound}</strong> bets ·{' '}
            <strong style={{ color: '#FFE0A4' }}>{stakeUsdtThisRound.toFixed(2)}</strong> USDT staked
          </span>
          <span style={{ fontFamily: 'var(--cp-mono, ui-monospace, monospace)', fontSize: 10.5, opacity: 0.7 }}>
            {phase === 'crashed' && serverSeed
              ? `seed: ${serverSeed.slice(0, 14)}…`
              : `hash: ${seedHash?.slice(0, 14) ?? '—'}…`}
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes crashPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
      `}</style>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────

function interp(a: string, b: string, t: number): string {
  const ah = hexToRgb(a), bh = hexToRgb(b);
  const r = Math.round(ah.r + (bh.r - ah.r) * t);
  const g = Math.round(ah.g + (bh.g - ah.g) * t);
  const bl = Math.round(ah.b + (bh.b - ah.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}
function hexToRgb(hex: string) {
  const m = hex.replace('#', '');
  const v = m.length === 3
    ? m.split('').map(c => c + c).join('')
    : m;
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}

function drawPalm(ctx: CanvasRenderingContext2D, x: number, baseY: number, scale: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  // trunk — curved
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + scale * 0.2, baseY - scale * 0.6, x + scale * 0.1, baseY - scale);
  ctx.lineWidth = scale * 0.12;
  ctx.strokeStyle = color;
  ctx.stroke();
  // fronds
  const top = { x: x + scale * 0.1, y: baseY - scale };
  for (let i = 0; i < 6; i++) {
    const ang = -Math.PI / 2 + (i - 2.5) * 0.4;
    const len = scale * (0.55 + (i % 2) * 0.1);
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.quadraticCurveTo(
      top.x + Math.cos(ang) * len * 0.4,
      top.y + Math.sin(ang) * len * 0.4 - scale * 0.15,
      top.x + Math.cos(ang) * len,
      top.y + Math.sin(ang) * len,
    );
    ctx.lineWidth = scale * 0.06;
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlane(ctx: CanvasRenderingContext2D, x: number, y: number, mult: number, crashed: boolean) {
  ctx.save();
  ctx.translate(x, y);
  // angle along the curve — steeper as mult grows
  const angle = -Math.atan2(Math.min(60, mult * 4), 40);
  ctx.rotate(angle);
  const s = 1 + Math.min(0.7, mult / 30);
  ctx.scale(s, s);

  // glow halo
  const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 32);
  halo.addColorStop(0, crashed ? 'rgba(255,107,107,0.75)' : 'rgba(255,224,156,0.85)');
  halo.addColorStop(1, 'rgba(255,224,156,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(-32, -32, 64, 64);

  // body
  ctx.fillStyle = crashed ? '#C84141' : '#FFE0A4';
  ctx.strokeStyle = crashed ? '#7A1F1F' : '#7A4A12';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-10, -6);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-10, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // wing
  ctx.beginPath();
  ctx.moveTo(-2, 0);
  ctx.lineTo(-8, -10);
  ctx.lineTo(2, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // window dot
  ctx.fillStyle = '#0B1F2E';
  ctx.beginPath();
  ctx.arc(6, -1, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const a2 = a + Math.PI / 5;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
