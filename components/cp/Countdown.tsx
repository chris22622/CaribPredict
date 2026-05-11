'use client';

import React, { useEffect, useState } from 'react';
import { fmtCountdown, urgencyForClose } from '@/lib/cp-data';

interface CountdownProps {
  closeIso: string;
  size?: 'sm' | 'md' | 'lg';
  prefix?: string;        // "Closes in" or ""
  showDot?: boolean;      // pulse dot indicator
}

const TONE: Record<string, { bg: string; fg: string; dot: string }> = {
  safe:    { bg: 'var(--cp-yes-soft)', fg: 'var(--cp-yes-ink)', dot: 'var(--cp-yes)' },
  warning: { bg: 'var(--cp-sun-soft)', fg: '#7C5A14',            dot: 'var(--cp-sun)' },
  urgent:  { bg: 'var(--cp-no-soft)',  fg: 'var(--cp-no-ink)',   dot: 'var(--cp-no)' },
  closed:  { bg: 'var(--cp-page-2)',   fg: 'var(--cp-text-3)',   dot: 'var(--cp-text-3)' },
};

export default function Countdown({ closeIso, size = 'sm', prefix = 'Closes in', showDot = true }: CountdownProps) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const urgency = urgencyForClose(closeIso);
  const tone = TONE[urgency];
  const text = fmtCountdown(closeIso, now);
  const isClosed = urgency === 'closed';

  const fs = size === 'lg' ? 15 : size === 'md' ? 13 : 11.5;
  const h = size === 'lg' ? 34 : size === 'md' ? 26 : 22;
  const px = size === 'lg' ? 12 : 10;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: h, padding: `0 ${px}px`, borderRadius: 999,
      background: tone.bg, color: tone.fg,
      fontWeight: 600, fontSize: fs, lineHeight: 1,
      fontFamily: 'var(--cp-mono)', whiteSpace: 'nowrap',
    }}>
      {showDot && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: tone.dot, flex: '0 0 auto',
          animation: !isClosed && urgency === 'urgent' ? 'cp-pulse 1s ease-in-out infinite' : undefined,
        }}/>
      )}
      {!isClosed && prefix ? <span>{prefix}</span> : null}
      <span>{text}</span>
      <style>{`@keyframes cp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }`}</style>
    </span>
  );
}
