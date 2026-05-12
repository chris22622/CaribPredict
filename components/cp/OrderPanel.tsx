'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { calculateBuyCost, calculateSellPayout, MarketState } from '@/lib/amm';
import { CpMarket, fmtUsdt, fmtUsdtFromSats, satsToUsd, usdToSats, multiplierFromProb } from '@/lib/cp-data';

interface OrderPanelProps {
  market: CpMarket;
  userId?: string;
  userBalanceSats: number;
  userPositions: { [optionId: string]: number };
  defaultOutcomeId?: string;
  defaultSide?: 'YES' | 'NO';
  onTradeComplete?: () => void;
}

export default function OrderPanel({ market, userId, userBalanceSats, userPositions, defaultOutcomeId, defaultSide = 'YES', onTradeComplete }: OrderPanelProps) {
  const [outcomeId, setOutcomeId] = useState<string>(defaultOutcomeId || market.outcomes[0].id);
  const [side, setSide] = useState<'YES' | 'NO'>(defaultSide);
  const [mode, setMode] = useState<'BUY' | 'SELL'>('BUY');
  const [amountUsd, setAmountUsd] = useState<number>(20);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (defaultOutcomeId) setOutcomeId(defaultOutcomeId);
  }, [defaultOutcomeId]);

  const outcome = market.outcomes.find(o => o.id === outcomeId) || market.outcomes[0];
  const balanceUsd = satsToUsd(userBalanceSats);

  const quote = useMemo(() => {
    if (!outcome || amountUsd <= 0) return null;
    const optionIndex = market.outcomes.findIndex(o => o.id === outcome.id);
    if (optionIndex < 0) return null;
    const state: MarketState = {
      shares: market.outcomes.map(o => o.total_shares),
      liquidityParameter: market.liquidityParameter,
    };
    const amountSats = usdToSats(amountUsd);
    const pricePerShareSats = (side === 'YES' ? outcome.prob : (1 - outcome.prob)) * 1; // not used directly
    void pricePerShareSats;
    const probPriceUsd = (side === 'YES' ? outcome.prob : (1 - outcome.prob));
    if (probPriceUsd <= 0) return null;
    const sharesNum = amountSats / Math.max(1, probPriceUsd * usdToSats(1));
    try {
      if (mode === 'BUY') {
        const q = calculateBuyCost(state, optionIndex, sharesNum);
        return { shares: sharesNum, costSats: q.cost, pricePerShare: q.price, newProbability: q.newProbability };
      } else {
        const q = calculateSellPayout(state, optionIndex, sharesNum);
        return { shares: sharesNum, costSats: q.cost, pricePerShare: q.price, newProbability: q.newProbability };
      }
    } catch {
      return null;
    }
  }, [outcome, amountUsd, side, mode, market]);

  const priceCents = Math.round((side === 'YES' ? outcome.prob : (1 - outcome.prob)) * 100);
  const sideColor = side === 'YES' ? 'var(--cp-yes)' : 'var(--cp-no)';
  const potentialUsd = quote ? satsToUsd(quote.shares * usdToSats(1)) : 0;
  const profitUsd = potentialUsd - amountUsd;

  async function handleSubmit() {
    if (!userId) {
      toast.error('Please sign in to trade');
      return;
    }
    if (!quote) return;
    if (mode === 'BUY' && quote.costSats > userBalanceSats) {
      toast.error('Insufficient balance');
      return;
    }
    setSubmitting(true);
    try {
      // Phase 3: route to the peer-to-peer matching exchange instead of LMSR.
      // The legacy /api/trade endpoint is kept around but no longer wired here.
      const res = await fetch('/api/bet/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          marketId: market.id,
          optionId: outcome.id,
          side,
          amountUsdt: amountUsd,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bet failed');
      const matched = (data.matchedUsdt ?? 0).toFixed(2);
      const unmatched = (data.unmatchedUsdt ?? 0).toFixed(2);
      if (data.matchedUsdt > 0 && data.unmatchedUsdt > 0) {
        toast.success(`Placed ${fmtUsdt(amountUsd)}: matched ${matched} USDT, ${unmatched} USDT open.`);
      } else if (data.matchedUsdt > 0) {
        toast.success(`Matched ${matched} USDT on ${side} ${Math.round((data.probabilityAtOrder ?? 0) * 100)}%`);
      } else {
        toast.success(`Open order placed: ${fmtUsdt(amountUsd)} on ${side}. Waiting for a counterparty.`);
      }
      onTradeComplete?.();
    } catch (e: any) {
      toast.error(e.message || 'Bet failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <aside style={{
      background: 'var(--cp-card)', borderRadius: 14,
      border: '1px solid var(--cp-line)', padding: 16,
      display: 'flex', flexDirection: 'column', gap: 14,
      boxShadow: 'var(--cp-shadow-card)',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        background: 'var(--cp-page-2)', borderRadius: 8, padding: 3,
      }}>
        {(['BUY', 'SELL'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            height: 32, borderRadius: 6, border: 0, cursor: 'pointer',
            background: mode === m ? 'var(--cp-card)' : 'transparent',
            color: mode === m ? 'var(--cp-text)' : 'var(--cp-text-3)',
            fontWeight: 600, fontSize: 12.5,
            boxShadow: mode === m ? '0 1px 2px rgba(20,24,31,.08)' : 'none',
          }}>{m === 'BUY' ? 'Buy' : 'Sell'}</button>
        ))}
      </div>

      {market.outcomes.length > 1 && (
        <div>
          <label style={{ fontSize: 11.5, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Outcome
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {market.outcomes.map(o => (
              <button key={o.id} onClick={() => setOutcomeId(o.id)} style={{
                display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center',
                gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                background: outcomeId === o.id ? 'var(--cp-card-sub)' : 'transparent',
                border: '1px solid', borderColor: outcomeId === o.id ? 'var(--cp-line-strong)' : 'var(--cp-line)',
                color: 'var(--cp-text)', fontSize: 13, textAlign: 'left',
              }}>
                <span style={{ fontWeight: 500 }}>{o.label}</span>
                <span className="cp-num" style={{ fontWeight: 600 }}>{Math.round(o.prob * 100)}%</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {(['YES', 'NO'] as const).map(s => {
          const active = side === s;
          const baseS = s === 'YES';
          return (
            <button key={s} onClick={() => setSide(s)} style={{
              height: 44, borderRadius: 8, border: 0, cursor: 'pointer',
              background: active ? (baseS ? 'var(--cp-yes)' : 'var(--cp-no)') : (baseS ? 'var(--cp-yes-soft)' : 'var(--cp-no-soft)'),
              color: active ? '#fff' : (baseS ? 'var(--cp-yes-ink)' : 'var(--cp-no-ink)'),
              fontWeight: 600, fontSize: 13.5, textAlign: 'left', padding: '0 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>{s === 'YES' ? 'Yes' : 'No'}</span>
              <span className="cp-num">{Math.round(baseS ? outcome.prob * 100 : (1 - outcome.prob) * 100)}¢</span>
            </button>
          );
        })}
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <label style={{ fontSize: 11.5, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Amount
          </label>
          <span style={{ fontSize: 11.5, color: 'var(--cp-text-3)' }}>
            Balance <span className="cp-num">{fmtUsdt(balanceUsd)}</span>
          </span>
        </div>
        <div style={{
          marginTop: 6, display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--cp-card-sub)', borderRadius: 10,
          border: '1px solid var(--cp-line)', padding: '8px 12px',
        }}>
          <input
            type="text" inputMode="decimal" value={amountUsd}
            onChange={e => setAmountUsd(Math.max(0, parseFloat(e.target.value.replace(/[^\d.]/g,'')) || 0))}
            className="cp-num"
            style={{
              flex: 1, minWidth: 0, height: 36, border: 0, outline: 'none', background: 'transparent',
              fontSize: 22, fontWeight: 600, color: 'var(--cp-text)',
            }}
          />
          <span style={{ fontSize: 13, color: 'var(--cp-text-3)', fontWeight: 600 }} className="cp-num">
            USDT
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {[1, 20, 100, 500].map(v => (
            <button key={v} onClick={() => setAmountUsd(v)} style={{
              height: 26, padding: '0 10px', borderRadius: 999,
              border: '1px solid var(--cp-line-strong)', background: 'var(--cp-card)',
              color: 'var(--cp-text-2)', fontSize: 12, cursor: 'pointer',
            }}><span className="cp-num">${v}</span></button>
          ))}
          <button onClick={() => setAmountUsd(Math.floor(balanceUsd))} style={{
            height: 26, padding: '0 10px', borderRadius: 999,
            border: '1px solid var(--cp-line-strong)', background: 'var(--cp-card)',
            color: 'var(--cp-text-2)', fontSize: 12, cursor: 'pointer', fontWeight: 600,
          }}>Max</button>
        </div>
      </div>

      {quote && (
        <div style={{
          background: 'var(--cp-card-sub)', borderRadius: 10,
          padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6,
          fontSize: 12.5, color: 'var(--cp-text-2)',
        }}>
          <Row k="Odds" v={`${priceCents}% · ${multiplierFromProb(side === 'YES' ? outcome.prob : (1 - outcome.prob))}`}/>
          <Row k="Stake" v={fmtUsdt(amountUsd)}/>
          <Row k="Potential return" v={fmtUsdt(potentialUsd)} hi={profitUsd > 0 ? 'yes' : undefined}/>
          <div style={{ height: 1, background: 'var(--cp-line)', margin: '2px 0' }}/>
          <Row k="If you're right" v={`${fmtUsdt(profitUsd, { signed: true })}  ·  ${profitUsd >= 0 ? '+' : ''}${amountUsd > 0 ? Math.round((profitUsd / amountUsd) * 100) : 0}%`} hi="yes"/>
        </div>
      )}

      <button onClick={handleSubmit} disabled={submitting || !quote || !userId} style={{
        height: 52, borderRadius: 10, border: 0, cursor: submitting ? 'not-allowed' : 'pointer',
        background: sideColor, color: '#fff', fontWeight: 700, fontSize: 15,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        letterSpacing: '0.01em', opacity: submitting || !quote ? 0.7 : 1,
      }}>
        {submitting ? (
          <span>Processing…</span>
        ) : (
          <>
            <span>{!userId ? 'Sign in to trade' : `${mode === 'BUY' ? 'Buy' : 'Sell'} ${side === 'YES' ? 'Yes' : 'No'}`}</span>
            {userId && <><span style={{ opacity: 0.85 }}>·</span><span className="cp-num">{priceCents}¢</span></>}
          </>
        )}
      </button>

      <div style={{ fontSize: 11, color: 'var(--cp-text-3)', textAlign: 'center', lineHeight: 1.4 }}>
        Peer-to-peer. Your stake locks against a counterparty bet.
        Winners take 95% of pool. 5% house fee. Unmatched bets refund on close.
      </div>
    </aside>
  );
}

function Row({ k, v, hi }: { k: string; v: string; hi?: 'yes' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ color: 'var(--cp-text-3)' }}>{k}</span>
      <span className="cp-num" style={{
        fontWeight: 600,
        color: hi === 'yes' ? 'var(--cp-yes-ink)' : 'var(--cp-text)',
      }}>{v}</span>
    </div>
  );
}
