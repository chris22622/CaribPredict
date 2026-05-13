'use client';

// PlinkoStage — a canvas-driven Plinko board with real ball physics.
//
// The L/R path is determined by the server (provably-fair). This component
// only animates the ball through the deterministic waypoints with a smooth
// parabolic arc between pegs, peg-flash on impact, motion-blur trail, and
// a glowing landing bucket.
//
// Why canvas instead of SVG: the ball needs sub-pixel motion at 60 fps with
// motion blur and particle trails. SVG can't do that without a lot of DOM
// churn. Canvas runs the whole simulation in one frame loop.

import React, { useEffect, useRef, useState } from 'react';

interface PlinkoStageProps {
  rows: number;                                 // 8, 12, 16
  multipliers: number[];                        // one per bin (rows+1 of them)
  pendingDrop?: {                               // set by parent when a new drop fires
    id: string;                                 // unique per drop so the effect re-runs
    path: ('L' | 'R')[];                        // deterministic path from server
    bin: number;                                // final bin index
    multiplier: number;                         // payout multiplier
    payoutUsdt: number;
    stake: number;
  } | null;
  onDropComplete?: (bin: number, multiplier: number, payoutUsdt: number) => void;
}

export default function PlinkoStage({ rows, multipliers, pendingDrop, onDropComplete }: PlinkoStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [size, setSize] = useState({ w: 520, h: 460 });

  // Per-drop animation state, kept in refs so the rAF loop sees the latest.
  const animRef = useRef<{
    waypoints: { x: number; y: number }[];
    elapsed: number;                  // ms since the drop started
    msPerHop: number;
    finished: boolean;
    payoutUsdt: number;
    multiplier: number;
    bin: number;
    onComplete?: (bin: number, m: number, p: number) => void;
  } | null>(null);

  // Peg flash buffer — keyed by "r-c", value is flash-strength 0..1.
  const pegFlashRef = useRef<Map<string, number>>(new Map());
  const binPulseRef = useRef<{ bin: number; until: number } | null>(null);
  const burstParticlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; max: number; hue: number; size: number }[]>([]);
  const ballHistoryRef = useRef<{ x: number; y: number; a: number }[]>([]);

  // Board geometry — recomputed on resize or rows change.
  function geom(w: number, h: number) {
    const padX = 24;
    const innerW = w - 2 * padX;
    const topY = 40;
    const rowGap = (h - 120) / (rows + 1);
    const colUnit = Math.min(innerW / Math.max(rows, 8), 46);
    return { padX, innerW, topY, rowGap, colUnit, w, h };
  }
  function pegPos(row: number, col: number, g: ReturnType<typeof geom>) {
    const y = g.topY + row * g.rowGap;
    const x = g.w / 2 + (col - row / 2) * g.colUnit;
    return { x, y };
  }
  function binPos(i: number, g: ReturnType<typeof geom>) {
    const w = g.colUnit - 4;
    const x = g.w / 2 + (i - rows / 2) * g.colUnit - g.colUnit / 2 + 2;
    const y = g.topY + rows * g.rowGap + 16;
    return { x, y, w, h: 40 };
  }

  // ResizeObserver -> set canvas size to wrapper.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const w = Math.max(360, Math.floor(e.contentRect.width));
        // height scales with rows so tall boards stay readable
        const h = Math.max(420, 360 + rows * 12);
        setSize({ w, h });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [rows]);

  // Kick off a new drop when pendingDrop changes.
  useEffect(() => {
    if (!pendingDrop) return;
    const g = geom(size.w, size.h);

    // Walk the path to produce waypoints (row 0 .. rows).
    const waypoints: { x: number; y: number }[] = [];
    // start at top center
    const start = pegPos(0, 0, g);
    waypoints.push({ x: g.w / 2, y: 16 });
    waypoints.push({ x: start.x, y: start.y });
    let col = 0;
    for (let i = 0; i < pendingDrop.path.length; i++) {
      const d = pendingDrop.path[i];
      // moving from row i to row i+1, column shifts 0 (L) or +1 (R)
      if (d === 'R') col += 1;
      const p = pegPos(i + 1, col, g);
      waypoints.push(p);
    }
    // Final landing inside the bin.
    const bin = binPos(pendingDrop.bin, g);
    waypoints.push({ x: bin.x + bin.w / 2, y: bin.y + bin.h / 2 });

    animRef.current = {
      waypoints,
      elapsed: 0,
      msPerHop: 95,
      finished: false,
      payoutUsdt: pendingDrop.payoutUsdt,
      multiplier: pendingDrop.multiplier,
      bin: pendingDrop.bin,
      onComplete: onDropComplete,
    };
    ballHistoryRef.current = [];
    binPulseRef.current = null;
    burstParticlesRef.current = [];
  }, [pendingDrop?.id]);

  // Render loop.
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

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(40, now - last);
      last = now;
      const g = geom(size.w, size.h);
      const { w, h } = g;
      ctx.clearRect(0, 0, w, h);

      // Background — deep ink with a subtle radial glow center.
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#0B1F2E');
      bg.addColorStop(1, '#06121b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      const halo = ctx.createRadialGradient(w / 2, h * 0.4, 40, w / 2, h * 0.4, w * 0.55);
      halo.addColorStop(0, 'rgba(232, 165, 60, 0.10)');
      halo.addColorStop(1, 'rgba(232, 165, 60, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      // PEGS
      const flashMap = pegFlashRef.current;
      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= r; c++) {
          const p = pegPos(r, c, g);
          const key = `${r}-${c}`;
          const fl = flashMap.get(key) || 0;
          // glow if recently hit
          if (fl > 0.05) {
            const rd = 6 + fl * 14;
            const gg = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, rd);
            gg.addColorStop(0, `rgba(255, 224, 156, ${fl})`);
            gg.addColorStop(1, 'rgba(255, 224, 156, 0)');
            ctx.fillStyle = gg;
            ctx.beginPath();
            ctx.arc(p.x, p.y, rd, 0, Math.PI * 2);
            ctx.fill();
            flashMap.set(key, fl - dt / 360);
          }
          // peg core
          ctx.fillStyle = fl > 0.1 ? '#FFE0A4' : 'rgba(241, 236, 222, 0.85)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // BINS
      for (let i = 0; i < multipliers.length; i++) {
        const m = multipliers[i];
        const b = binPos(i, g);
        const tone = m >= 5 ? '#D24A3A' : m >= 2 ? '#E8A53C' : m >= 1 ? '#0E7C66' : '#1A2A3A';
        const fg = m >= 1 ? '#fff' : 'rgba(255,255,255,0.55)';
        const pulse = binPulseRef.current && binPulseRef.current.bin === i
          ? Math.max(0, (binPulseRef.current.until - now) / 1200)
          : 0;
        ctx.save();
        if (pulse > 0) {
          ctx.shadowColor = tone;
          ctx.shadowBlur = 22 * pulse;
        }
        roundRect(ctx, b.x, b.y, b.w, b.h, 6);
        ctx.fillStyle = tone;
        ctx.globalAlpha = 0.75 + pulse * 0.25;
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = fg;
        ctx.font = `bold ${Math.min(13, Math.max(9, g.colUnit * 0.32))}px ui-monospace, Menlo, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = m < 10 ? m.toFixed(m % 1 ? 1 : 0) : Math.round(m).toString();
        ctx.fillText(`${label}×`, b.x + b.w / 2, b.y + b.h / 2);
      }

      // BALL ANIMATION
      const anim = animRef.current;
      if (anim && !anim.finished) {
        anim.elapsed += dt;
        const totalHops = anim.waypoints.length - 1;
        const hopFloat = anim.elapsed / anim.msPerHop;
        const hopIdx = Math.floor(hopFloat);
        const hopT = hopFloat - hopIdx;

        if (hopIdx >= totalHops) {
          anim.finished = true;
          const finalP = anim.waypoints[totalHops];
          // burst on landing
          const tone = anim.multiplier >= 2 ? 40 : anim.multiplier >= 1 ? 145 : 10;
          for (let i = 0; i < 28; i++) {
            const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
            const sp = 2 + Math.random() * 5;
            burstParticlesRef.current.push({
              x: finalP.x, y: finalP.y,
              vx: Math.cos(a) * sp,
              vy: Math.sin(a) * sp - 1,
              life: 0, max: 60 + Math.random() * 40,
              hue: tone + (Math.random() - 0.5) * 30,
              size: 1.8 + Math.random() * 2.8,
            });
          }
          binPulseRef.current = { bin: anim.bin, until: now + 1200 };
          anim.onComplete?.(anim.bin, anim.multiplier, anim.payoutUsdt);
        } else {
          const a = anim.waypoints[hopIdx];
          const b = anim.waypoints[hopIdx + 1];
          // Parabolic arc: linear x, accelerating y (gravity-ish feel).
          const x = a.x + (b.x - a.x) * hopT;
          // y interpolation with a slight downward bias to feel gravitational.
          const yLin = a.y + (b.y - a.y) * hopT;
          // bounce-ish vertical: add a small upward parabola for the first
          // half of the hop so the ball appears to bounce off the peg.
          const arcHeight = 6 + Math.abs(b.x - a.x) * 0.15;
          const bounce = -arcHeight * 4 * hopT * (1 - hopT);
          const y = yLin + bounce;
          ballHistoryRef.current.push({ x, y, a: 1 });
          if (ballHistoryRef.current.length > 16) ballHistoryRef.current.shift();

          // On crossing a hop boundary (hop completed), flash the peg we just hit.
          if (hopT > 0.92 && hopIdx >= 1 && hopIdx < totalHops - 1) {
            // The peg we're landing on right after this hop is hopIdx+1 in waypoints,
            // which corresponds to row=hopIdx in the triangle (because waypoints[0]
            // is the spawn, waypoints[1] is row 0 peg, waypoints[2] is row 1 peg...).
            const row = hopIdx;       // waypoints[hopIdx+1] is at row `row`
            // approximate col from x
            const colF = (b.x - g.w / 2) / g.colUnit + row / 2;
            const col = Math.max(0, Math.min(row, Math.round(colF)));
            const key = `${row}-${col}`;
            const cur = flashMap.get(key) || 0;
            if (cur < 0.6) flashMap.set(key, 1);
          }
        }

        // Render ball trail
        const trail = ballHistoryRef.current;
        for (let i = 0; i < trail.length; i++) {
          const t = trail[i];
          const a = (i / trail.length) * 0.45;
          ctx.fillStyle = `rgba(255, 224, 156, ${a})`;
          ctx.beginPath();
          ctx.arc(t.x, t.y, 8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Render the ball
        if (trail.length) {
          const head = trail[trail.length - 1];
          const grd = ctx.createRadialGradient(head.x - 2, head.y - 2, 1, head.x, head.y, 10);
          grd.addColorStop(0, '#FFF1C9');
          grd.addColorStop(0.6, '#E8A53C');
          grd.addColorStop(1, '#7A4A12');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.4)';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }

      // BURST particles
      const ps = burstParticlesRef.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life++;
        if (p.life >= p.max) { ps.splice(i, 1); continue; }
        const alpha = 1 - p.life / p.max;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `hsl(${p.hue}, 95%, 65%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [size, rows, multipliers]);

  return (
    <div ref={wrapperRef} style={{
      borderRadius: 16, overflow: 'hidden', background: '#0B1F2E',
      boxShadow: '0 20px 60px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.05)',
    }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: 'auto' }}/>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
