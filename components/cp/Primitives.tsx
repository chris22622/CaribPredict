'use client';

import React from 'react';
import Icon from './Icon';
import { getCountry, CpMarket } from '@/lib/cp-data';

type On = 'light' | 'dark';

export function Chip({ children, icon, active, onClick, on = 'light', size = 'md', trailing }: {
  children: React.ReactNode; icon?: string; active?: boolean; onClick?: () => void;
  on?: On; size?: 'sm' | 'md'; trailing?: React.ReactNode;
}) {
  const isDark = on === 'dark';
  const h = size === 'sm' ? 28 : 34;
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    height: h, padding: '0 12px', borderRadius: 999,
    fontSize: size === 'sm' ? 12.5 : 13.5, fontWeight: 500,
    border: '1px solid transparent', cursor: 'pointer',
    transition: 'background .14s, color .14s, border-color .14s, transform .08s',
    whiteSpace: 'nowrap', userSelect: 'none', flex: '0 0 auto',
  };
  const styles: React.CSSProperties = active
    ? { ...base,
        background: isDark ? 'var(--cp-text-on-ink)' : 'var(--cp-ink)',
        color:      isDark ? 'var(--cp-ink)'        : 'var(--cp-text-on-ink)',
        borderColor: 'transparent' }
    : { ...base,
        background: 'transparent',
        color:      isDark ? 'var(--cp-text-on-ink-2)' : 'var(--cp-text-2)',
        borderColor: isDark ? 'var(--cp-ink-line)'     : 'var(--cp-line-strong)' };
  return (
    <button type="button" style={styles} onClick={onClick}>
      {icon && <Icon name={icon} size={size === 'sm' ? 13 : 15}/>}
      <span>{children}</span>
      {trailing}
    </button>
  );
}

type ButtonKind = 'primary' | 'sun' | 'secondary' | 'ghost' | 'ghost_dark' | 'yes' | 'no' | 'yes_soft' | 'no_soft' | 'outline' | 'outline_dark';
export function Button({ children, kind = 'primary', size = 'md', icon, trailing, onClick, style, full, type = 'button', disabled }: {
  children?: React.ReactNode; kind?: ButtonKind; size?: 'sm' | 'md' | 'lg';
  icon?: string; trailing?: React.ReactNode; onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties; full?: boolean; type?: 'button' | 'submit'; disabled?: boolean;
}) {
  const heights = { sm: 30, md: 36, lg: 44 };
  const pad = { sm: '0 12px', md: '0 14px', lg: '0 18px' };
  const fs = { sm: 12.5, md: 13.5, lg: 15 };
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: heights[size], padding: pad[size], borderRadius: 8,
    fontSize: fs[size], fontWeight: 600, border: 0, cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background .14s, color .14s, transform .08s, box-shadow .14s',
    width: full ? '100%' : undefined, opacity: disabled ? 0.6 : 1, ...style,
  };
  const kinds: Record<ButtonKind, React.CSSProperties> = {
    primary:    { background: 'var(--cp-ink)', color: 'var(--cp-page)' },
    sun:        { background: 'var(--cp-sun)', color: 'var(--cp-ink)' },
    secondary:  { background: 'var(--cp-page-2)', color: 'var(--cp-text)', boxShadow: 'inset 0 0 0 1px var(--cp-line-strong)' },
    ghost:      { background: 'transparent', color: 'var(--cp-text)' },
    ghost_dark: { background: 'transparent', color: 'var(--cp-text-on-ink)' },
    yes:        { background: 'var(--cp-yes)', color: '#fff' },
    no:         { background: 'var(--cp-no)',  color: '#fff' },
    yes_soft:   { background: 'var(--cp-yes-soft)', color: 'var(--cp-yes-ink)' },
    no_soft:    { background: 'var(--cp-no-soft)',  color: 'var(--cp-no-ink)' },
    outline:    { background: 'transparent', color: 'var(--cp-text)', boxShadow: 'inset 0 0 0 1px var(--cp-line-strong)' },
    outline_dark:{ background: 'transparent', color: 'var(--cp-text-on-ink)', boxShadow: 'inset 0 0 0 1px var(--cp-ink-line)' },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...kinds[kind] }}>
      {icon && <Icon name={icon} size={fs[size] + 1}/>}
      {children && <span>{children}</span>}
      {trailing}
    </button>
  );
}

export function FlagChip({ code, name, size = 'sm', on = 'light', active, onClick }: {
  code: string; name?: boolean; size?: 'sm' | 'md'; on?: On; active?: boolean; onClick?: () => void;
}) {
  const c = getCountry(code);
  if (!c) return null;
  const isDark = on === 'dark';
  const h = size === 'sm' ? 26 : 30;
  return (
    <button type="button" onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: h, padding: '0 10px 0 8px', borderRadius: 999,
      fontSize: size === 'sm' ? 12 : 13, fontWeight: 500,
      border: '1px solid', cursor: 'pointer',
      background: active ? (isDark ? 'var(--cp-text-on-ink)' : 'var(--cp-ink)') : 'transparent',
      color:      active ? (isDark ? 'var(--cp-ink)' : 'var(--cp-text-on-ink)') : (isDark ? 'var(--cp-text-on-ink-2)' : 'var(--cp-text-2)'),
      borderColor: active ? 'transparent' : (isDark ? 'var(--cp-ink-line)' : 'var(--cp-line-strong)'),
      whiteSpace: 'nowrap', flex: '0 0 auto',
    }}>
      <span style={{ fontSize: size === 'sm' ? 14 : 16, lineHeight: 1 }}>{c.flag}</span>
      <span>{name ? c.name : c.code}</span>
    </button>
  );
}

