'use client';

import React, { useEffect, useState } from 'react';
import { fmtCompactUsdt } from '@/lib/cp-data';

interface LiveNowData {
  onlineNow: number;
  totalWageredTodayUsdt: number;
  betCount24h: number;
}

export default function LiveNow() {
  const [data, setData] = useState<LiveNowData | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch('/api/live-now', { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled && !j.error) setData(j);
      } catch {/* ignore */}
    }
    load();
    const t = setInterval(load, 12000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  if (!data) return null;
  return (
    <div style={{
      display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap',
      padding: '10px 14px', background: 'var(--cp-card-sub)',
      border: '1px solid var(--cp-line)', borderRadius: 999,
      fontSize: 12, color: 'var(--cp-text-2)', marginTop: 16,
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--cp-yes)',
          animation: 'cp-live-pulse 1.5s ease-in-out infinite',
        }}/>
        <span><strong className="cp-num">{data.onlineNow.toLocaleString()}</strong> online now</span>
      </span>
      <span style={{ width: 1, height: 12, background: 'var(--cp-line)' }}/>
      <span><strong className="cp-num">{fmtCompactUsdt(data.totalWageredTodayUsdt)}</strong> wagered today</span>
      <span style={{ width: 1, height: 12, background: 'var(--cp-line)' }}/>
      <span><strong className="cp-num">{data.betCount24h.toLocaleString()}</strong> bets · 24h</span>
      <style>{`@keyframes cp-live-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.35 } }`}</style>
    </div>
  );
}
