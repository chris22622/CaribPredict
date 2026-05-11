'use client';

import React, { useState, useEffect, useRef } from 'react';

interface PriceChartProps {
  points: { p: number }[];
  events?: { i: number; label: string }[];
  height?: number;
  range?: '1H' | '6H' | '1D' | '1W' | '1M' | 'ALL';
  accent?: string;
}

export default function PriceChart({ points: all, events = [], height = 280, range = 'ALL', accent = 'var(--cp-yes)' }: PriceChartProps) {
  const cuts: Record<string, number> = { '1H': 1, '6H': 6, '1D': 24, '1W': 168, '1M': all.length, 'ALL': all.length };
  const take = Math.min(all.length, cuts[range] || all.length);
  const pts = all.slice(all.length - take);

  const padL = 8, padR = 24, padT = 12, padB = 32;
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(es => setW(Math.max(320, es[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;

  if (pts.length < 2) {
    return <div ref={ref} style={{ width: '100%', height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cp-text-3)', fontSize: 13 }}>No price history yet.</div>;
  }

  const xs = pts.map((_, i) => padL + (i / (pts.length - 1 || 1)) * innerW);
  const ys = pts.map(pt => padT + (1 - pt.p) * innerH);

  const d = xs.map((x, i) => (i === 0 ? `M${x},${ys[i]}` : `L${x},${ys[i]}`)).join(' ');
  const area = d + ` L${xs[xs.length-1]},${padT + innerH} L${xs[0]},${padT + innerH} Z`;

  const lastP = pts[pts.length - 1].p;
  const baseIdx = all.length - take;
  const pinsToShow = events
    .filter(e => e.i >= baseIdx)
    .map(e => {
      const localI = e.i - baseIdx;
      const x = padL + (localI / (pts.length - 1 || 1)) * innerW;
      const y = padT + (1 - all[e.i].p) * innerH;
      return { ...e, x, y };
    });

  const [hoverI, setHoverI] = useState<number | null>(null);
  function handleMove(e: React.MouseEvent) {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const i = Math.round(((x - padL) / innerW) * (pts.length - 1));
    setHoverI(Math.max(0, Math.min(pts.length - 1, i)));
  }

  const yTicks = [0.25, 0.5, 0.75];

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <svg width={w} height={height} onMouseMove={handleMove} onMouseLeave={() => setHoverI(null)} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="cp-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor={accent} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={accent} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {yTicks.map(t => {
          const y = padT + (1 - t) * innerH;
          return (
            <g key={t}>
              <line x1={padL} x2={padL + innerW} y1={y} y2={y} stroke="var(--cp-line)" strokeDasharray="2 4"/>
              <text x={padL + innerW + 4} y={y + 3} fontSize="10" fill="var(--cp-text-3)" fontFamily="var(--cp-mono)">
                {Math.round(t * 100)}
              </text>
            </g>
          );
        })}
        <path d={area} fill="url(#cp-area)"/>
        <path d={d} fill="none" stroke={accent} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>

        {pinsToShow.map((p, i) => (
          <g key={i}>
            <line x1={p.x} x2={p.x} y1={p.y + 6} y2={padT + innerH} stroke="var(--cp-text-3)" strokeDasharray="1 3" opacity="0.6"/>
            <circle cx={p.x} cy={p.y} r="4" fill="var(--cp-page)" stroke={accent} strokeWidth="1.5"/>
            <text x={p.x + 6} y={p.y - 6} fontSize="10" fill="var(--cp-text-2)"
                  style={{ paintOrder: 'stroke' }} stroke="var(--cp-page)" strokeWidth="3">{p.label}</text>
            <text x={p.x + 6} y={p.y - 6} fontSize="10" fill="var(--cp-text-2)">{p.label}</text>
          </g>
        ))}

        {hoverI != null && pts[hoverI] && (
          <g>
            <line x1={xs[hoverI]} x2={xs[hoverI]} y1={padT} y2={padT + innerH} stroke="var(--cp-ink)" strokeOpacity="0.35"/>
            <circle cx={xs[hoverI]} cy={ys[hoverI]} r="4.5" fill={accent} stroke="#fff" strokeWidth="2"/>
            <g transform={`translate(${Math.min(xs[hoverI] + 8, padL + innerW - 70)}, ${Math.max(ys[hoverI] - 26, padT)})`}>
              <rect width="64" height="22" rx="4" fill="var(--cp-ink)"/>
              <text x="8" y="14" fontSize="11" fill="var(--cp-text-on-ink)" fontFamily="var(--cp-mono)">
                {Math.round(pts[hoverI].p * 100)}%
              </text>
            </g>
          </g>
        )}

        <g transform={`translate(${padL + innerW - 1}, ${padT + (1 - lastP) * innerH})`}>
          <rect x="2" y="-10" width="42" height="20" rx="4" fill={accent}/>
          <text x="23" y="4" fontSize="11" fill="#fff" textAnchor="middle" fontFamily="var(--cp-mono)" fontWeight="600">
            {Math.round(lastP * 100)}%
          </text>
        </g>
      </svg>
    </div>
  );
}
