import React from 'react';

interface IconProps {
  name: string;
  size?: number;
  stroke?: number;
  color?: string;
  style?: React.CSSProperties;
}

export default function Icon({ name, size = 16, stroke = 1.6, color = 'currentColor', style }: IconProps) {
  const sw = stroke;
  const c = color;
  const p = (d: string) => <path d={d} fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/>;
  let body: React.ReactNode = null;
  switch (name) {
    case 'search':   body = <>{p('M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z')}{p('M16.5 16.5 21 21')}</>; break;
    case 'flame':    body = p('M12 3c1 3 4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 2-4-1 0-2-1-2-3 2 0 3-1 4-1Z'); break;
    case 'sparkle':  body = <>{p('M12 3v6M12 15v6M3 12h6M15 12h6')}{p('M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3')}</>; break;
    case 'gavel':    body = <>{p('M3 21h14')}{p('M7 17l8-8')}{p('M11 5l8 8 2-2-8-8z')}{p('M5 11l8 8 2-2-8-8z')}</>; break;
    case 'sport':    body = <>{p('M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z')}{p('M3 12h18M12 3v18')}{p('M6 6l12 12M18 6 6 18')}</>; break;
    case 'chart':    body = <>{p('M3 21h18')}{p('M6 17v-5M10 17v-8M14 17v-3M18 17v-10')}</>; break;
    case 'mic':      body = <>{p('M12 3a3 3 0 0 0-3 3v6a3 3 0 1 0 6 0V6a3 3 0 0 0-3-3Z')}{p('M5 11a7 7 0 0 0 14 0M12 18v3')}</>; break;
    case 'mask':     body = <>{p('M4 7c0-2 2-3 4-3h8c2 0 4 1 4 3v3a8 8 0 0 1-8 8 8 8 0 0 1-8-8V7Z')}{p('M9 10h.01M15 10h.01')}{p('M9 14c.8.6 2 1 3 1s2.2-.4 3-1')}</>; break;
    case 'storm':    body = <>{p('M6 11a5 5 0 1 1 1.5-9.8A6 6 0 0 1 18 6a4 4 0 0 1 0 8H7')}{p('M11 16l-2 5M15 16l-2 5')}</>; break;
    case 'feather':  body = <>{p('M20 4c-2 6-5 9-11 11l-3 3')}{p('M14 4c-4 0-8 4-8 8v6h6c4 0 8-4 8-8V4h-6Z')}{p('M11 7l4 4M9 9l3 3')}</>; break;
    case 'bookmark': body = p('M6 4h12v17l-6-4-6 4V4Z'); break;
    case 'bookmark-fill': body = <path d="M6 4h12v17l-6-4-6 4V4Z" fill={c}/>; break;
    case 'comment':  body = p('M4 6c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4V6Z'); break;
    case 'arrow-up': body = <>{p('M12 19V5')}{p('M5 12l7-7 7 7')}</>; break;
    case 'arrow-dn': body = <>{p('M12 5v14')}{p('M5 12l7 7 7-7')}</>; break;
    case 'chevron-r':body = p('M9 6l6 6-6 6'); break;
    case 'chevron-d':body = p('M6 9l6 6 6-6'); break;
    case 'plus':     body = p('M12 5v14M5 12h14'); break;
    case 'minus':    body = p('M5 12h14'); break;
    case 'check':    body = p('M5 12l4 4 10-10'); break;
    case 'close':    body = p('M6 6l12 12M18 6L6 18'); break;
    case 'menu':     body = p('M4 7h16M4 12h16M4 17h16'); break;
    case 'bell':     body = <>{p('M6 16V10a6 6 0 0 1 12 0v6l2 2H4l2-2Z')}{p('M10 20a2 2 0 0 0 4 0')}</>; break;
    case 'wallet':   body = <>{p('M3 7h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z')}{p('M3 7l3-3h11')}<circle cx="16" cy="13" r="1.2" fill={c}/></>; break;
    case 'share':    body = <>{p('M12 4v12')}{p('M7 9l5-5 5 5')}{p('M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5')}</>; break;
    case 'flag':     body = <>{p('M5 21V4')}{p('M5 5c4-2 8 2 12 0v8c-4 2-8-2-12 0')}</>; break;
    default: body = p('M4 4h16v16H4Z');
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden>{body}</svg>;
}

export function SunDot({ size = 10, color = 'var(--cp-sun)', style }: { size?: number; color?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden>
      <circle cx="12" cy="12" r="5" fill={color}/>
      {[0,1,2,3,4,5,6,7].map(i => {
        const a = (i * 45) * Math.PI / 180;
        const x1 = 12 + Math.cos(a) * 8;
        const y1 = 12 + Math.sin(a) * 8;
        const x2 = 12 + Math.cos(a) * 11;
        const y2 = 12 + Math.sin(a) * 11;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2" strokeLinecap="round"/>;
      })}
    </svg>
  );
}

export function Wordmark({ size = 22, color = 'currentColor', accent = 'var(--cp-sun)' }: { size?: number; color?: string; accent?: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'baseline', gap: 0,
      fontFamily: 'var(--cp-serif)', fontSize: size + 'px', lineHeight: 1, color,
      letterSpacing: '-0.01em', userSelect: 'none',
    }}>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        Car
        <span style={{ position: 'relative', display: 'inline-block', width: '0.32em' }}>
          <span style={{ visibility: 'hidden' }}>i</span>
          <span style={{
            position: 'absolute', left: '0.06em', bottom: 0, width: '0.08em', height: '0.55em',
            background: 'currentColor', borderRadius: '0.02em',
          }}/>
          <SunDot size={size * 0.34} color={accent} style={{
            position: 'absolute', left: '0.02em', top: '-0.08em',
          }}/>
        </span>
        bPredict
      </span>
    </span>
  );
}
