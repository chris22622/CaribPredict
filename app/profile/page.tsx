'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase, getOrCreateUser } from '@/lib/supabase';
import { Position, Trade, Market, MarketOption } from '@/lib/types';
import {
  toCpMarket, CpMarket, fmtUsdt, fmtUsdtFromSats, satsToUsd,
} from '@/lib/cp-data';
import { SunDot } from '@/components/cp/Icon';
import { Thumb, Button, Avatar } from '@/components/cp/Primitives';
import { useCp } from '@/app/layout-client';

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
  const { user: authUser, loading: authLoading, openAuth } = useCp();
  const [userData, setUserData] = useState<any>(null);
  const [positions, setPositions] = useState<EnrichedPosition[]>([]);
  const [trades, setTrades] = useState<{ trade: Trade; market: CpMarket }[]>([]);
  const [tab, setTab] = useState<'positions'|'history'|'watchlist'|'referrals'>('positions');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;          // wait for layout to resolve session
    if (!authUser) { setLoading(false); return; }
    load();
  }, [authUser, authLoading]);

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

  if (!authLoading && !authUser) {
    return (
      <main style={{ maxWidth: 520, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{
          background: 'var(--cp-card)', border: '1px solid var(--cp-line)',
          borderRadius: 16, padding: '40px 28px', boxShadow: 'var(--cp-shadow-card)',
        }}>
          <div style={{ display: 'inline-flex', marginBottom: 12 }}>
            <SunDot size={36} color="var(--cp-sun)"/>
          </div>
          <h1 style={{
            margin: 0, fontFamily: 'var(--cp-serif)', fontWeight: 400,
            fontSize: 26, letterSpacing: '-0.01em', color: 'var(--cp-text)',
          }}>
            Sign in to see your portfolio
          </h1>
          <p style={{ margin: '10px 0 22px', color: 'var(--cp-text-3)', fontSize: 14, lineHeight: 1.55 }}>
            Track your positions, trade history, referrals and wagering progress in one place.
          </p>
          <Button kind="sun" size="md" onClick={openAuth}>Sign in or create account</Button>
          <div style={{ marginTop: 14, fontSize: 12.5 }}>
            <Link href="/" style={{ color: 'var(--cp-text-3)', textDecoration: 'none' }}>
              ← Back to markets
            </Link>
          </div>
        </div>
      </main>
    );
  }
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
          <div className="cp-num cp-big-num" style={{ fontFamily: 'var(--cp-serif)', fontSize: 56, lineHeight: 1, marginTop: 8, letterSpacing: '-0.02em' }}>{fmtUsdt(summary.valueUsd)}</div>
          <div className="cp-num" style={{ fontSize: 12, color: 'var(--cp-text-on-ink-3)', marginTop: 6 }}>
            {fmtUsdtFromSats(positions.reduce((a, p) => a + p.value, 0))}
          </div>
        </div>
        <PStat label="Total P&L" value={fmtUsdt(summary.pnlUsd, { signed: true })} accent={pnlSign ? 'yes' : 'no'} sub={`${pnlSign ? '+' : ''}${Math.round((summary.pnlUsd / valueDenom) * 1000) / 10}% on positions`}/>
        <PStat label="Open positions" value={String(positions.length)} sub={`${trades.length} trades`}/>
        <PStat label="Cash" value={fmtUsdt(summary.cashUsd)} sub="TRC-20 wallet"
          trailing={<Button kind="sun" size="sm" icon="plus">Deposit</Button>}/>
      </header>

      <WageringProgress userId={userData?.id}/>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid var(--cp-line)', marginTop: 28 }}>
        {(['positions','history','watchlist','referrals'] as const).map(t => (
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
        {tab === 'referrals' && <Referrals userId={userData?.id}/>}
      </section>
    </main>
  );
}

function WageringProgress({ userId }: { userId?: string }) {
  const [data, setData] = useState<{
    required: number; completed: number; remaining: number;
    unlocked: boolean; balance: number;
  }>({ required: 0, completed: 0, remaining: 0, unlocked: true, balance: 0 });

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/wallet/status?userId=${userId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) return;
        setData({
          required: d.wagering?.requiredUsdt || 0,
          completed: d.wagering?.completedUsdt || 0,
          remaining: d.wagering?.remainingUsdt || 0,
          unlocked: !!d.wagering?.unlocked,
          balance: d.balanceUsdt || 0,
        });
      })
      .catch(() => {/* silent */});
  }, [userId]);

  const hasDeposit = data.required > 0;
  const pct = data.required > 0 ? Math.min(100, (data.completed / data.required) * 100) : 0;
  const done = data.unlocked && hasDeposit;
  return (
    <div style={{
      marginTop: 18, background: 'var(--cp-card)', borderRadius: 12,
      border: '1px solid var(--cp-line)', padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{
            fontSize: 11.5, color: 'var(--cp-text-3)', textTransform: 'uppercase',
            letterSpacing: '0.06em', fontWeight: 600,
          }}>
            Wagering requirement
          </span>
          <span className="cp-num" style={{ fontSize: 12.5, color: 'var(--cp-text-2)' }}>
            {hasDeposit
              ? `${data.completed.toFixed(2)} / ${data.required.toFixed(2)} USDT`
              : 'Deposit USDT to unlock'}
          </span>
        </div>
        <div style={{
          height: 8, borderRadius: 999, background: 'var(--cp-page-2)',
          overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--cp-line)',
        }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: done ? 'var(--cp-yes)' : 'var(--cp-sun)',
            transition: 'width .3s ease',
          }}/>
        </div>
        <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--cp-text-3)' }}>
          {!hasDeposit && 'Bet 5× your first deposit to unlock withdrawals. Welcome bonus credits track separately at 10×.'}
          {hasDeposit && !done && `Bet ${data.remaining.toFixed(2)} USDT more to unlock withdrawals.`}
          {done && '✓ All future withdrawals are instant.'}
        </div>
      </div>
      <Button kind={done ? 'sun' : 'outline'} size="md" icon={done ? 'arrow-up' : 'minus'} disabled={!done}>
        {done ? 'Withdraw' : 'Locked'}
      </Button>
    </div>
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
            }}>{fmtUsdtFromSats(r.pnl)}</div>
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
          <div className="cp-num" style={{ textAlign: 'right' }}>{fmtUsdtFromSats(trade.total_cost)}</div>
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

