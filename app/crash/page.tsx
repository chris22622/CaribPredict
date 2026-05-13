'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useCp } from '@/app/layout-client';
import { fmtUsdt } from '@/lib/cp-data';
import { multiplierAtSeconds } from '@/lib/crash';
import { Button } from '@/components/cp/Primitives';
import Icon, { SunDot } from '@/components/cp/Icon';
import CrashStage from '@/components/cp/games/CrashStage';

interface RoundState {
  round: {
    id: string;
    roundNumber: number;
    status: 'pending' | 'running' | 'crashed';
    serverSeedHash: string;
    serverSeed?: string;
    crashMultiplier?: number;
    bettingOpensAt: string;
    startsAt: string;
    crashedAt: string | null;
  };
  phase: 'pending' | 'running' | 'crashed' | 'cooldown';
  currentMultiplier: number;
  elapsedMs: number;
  msUntilStart: number;
  msUntilCrash: number;
  betsThisRound: number;
  stakeUsdtThisRound: number;
  timeToCrashSec: number;
}

export default function CrashPage() {
  const { user, refreshBalance } = useCp();
  const [state, setState] = useState<RoundState | null>(null);
  const [stake, setStake] = useState<number>(5);
  const [autoCash, setAutoCash] = useState<number | null>(2.0);
  const [placing, setPlacing] = useState(false);
  const [cashingOut, setCashingOut] = useState(false);
  const [myBetId, setMyBetId] = useState<string | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [liveMult, setLiveMult] = useState(1.00);
  const [cashedOutAt, setCashedOutAt] = useState<number | null>(null);
  const animRef = useRef<number | null>(null);

  // Poll state every 500ms
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch('/api/crash/state', { cache: 'no-store' });
        const j = await r.json();
        if (!cancelled && !j.error) setState(j);
      } catch {/* ignore */}
    }
    load();
    const t = setInterval(load, 500);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Pull last 12 round outcomes for the history strip
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch('/api/crash/history?limit=12', { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled && j.history) setHistory(j.history);
      } catch {/* ignore */}
    }
    load();
    const t = setInterval(load, 4000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Animate the live multiplier when round is running (client-side curve).
  useEffect(() => {
    if (!state) return;
    if (state.phase !== 'running') {
      setLiveMult(state.phase === 'crashed' ? (state.round.crashMultiplier || 1.0) : 1.00);
      return;
    }
    const startsMs = new Date(state.round.startsAt).getTime();
    function tick() {
      const elapsed = Math.max(0, (Date.now() - startsMs) / 1000);
      const m = Math.min(multiplierAtSeconds(elapsed), state?.round.crashMultiplier || 999);
      setLiveMult(m);
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [state?.phase, state?.round.id]);

  // Reset my bet id when round transitions
  useEffect(() => {
    if (state?.phase === 'cooldown' || state?.phase === 'pending') {
      // keep myBetId only if it belongs to the current round
      // (we don't have round_id on myBetId here; resetting on pending is safe)
      if (state.phase === 'pending' && myBetId) {
        // Don't reset here — we want to be able to cash out next phase
      }
      if (state.phase === 'cooldown') {
        setMyBetId(null);
      }
      if (state.phase === 'pending') {
        // new round, reset the cash-out marker so the win burst can fire again
        setCashedOutAt(null);
      }
    }
    if (state?.phase === 'crashed') {
      // bet rode the crash — clear it after a beat. Also pull a fresh
      // balance because auto-cashouts and busts both settle server-side
      // when the round crashes.
      setTimeout(() => setMyBetId(null), 800);
      refreshBalance();
    }
  }, [state?.phase]);

  async function placeBet() {
    if (!user) { toast.error('Sign in to bet'); return; }
    if (!state) return;
    if (state.phase !== 'pending') { toast.error('Betting closed'); return; }
    setPlacing(true);
    try {
      const res = await fetch('/api/crash/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id, roundId: state.round.id,
          amountUsdt: stake,
          autoCashoutMultiplier: autoCash,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bet failed');
      setMyBetId(data.betId);
      refreshBalance();
      toast.success(`Bet placed: ${fmtUsdt(stake)}${autoCash ? ` · auto @${autoCash.toFixed(2)}×` : ''}`);
    } catch (e: any) {
      toast.error(e.message || 'Bet failed');
    } finally { setPlacing(false); }
  }

  async function cashOut() {
    if (!user || !state) return;
    setCashingOut(true);
    try {
      const res = await fetch('/api/crash/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, roundId: state.round.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cashout failed');
      toast.success(`Cashed out @${data.cashoutMultiplier.toFixed(2)}× · won ${fmtUsdt(data.payoutUsdt)}`);
      setCashedOutAt(data.cashoutMultiplier);
      setMyBetId(null);
      refreshBalance();
    } catch (e: any) {
      toast.error(e.message || 'Cashout failed');
    } finally { setCashingOut(false); }
  }

  const phase = state?.phase || 'cooldown';
  const mult = liveMult;
  const bigColor = phase === 'crashed' ? 'var(--cp-no)'
    : mult >= 5 ? 'var(--cp-sun)'
    : mult >= 2 ? 'var(--cp-yes)'
    : 'var(--cp-text-on-ink)';

  return (
    <main className="cp-page-pad" style={{
      maxWidth: 1280, margin: '0 auto', padding: '24px 28px', width: '100%',
      display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start',
    }}>
      <CrashStage
        phase={phase as any}
        multiplier={mult}
        crashAt={state?.round.crashMultiplier ?? null}
        cashedOutAt={cashedOutAt}
        msUntilStart={state?.msUntilStart ?? 0}
        roundStartedAtMs={state ? new Date(state.round.startsAt).getTime() : undefined}
        roundNumber={state?.round.roundNumber}
        history={history}
        seedHash={state?.round.serverSeedHash}
        serverSeed={state?.round.serverSeed}
        betsThisRound={state?.betsThisRound ?? 0}
        stakeUsdtThisRound={state?.stakeUsdtThisRound ?? 0}
      />

      <aside style={{
        background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)',
        padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--cp-serif)' }}>
          {myBetId ? 'Your bet is in' : phase === 'pending' ? 'Place bet' : phase === 'running' ? 'Betting closed' : 'Wait for next round'}
        </div>

        <div>
          <label style={{ fontSize: 11.5, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Stake
          </label>
          <div style={{
            marginTop: 6, display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--cp-card-sub)', borderRadius: 10,
            border: '1px solid var(--cp-line)', padding: '8px 12px',
          }}>
            <input
              type="text" inputMode="decimal" value={stake}
              onChange={e => setStake(Math.max(0, parseFloat(e.target.value.replace(/[^\d.]/g,'')) || 0))}
              className="cp-num" disabled={!!myBetId || phase !== 'pending'}
              style={{ flex: 1, minWidth: 0, height: 32, border: 0, outline: 'none', background: 'transparent', fontSize: 20, fontWeight: 600, color: 'var(--cp-text)' }}
            />
            <span style={{ fontSize: 12, color: 'var(--cp-text-3)', fontWeight: 600 }} className="cp-num">USDT</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {[1, 5, 10, 25, 100].map(v => (
              <button key={v} onClick={() => setStake(v)} disabled={!!myBetId || phase !== 'pending'} style={{
                height: 26, padding: '0 10px', borderRadius: 999,
                border: '1px solid var(--cp-line-strong)', background: 'var(--cp-card)',
                color: 'var(--cp-text-2)', fontSize: 12, cursor: !!myBetId || phase !== 'pending' ? 'not-allowed' : 'pointer',
                opacity: !!myBetId || phase !== 'pending' ? 0.5 : 1,
              }}><span className="cp-num">${v}</span></button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11.5, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Auto cash out (optional)
          </label>
          <div style={{
            marginTop: 6, display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--cp-card-sub)', borderRadius: 10,
            border: '1px solid var(--cp-line)', padding: '8px 12px',
          }}>
            <input
              type="text" inputMode="decimal" value={autoCash ?? ''}
              onChange={e => {
                const v = parseFloat(e.target.value.replace(/[^\d.]/g,''));
                setAutoCash(isFinite(v) && v > 0 ? v : null);
              }}
              className="cp-num" disabled={!!myBetId || phase !== 'pending'}
              placeholder="2.00"
              style={{ flex: 1, minWidth: 0, height: 32, border: 0, outline: 'none', background: 'transparent', fontSize: 18, fontWeight: 600, color: 'var(--cp-text)' }}
            />
            <span style={{ fontSize: 12, color: 'var(--cp-text-3)', fontWeight: 600 }} className="cp-num">×</span>
          </div>
        </div>

        {!myBetId && (
          <Button kind="sun" size="lg" full onClick={placeBet}
            disabled={placing || phase !== 'pending' || stake < 1 || !user}>
            {!user ? 'Sign in to bet'
              : phase !== 'pending' ? 'Betting closed'
              : placing ? 'Placing…'
              : `Bet ${fmtUsdt(stake)}`}
          </Button>
        )}
        {myBetId && phase === 'running' && (
          <Button kind="yes" size="lg" full onClick={cashOut} disabled={cashingOut}>
            {cashingOut ? 'Cashing out…' : `CASH OUT @ ${mult.toFixed(2)}× = ${fmtUsdt(stake * mult * 0.95)}`}
          </Button>
        )}
        {myBetId && phase !== 'running' && (
          <div style={{
            padding: 10, borderRadius: 10, background: 'var(--cp-card-sub)',
            fontSize: 12.5, color: 'var(--cp-text-2)', textAlign: 'center',
          }}>
            Bet placed for next round. Waiting for liftoff.
          </div>
        )}

        <div style={{
          padding: 10, borderRadius: 10, background: 'var(--cp-card-sub)',
          border: '1px solid var(--cp-line)', fontSize: 11.5, color: 'var(--cp-text-2)', lineHeight: 1.55,
        }}>
          <div style={{ fontWeight: 600, color: 'var(--cp-text)', marginBottom: 4 }}>Provably fair</div>
          Each round&rsquo;s crash multiplier is computed from a 32-byte server seed
          we publish the hash of <em>before</em> betting opens. After the round we
          reveal the seed so you can verify with any HMAC-SHA256 tool.
          5% house edge.
        </div>
      </aside>
    </main>
  );
}
