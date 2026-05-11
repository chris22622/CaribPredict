'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase, getOrCreateUser } from '@/lib/supabase';
import { Position, Trade, Market, MarketOption } from '@/lib/types';
import {
  toCpMarket, CpMarket, fmtUsd, fmtSats, satsToUsd,
} from '@/lib/cp-data';
import { SunDot } from '@/components/cp/Icon';
import { Thumb, Button, Avatar } from '@/components/cp/Primitives';

interface EnrichedPosition {
  position: Position;
  market: CpMarket;
  side: 'YES' | 'NO';
  shares: number;
  avg: number;
  last: number;
  value: number;
  pnl: number;
  pnlPct: number;
}

export default function PortfolioPage() {
  const [userData, setUserData] = useState<any>(null);
  const [positions, setPositions] = useState<EnrichedPosition[]>([]);
  const [trades, setTrades] = useState<{ trade: Trade; market: CpMarket }[]>([]);
  const [tab, setTab] = useState<'positions'|'history'|'watchlist'|'rewards'>('positions');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      const u = await getOrCreateUser();
      setUserData(u);

      const { data: ps } = await supabase.from('positions').select('*').eq('user_id', u.id).gt('shares', 0).order('updated_at', { ascending: false });
      const positionList = (ps || []) as Position[];
      const marketIds = Array.from(new Set(positionList.map(p => p.market_id)));

      const { data: ts } = await supabase.from('trades').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(20);
      const tradeList = (ts || []) as Trade[];
      const tradeMarketIds = Array.from(new Set(tradeList.map(t => t.market_id)));

      const allMarketIds = Array.from(new Set([...marketIds, ...tradeMarketIds]));
      const { data: ms } = await supabase.from('markets').select('*').in('id', allMarketIds);
      const { data: os } = await supabase.from('market_options').select('*').in('market_id', allMarketIds);
      const mMap = new Map<string, Market>(); (ms || []).forEach((m: Market) => mMap.set(m.id, m));
      const oByMarket: Record<string, MarketOption[]> = {};
      (os || []).forEach((o: MarketOption) => { (oByMarket[o.market_id] ||= []).push(o); });
      const cpByMarket = new Map<string, CpMarket>();
      mMap.forEach((m, id) => cpByMarket.set(id, toCpMarket(m, oByMarket[id] || [])));

      const enriched: EnrichedPosition[] = positionList.map(p => {
        const mk = cpByMarket.get(p.market_id)!;
        const opt = mk?.outcomes.find(o => o.id === p.option_id);
        const last = opt?.prob ?? 0;
        const avgProb = p.avg_price; // stored as price-per-share (0-1 range when LMSR)
        const side: 'YES' | 'NO' = 'YES';
        const value = p.shares * last;
        const pnl = (last - avgProb) * p.shares;
        const pnlPct = avgProb > 0 ? (last - avgProb) / avgProb : 0;
        return { position: p, market: mk, side, shares: p.shares, avg: avgProb, last, value, pnl, pnlPct };
      }).filter(x => x.market);

      setPositions(enriched);
      setTrades(tradeList.map(t => ({ trade: t, market: cpByMarket.get(t.market_id)! })).filter(x => x.market));
    } catch (e: any) {
      setError(e.message || 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => {
    const valueUsd = positions.reduce((acc, p) => acc + satsToUsd(p.value), 0);
    const pnlUsd = positions.reduce((acc, p) => acc + satsToUsd(p.pnl), 0);
    const cashSats = userData?.balance_satoshis || 0;
    const cashUsd = satsToUsd(cashSats);
    return { valueUsd, pnlUsd, cashSats, cashUsd };
  }, [positions, userData]);

  if (loading) {
    return (
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 28px', textAlign: 'center', color: 'var(--cp-text-3)' }}>
        <div style={{ width: 32, height: 32, margin: '0 auto 12px', borderRadius: '50%', border: '3px solid var(--cp-line)', borderTopColor: 'var(--cp-ink)', animation: 'spin 1s linear infinite' }}/>
        Loading portfolio…
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }
  if (error) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 28px' }}>
        <div style={{ padding: '14px 16px', background: 'var(--cp-no-soft)', color: 'var(--cp-no-ink)', borderRadius: 10 }}>{error}</div>
      </main>
    );
  }

  const pnlSign = summary.pnlUsd >= 0;
  const valueDenom = summary.valueUsd > 0 ? summary.valueUsd : 1;

  return (
    <main className="cp-page-pad" style={{ maxWidth: 1280, margin: '0 auto', padding: '28px', width: '100%' }}>
      <header className="cp-portfolio-grid" style={{
        display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 18,
        background: 'var(--cp-ink)', color: 'var(--cp-text-on-ink)',
        borderRadius: 16, padding: '24px 28px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -60, bottom: -60, opacity: 0.12 }}>
          <SunDot size={240} color="var(--cp-sun)"/>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, color: 'var(--cp-text-on-ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Portfolio value</div>
          <div className="cp-num cp-big-num" style={{ fontFamily: 'var(--cp-serif)', fontSize: 56, lineHeight: 1, marginTop: 8, letterSpacing: '-0.02em' }}>{fmtUsd(summary.valueUsd)}</div>
          <div className="cp-num" style={{ fontSize: 12, color: 'var(--cp-text-on-ink-3)', marginTop: 6 }}>
            {fmtSats(positions.reduce((a, p) => a + p.value, 0))}
          </div>
        </div>
        <PStat label="Total P&L" value={fmtUsd(summary.pnlUsd, { signed: true })} accent={pnlSign ? 'yes' : 'no'} sub={`${pnlSign ? '+' : ''}${Math.round((summary.pnlUsd / valueDenom) * 1000) / 10}% on positions`}/>
        <PStat label="Open positions" value={String(positions.length)} sub={`${trades.length} trades`}/>
        <PStat label="Cash" value={fmtUsd(summary.cashUsd)} sub={fmtSats(summary.cashSats)}
          trailing={<Button kind="sun" size="sm" icon="plus">Deposit</Button>}/>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid var(--cp-line)', marginTop: 28 }}>
        {(['positions','history','watchlist','rewards'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '12px 14px', border: 0, background: 'transparent', cursor: 'pointer',
            fontSize: 13.5, fontWeight: 600,
            color: tab === t ? 'var(--cp-text)' : 'var(--cp-text-3)',
            borderBottom: '2px solid', marginBottom: -1,
            borderColor: tab === t ? 'var(--cp-ink)' : 'transparent',
            textTransform: 'capitalize',
          }}>{t}</button>
        ))}
      </div>

      <section style={{ marginTop: 20 }}>
        {tab === 'positions' && <PositionsTable rows={positions}/>}
        {tab === 'history' && <HistoryTable rows={trades}/>}
        {tab === 'watchlist' && <WatchlistEmpty/>}
        {tab === 'rewards' && <RewardsEmpty/>}
      </section>
    </main>
  );
}

