'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { fmtUsdt } from '@/lib/cp-data';

// Subscribes to /api/feed and pops a celebratory toast for any new bet
// that paid out above THRESHOLD_USDT. Mounted globally in layout-client.

const POLL_MS = 6000;
const THRESHOLD_USDT = 50;

export default function BigWinToast() {
  const seen = useRef<Set<string>>(new Set());
  const initialLoaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch('/api/feed?limit=25', { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled) return;
        for (const item of (j.feed || []) as any[]) {
          if (seen.current.has(item.id)) continue;
          seen.current.add(item.id);
          if (!initialLoaded.current) continue; // skip the very first batch
          if (!item.won) continue;
          const profit = item.payoutUsdt - item.stakeUsdt;
          if (profit < THRESHOLD_USDT) continue;
          toast.success(
            `${item.user} just won ${fmtUsdt(profit)} on ${item.game}${item.multiplier ? ` @${item.multiplier.toFixed(2)}×` : ''}`,
            { duration: 4500 },
          );
        }
        initialLoaded.current = true;
      } catch {/* ignore */}
    }
    load();
    const t = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return null;
}