export function Thumb({ market, size = 64, radius = 10 }: { market: CpMarket; size?: number; radius?: number }) {
  const t = market.thumb || { kind: 'pattern' as const };
  const baseStyle: React.CSSProperties = {
    width: size, height: size, borderRadius: radius, flex: '0 0 auto',
    overflow: 'hidden', position: 'relative',
    boxShadow: 'inset 0 0 0 1px rgba(20,24,31,.06)',
  };

  if (t.kind === 'flag' && t.code) {
    const c = getCountry(t.code);
    return (
      <div style={{ ...baseStyle, background: 'var(--cp-card-sub)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.6, lineHeight: 1 }}>
        <span>{c?.flag}</span>
      </div>
    );
  }
  if (t.kind === 'storm') {
    return (
      <div style={{ ...baseStyle, background: 'linear-gradient(135deg, #0B1F2E, #1B3A50)', color: '#F1ECDE' }}>
        <svg viewBox="0 0 64 64" width={size} height={size}>
          <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.9">
            <path d="M32 14c8 0 14 5 14 12 0 5-4 9-10 9h-2"/>
            <path d="M32 24c6 0 10 4 10 9 0 4-3 8-9 8h-12"/>
            <path d="M22 41l-3 8M30 41l-3 8M38 41l-3 8"/>
          </g>
          <circle cx="50" cy="14" r="3" fill="var(--cp-sun)"/>
        </svg>
      </div>
    );
  }
  if (t.kind === 'sport') {
    return (
      <div style={{ ...baseStyle, background: 'var(--cp-yes-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--cp-yes-ink)', fontFamily: 'var(--cp-serif)',
        fontSize: size * 0.22, textAlign: 'center', lineHeight: 1.1, padding: 6 }}>
        {t.label || 'Match'}
      </div>
    );
  }
  const tones: Record<string, string[]> = {
    carnival: ['#E8A53C', '#D24A3A', '#0E7C66'],
    soca:     ['#D24A3A', '#E8A53C'],
    reggae:   ['#0E7C66', '#E8A53C', '#14181F'],
    currency: ['#0B1F2E', '#7B8390'],
    default:  ['#0E7C66', '#B7C6D3'],
  };
  const palette = tones[t.tone || 'default'] || tones.default;
  const stripeW = size / palette.length;
  return (
    <div style={{ ...baseStyle, background: 'var(--cp-card-sub)' }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        {palette.map((color, i) => (
          <rect key={i} x={0} y={i * stripeW} width={size} height={stripeW} fill={color} opacity={0.85}/>
        ))}
        <circle cx={size * 0.72} cy={size * 0.3} r={size * 0.18} fill="rgba(241,236,222,0.92)"/>
      </svg>
    </div>
  );
}

export function Sparkline({ points, width = 80, height = 28, color = 'var(--cp-yes)', fill = 'var(--cp-yes-soft)' }: {
  points: { p: number }[]; width?: number; height?: number; color?: string; fill?: string;
}) {
  if (!points || points.length < 2) return null;
  const xs = points.map((_, i) => (i / (points.length - 1)) * width);
  const ys = points.map(pt => height - pt.p * height);
  const d = xs.map((x, i) => (i === 0 ? `M${x},${ys[i]}` : `L${x},${ys[i]}`)).join(' ');
  const area = d + ` L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={area} fill={fill} opacity={0.7}/>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={2.2} fill={color}/>
    </svg>
  );
}

export function Avatar({ name = 'You', size = 28, tone = 'sun' }: { name?: string; size?: number; tone?: 'sun' | 'yes' | 'no' | 'ink' }) {
  const initial = name.trim()[0]?.toUpperCase() || '·';
  const palette: Record<string, { bg: string; fg: string }> = {
    sun:  { bg: 'var(--cp-sun-soft)',  fg: 'var(--cp-ink)' },
    yes:  { bg: 'var(--cp-yes-soft)',  fg: 'var(--cp-yes-ink)' },
    no:   { bg: 'var(--cp-no-soft)',   fg: 'var(--cp-no-ink)' },
    ink:  { bg: 'var(--cp-ink-3)',     fg: 'var(--cp-text-on-ink)' },
  };
  const p = palette[tone];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: p.bg, color: p.fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.45, fontWeight: 600,
      flex: '0 0 auto', boxShadow: 'inset 0 0 0 1px rgba(20,24,31,.06)',
    }}>{initial}</div>
  );
}