function PStat({ label, value, sub, accent, trailing }: { label: string; value: string; sub?: string; accent?: 'yes' | 'no'; trailing?: React.ReactNode }) {
  const c = accent === 'yes' ? '#7CE0BC' : accent === 'no' ? '#FFB1A4' : 'var(--cp-text-on-ink)';
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--cp-text-on-ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{label}</div>
        <div className="cp-num" style={{ fontFamily: 'var(--cp-serif)', fontSize: 30, marginTop: 6, letterSpacing: '-0.01em', color: c }}>{value}</div>
        {sub && <div className="cp-num" style={{ fontSize: 12, color: 'var(--cp-text-on-ink-3)', marginTop: 4 }}>{sub}</div>}
      </div>
      {trailing && <div style={{ marginTop: 12 }}>{trailing}</div>}
    </div>
  );
}

function PositionsTable({ rows }: { rows: EnrichedPosition[] }) {
  if (rows.length === 0) {
    return (
      <div style={{ padding: '60px 20px', background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)', textAlign: 'center' }}>
        <p style={{ margin: 0, color: 'var(--cp-text-3)', fontSize: 14 }}>No open positions. Place your first trade to get started.</p>
      </div>
    );
  }
  return (
    <div style={{
      background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)',
      overflow: 'hidden', boxShadow: 'var(--cp-shadow-card)',
    }}>
      <div className="cp-positions-header" style={{
        display: 'grid', gridTemplateColumns: '2.2fr 90px 90px 100px 110px 90px',
        fontSize: 11, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em',
        padding: '14px 20px', borderBottom: '1px solid var(--cp-line)', background: 'var(--cp-card-sub)',
      }}>
        <div>Market</div>
        <div style={{ textAlign: 'right' }}>Shares</div>
        <div style={{ textAlign: 'right' }}>Avg</div>
        <div style={{ textAlign: 'right' }}>Current</div>
        <div style={{ textAlign: 'right' }}>P&amp;L</div>
        <div></div>
      </div>
      {rows.map((r, i) => (
        <Link key={r.position.id} href={`/market/${r.market.id}`} className="cp-positions-row" style={{
          display: 'grid', gridTemplateColumns: '2.2fr 90px 90px 100px 110px 90px',
          padding: '14px 20px', alignItems: 'center',
          borderBottom: i < rows.length - 1 ? '1px solid var(--cp-line)' : 0,
          textDecoration: 'none', color: 'inherit',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <Thumb market={r.market} size={38} radius={8}/>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--cp-serif)', fontSize: 15.5, color: 'var(--cp-text)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{r.market.question}</div>
              <div style={{ fontSize: 11.5, color: 'var(--cp-text-3)', marginTop: 2 }}>
                {r.market.countries.map(c => c).join(' ')}
              </div>
            </div>
          </div>
          <div className="cp-num" style={{ textAlign: 'right', fontSize: 13.5 }}>{r.shares.toLocaleString('en-US', { maximumFractionDigits: 1 })}</div>
          <div className="cp-num" style={{ textAlign: 'right', fontSize: 13.5, color: 'var(--cp-text-2)' }}>{Math.round(r.avg * 100)}¢</div>
          <div className="cp-num" style={{ textAlign: 'right', fontSize: 13.5, fontWeight: 600 }}>{Math.round(r.last * 100)}¢</div>
          <div style={{ textAlign: 'right' }}>
            <div className="cp-num" style={{
              fontSize: 14, fontWeight: 600,
              color: r.pnl >= 0 ? 'var(--cp-yes-ink)' : 'var(--cp-no-ink)',
            }}>{fmtSats(r.pnl)}</div>
            <div className="cp-num" style={{
              fontSize: 11, color: r.pnl >= 0 ? 'var(--cp-yes)' : 'var(--cp-no)',
            }}>{r.pnlPct >= 0 ? '+' : ''}{Math.round(r.pnlPct * 100)}%</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Button kind="outline" size="sm">Trade</Button>
          </div>
        </Link>
      ))}
    </div>
  );
}

function HistoryTable({ rows }: { rows: { trade: Trade; market: CpMarket }[] }) {
  if (rows.length === 0) {
    return (
      <div style={{ padding: '60px 20px', background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)', textAlign: 'center' }}>
        <p style={{ margin: 0, color: 'var(--cp-text-3)', fontSize: 14 }}>No trades yet.</p>
      </div>
    );
  }
  return (
    <div style={{ background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)', overflow: 'hidden' }}>
      <div className="cp-history-header" style={{
        display: 'grid', gridTemplateColumns: '160px 90px 1fr 80px 100px 110px',
        fontSize: 11, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em',
        padding: '14px 20px', borderBottom: '1px solid var(--cp-line)', background: 'var(--cp-card-sub)',
      }}>
        <div>When</div><div>Action</div><div>Market</div>
        <div style={{ textAlign: 'right' }}>Shares</div>
        <div style={{ textAlign: 'right' }}>Price</div>
        <div style={{ textAlign: 'right' }}>Total</div>
      </div>
      {rows.map(({ trade, market }, i) => (
        <div key={trade.id} className="cp-history-row" style={{
          display: 'grid', gridTemplateColumns: '160px 90px 1fr 80px 100px 110px',
          padding: '14px 20px', alignItems: 'center',
          borderBottom: i < rows.length - 1 ? '1px solid var(--cp-line)' : 0,
          fontSize: 13.5,
        }}>
          <div style={{ color: 'var(--cp-text-3)' }} className="cp-num">{new Date(trade.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          <div style={{ fontWeight: 600, color: trade.is_buy ? 'var(--cp-yes-ink)' : 'var(--cp-no-ink)' }}>{trade.is_buy ? 'Bought' : 'Sold'}</div>
          <Link href={`/market/${market.id}`} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--cp-serif)', fontSize: 14.5, color: 'inherit', textDecoration: 'none' }}>{market.question}</Link>
          <div className="cp-num" style={{ textAlign: 'right' }}>{trade.shares.toLocaleString('en-US', { maximumFractionDigits: 1 })}</div>
          <div className="cp-num" style={{ textAlign: 'right' }}>{Math.round(trade.price * 100)}¢</div>
          <div className="cp-num" style={{ textAlign: 'right' }}>{fmtSats(trade.total_cost)}</div>
        </div>
      ))}
    </div>
  );
}

function WatchlistEmpty() {
  return (
    <div style={{ padding: '60px 20px', background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)', textAlign: 'center' }}>
      <p style={{ margin: 0, color: 'var(--cp-text-3)', fontSize: 14 }}>Bookmark markets from the home page to see them here.</p>
    </div>
  );
}

function RewardsEmpty() {
  return (
    <div style={{
      padding: '60px 20px', background: 'var(--cp-card)', borderRadius: 14,
      border: '1px solid var(--cp-line)', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    }}>
      <SunDot size={36}/>
      <h3 style={{ margin: 0, fontFamily: 'var(--cp-serif)', fontSize: 22, fontWeight: 400 }}>Rewards coming soon</h3>
      <p style={{ margin: 0, color: 'var(--cp-text-3)', maxWidth: 460, fontSize: 13.5, lineHeight: 1.5 }}>
        Trade on multiple CARICOM markets to start earning weekly rewards, paid in sats.
      </p>
    </div>
  );
}