function Referrals({ userId }: { userId?: string }) {
  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/referrals/me?userId=${userId}`).then(r => r.json()).then(setData).catch(() => {/*silent*/});
  }, [userId]);

  if (!userId) {
    return (
      <div style={{ padding: '60px 20px', background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)', textAlign: 'center' }}>
        <p style={{ margin: 0, color: 'var(--cp-text-3)', fontSize: 14 }}>Sign in to see your referral link.</p>
      </div>
    );
  }
  if (!data) {
    return <div style={{ padding: 40, color: 'var(--cp-text-3)', fontSize: 13, textAlign: 'center' }}>Loading…</div>;
  }
  if (data.error) {
    return <div style={{ padding: 14, background: 'var(--cp-no-soft)', color: 'var(--cp-no-ink)', borderRadius: 10 }}>{data.error}</div>;
  }

  function copy(value: string) {
    navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)',
        padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Your referral code
            </div>
            <div className="cp-num" style={{ fontFamily: 'var(--cp-serif)', fontSize: 40, lineHeight: 1, marginTop: 6, letterSpacing: '0.05em', color: 'var(--cp-sun)' }}>
              {data.referralCode || '—'}
            </div>
            {data.shareUrl && (
              <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--cp-text-3)' }}>
                Share <span className="cp-num" style={{ color: 'var(--cp-text-2)' }}>{data.shareUrl}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {data.shareUrl && <Button kind="outline" onClick={() => copy(data.shareUrl)}>{copied ? 'Copied' : 'Copy link'}</Button>}
            {data.referralCode && <Button kind="primary" onClick={() => copy(data.referralCode)}>Copy code</Button>}
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12,
      }} className="cp-portfolio-grid">
        <Mini label="Active referrals" value={String(data.activeReferrals ?? 0)} sub={`${data.totalReferrals ?? 0} total signed up`}/>
        <Mini label="Tier" value={data.currentTier?.name || 'None'} sub={`${(data.currentTier?.rateBps ?? 0) / 100}% of fee earned`}/>
        <Mini label="Earned total" value={fmtUsdt(data.earnings?.totalUsdt ?? 0)} sub={`${fmtUsdt(data.earnings?.pendingUsdt ?? 0)} pending`}/>
        <Mini label="Next tier" value={data.nextTier?.name || 'Top tier'}
          sub={data.nextTier ? `${data.nextTier.minActiveRefs - (data.activeReferrals || 0)} more to unlock ${data.nextTier.rateBps / 100}%` : 'Maxed'}/>
      </div>

      <div style={{
        background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)',
        padding: 18,
      }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--cp-serif)', fontWeight: 400, fontSize: 20, marginBottom: 12 }}>Recent earnings</h3>
        {(!data.recent || data.recent.length === 0) ? (
          <div style={{ color: 'var(--cp-text-3)', fontSize: 13 }}>
            No earnings yet. Earnings are credited the moment a referred user&rsquo;s bet is matched, paid from the house fee.
          </div>
        ) : (
          <div>
            {data.recent.map((r: any, i: number) => (
              <div key={r.id} style={{
                display: 'grid', gridTemplateColumns: '180px 1fr auto auto',
                gap: 10, alignItems: 'center', padding: '10px 0',
                borderBottom: i < data.recent.length - 1 ? '1px solid var(--cp-line)' : 0,
                fontSize: 13,
              }}>
                <div className="cp-num" style={{ color: 'var(--cp-text-3)' }}>{new Date(r.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                <div style={{ color: 'var(--cp-text-2)' }}>Match fee {fmtUsdt(r.source_fee_usdt)} · rate {r.rate_pct}%</div>
                <div className="cp-num" style={{ color: 'var(--cp-text-3)', fontSize: 12 }}>{r.status}</div>
                <div className="cp-num" style={{ fontWeight: 600, color: 'var(--cp-yes-ink)' }}>+{fmtUsdt(r.earned_usdt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        background: 'var(--cp-card-sub)', borderRadius: 12, border: '1px solid var(--cp-line)',
        padding: '14px 16px', fontSize: 12.5, color: 'var(--cp-text-2)', lineHeight: 1.55,
      }}>
        Earnings tiers based on active referrals (referees who&rsquo;ve placed at least one bet):
        <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
          <li>Starter (1–4): 1.0% of house fee</li>
          <li>Connector (5–14): 1.5%</li>
          <li>Captain (15–29): 2.0%</li>
          <li>Don (30+): 2.5%</li>
        </ul>
      </div>
    </div>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: 'var(--cp-card)', borderRadius: 12, border: '1px solid var(--cp-line)',
      padding: '12px 14px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
      <div className="cp-num" style={{ fontFamily: 'var(--cp-serif)', fontSize: 22, marginTop: 4, color: 'var(--cp-text)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--cp-text-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
