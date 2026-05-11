'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getOrCreateUser } from '@/lib/supabase';
import { Market, MarketOption, Position, Trade, User } from '@/lib/types';
import {
  toCpMarket, CpMarket, getCountry, getCategory,
  fmtCompactUsd, fmtSats, satsToUsd, fmtUsd, genSyntheticHistory, seedFromId,
} from '@/lib/cp-data';
import Icon from '@/components/cp/Icon';
import { Thumb, Button, Avatar } from '@/components/cp/Primitives';
import PriceChart from '@/components/cp/PriceChart';
import OrderPanel from '@/components/cp/OrderPanel';
import { useCp } from '@/app/layout-client';

export default function MarketPage() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const marketId = params.id as string;
  const { user } = useCp();

  const [market, setMarket] = useState<CpMarket | null>(null);
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [positions, setPositions] = useState<{ [optionId: string]: number }>({});
  const [trades, setTrades] = useState<Trade[]>([]);
  const [range, setRange] = useState<'1H'|'6H'|'1D'|'1W'|'1M'|'ALL'>('1W');
  const [tab, setTab] = useState<'comments'|'holders'|'activity'|'rules'>('activity');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, [marketId, user]);

  async function load() {
    setLoading(true); setError('');
    try {
      const { data: m, error: mErr } = await supabase.from('markets').select('*').eq('id', marketId).single();
      if (mErr) throw mErr;
      const { data: os, error: oErr } = await supabase.from('market_options').select('*').eq('market_id', marketId).order('created_at', { ascending: true });
      if (oErr) throw oErr;
      const { data: ts } = await supabase.from('trades').select('*').eq('market_id', marketId).order('created_at', { ascending: false }).limit(40);
      setTrades(ts || []);

      const cp = toCpMarket(m as Market, (os as MarketOption[]) || []);
      const vol = (ts || []).reduce((acc, t: Trade) => acc + satsToUsd(t.total_cost), 0);
      cp.volumeUsd = vol;
      cp.commentCount = 0;
      setMarket(cp);

      if (user) {
        try {
          const u = await getOrCreateUser();
          setDbUser(u);
          const { data: ps } = await supabase.from('positions').select('*').eq('user_id', u.id).eq('market_id', marketId);
          const map: { [k: string]: number } = {};
          (ps || []).forEach((p: Position) => { map[p.option_id] = p.shares; });
          setPositions(map);
        } catch {/* not signed in */}
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load market');
    } finally {
      setLoading(false);
    }
  }

  const history = useMemo(() => {
    if (!market) return { points: [], events: [] };
    return genSyntheticHistory(seedFromId(market.id), market.outcomes[0]?.prob ?? 0.5, 240);
  }, [market]);

  if (loading) {
    return (
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 28px', textAlign: 'center', color: 'var(--cp-text-3)' }}>
        <div style={{ width: 32, height: 32, margin: '0 auto 12px', borderRadius: '50%', border: '3px solid var(--cp-line)', borderTopColor: 'var(--cp-ink)', animation: 'spin 1s linear infinite' }}/>
        Loading market…
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }
  if (error || !market) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 28px' }}>
        <div style={{ padding: '14px 16px', background: 'var(--cp-no-soft)', color: 'var(--cp-no-ink)', borderRadius: 10 }}>
          {error || 'Market not found'}
        </div>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, color: 'var(--cp-text-2)' }}>
          <Icon name="chevron-r" size={12} style={{ transform: 'rotate(180deg)' }}/>
          <span>Back to markets</span>
        </Link>
      </main>
    );
  }

  const top = market.outcomes[0];
  const defaultOutcomeId = search.get('o') || undefined;
  const defaultSide = (search.get('side') as 'YES' | 'NO') || 'YES';

  return (
    <main className="cp-page-pad" style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 28px 40px', width: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--cp-text-3)',
        marginBottom: 14,
      }}>
        <button onClick={() => router.push('/')} style={{
          background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0, fontFamily: 'inherit',
        }}>
          <Icon name="chevron-r" size={12} style={{ transform: 'rotate(180deg)' }}/>
          <span>Markets</span>
        </button>
        <span>/</span>
        <span style={{ textTransform: 'capitalize' }}>{getCategory(market.category)?.name}</span>
        <span>/</span>
        <span style={{ color: 'var(--cp-text-2)' }}>{market.id.slice(0, 8)}</span>
      </div>

      <div className="cp-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 28, alignItems: 'start' }}>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <header style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <Thumb market={market} size={84} radius={14}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                fontSize: 11.5, color: 'var(--cp-text-3)',
                textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
              }}>
                <span>{getCategory(market.category)?.name}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>Closes {market.closes}</span>
              </div>
              <h1 className="cp-detail-h1" style={{
                margin: 0, fontFamily: 'var(--cp-serif)', fontWeight: 400,
                fontSize: 36, lineHeight: 1.1, letterSpacing: '-0.015em',
              }}>{market.question}</h1>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14, marginTop: 12,
                fontSize: 12.5, color: 'var(--cp-text-3)',
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span className="cp-num" style={{ fontWeight: 600, color: 'var(--cp-text-2)' }}>{fmtCompactUsd(market.volumeUsd)}</span>
                  <span>volume</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {market.countries.map(code => (
                    <span key={code} title={getCountry(code)?.name} style={{ fontSize: 16 }}>{getCountry(code)?.flag}</span>
                  ))}
                </span>
              </div>
            </div>
            <div style={{ display: 'inline-flex', gap: 6 }}>
              <Button kind="outline" icon="bookmark" size="sm">Watch</Button>
              <Button kind="outline" icon="share" size="sm">Share</Button>
            </div>
          </header>

          <section style={{
            background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)',
            padding: 20, boxShadow: 'var(--cp-shadow-card)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {top.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span className="cp-num cp-detail-pct-big" style={{
                    fontFamily: 'var(--cp-serif)', fontSize: 56, fontWeight: 400,
                    color: 'var(--cp-yes-ink)', letterSpacing: '-0.02em', lineHeight: 1,
                  }}>{Math.round(top.prob * 100)}%</span>
                </div>
              </div>
              <div className="cp-range-buttons" style={{ display: 'inline-flex', background: 'var(--cp-page-2)', borderRadius: 8, padding: 3 }}>
                {(['1H','6H','1D','1W','1M','ALL'] as const).map(r => (
                  <button key={r} onClick={() => setRange(r)} style={{
                    height: 28, padding: '0 10px', borderRadius: 6, border: 0, cursor: 'pointer',
                    background: range === r ? 'var(--cp-card)' : 'transparent',
                    color: range === r ? 'var(--cp-text)' : 'var(--cp-text-3)',
                    fontFamily: 'var(--cp-mono)', fontSize: 11.5, fontWeight: 600,
                    boxShadow: range === r ? '0 1px 2px rgba(20,24,31,.08)' : 'none',
                  }}>{r}</button>
                ))}
              </div>
            </div>
            <PriceChart points={history.points} events={history.events} range={range} height={300}/>
          </section>

          <section style={{
            background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)',
            padding: 20, boxShadow: 'var(--cp-shadow-card)',
          }}>
            <h3 style={{ margin: '0 0 14px', fontFamily: 'var(--cp-serif)', fontWeight: 400, fontSize: 22, letterSpacing: '-0.01em' }}>Outcomes</h3>
            <div className="cp-outcomes-header" style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 100px 100px',
              fontSize: 11, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em',
              paddingBottom: 8, borderBottom: '1px solid var(--cp-line)',
            }}>
              <div>Outcome</div>
              <div style={{ textAlign: 'right' }}>Chance</div>
              <div style={{ textAlign: 'right' }}>Buy Yes</div>
              <div style={{ textAlign: 'right' }}>Buy No</div>
            </div>
            {market.outcomes.map((o, i) => (
              <div key={o.id} className="cp-outcomes-row" style={{
                display: 'grid', gridTemplateColumns: '1fr 80px 100px 100px',
                alignItems: 'center', padding: '14px 0',
                borderBottom: i < market.outcomes.length - 1 ? '1px solid var(--cp-line)' : 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 6, height: 32, borderRadius: 3,
                    background: i === 0 ? 'var(--cp-yes)' : i === 1 ? 'var(--cp-sun)' : 'var(--cp-text-3)',
                  }}/>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{o.label}</span>
                </div>
                <div className="cp-num" style={{ textAlign: 'right', fontWeight: 600, fontSize: 15, fontFamily: 'var(--cp-serif)' }}>
                  {Math.round(o.prob * 100)}%
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button onClick={() => router.replace(`?o=${o.id}&side=YES`)} style={{
                    background: 'var(--cp-yes-soft)', color: 'var(--cp-yes-ink)',
                    border: 0, borderRadius: 6, height: 30, padding: '0 12px',
                    fontWeight: 600, fontSize: 12.5, cursor: 'pointer',
                  }} className="cp-num">{o.yes}¢</button>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button onClick={() => router.replace(`?o=${o.id}&side=NO`)} style={{
                    background: 'var(--cp-no-soft)', color: 'var(--cp-no-ink)',
                    border: 0, borderRadius: 6, height: 30, padding: '0 12px',
                    fontWeight: 600, fontSize: 12.5, cursor: 'pointer',
                  }} className="cp-num">{o.no}¢</button>
                </div>
              </div>
            ))}
          </section>

          <section style={{
            background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)',
            boxShadow: 'var(--cp-shadow-card)', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--cp-line)', padding: '0 20px' }}>
              {([
                { id: 'activity', label: 'Activity', count: trades.length },
                { id: 'rules', label: 'Rules & sources' },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setTab(t.id as any)} style={{
                  padding: '14px 14px', border: 0, background: 'transparent', cursor: 'pointer',
                  fontSize: 13.5, fontWeight: 600,
                  color: tab === t.id ? 'var(--cp-text)' : 'var(--cp-text-3)',
                  borderBottom: '2px solid',
                  borderColor: tab === t.id ? 'var(--cp-ink)' : 'transparent',
                  marginBottom: -1, display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  <span>{t.label}</span>
                  {('count' in t) && t.count != null && (
                    <span className="cp-num" style={{
                      fontSize: 11, padding: '1px 6px', borderRadius: 999,
                      background: 'var(--cp-page-2)', color: 'var(--cp-text-2)',
                    }}>{t.count}</span>
                  )}
                </button>
              ))}
            </div>
            <div style={{ padding: 20 }}>
              {tab === 'activity' && <ActivityList trades={trades} options={market.outcomes}/>}
              {tab === 'rules' && <Rules market={market}/>}
            </div>
          </section>

          {Object.keys(positions).length > 0 && (
            <section style={{
              background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)',
              padding: 20, boxShadow: 'var(--cp-shadow-card)',
            }}>
              <h3 style={{ margin: '0 0 14px', fontFamily: 'var(--cp-serif)', fontWeight: 400, fontSize: 20 }}>Your positions</h3>
              {market.outcomes.map(o => {
                const shares = positions[o.id];
                if (!shares || shares <= 0) return null;
                return (
                  <div key={o.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', borderRadius: 8, background: 'var(--cp-card-sub)', marginBottom: 6,
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{o.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--cp-text-3)' }} className="cp-num">{shares.toFixed(2)} shares</div>
                    </div>
                    <div className="cp-num" style={{ fontFamily: 'var(--cp-serif)', fontSize: 20, fontWeight: 600 }}>
                      {Math.round(o.prob * 100)}%
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </div>

        <div className="cp-detail-aside" style={{ position: 'sticky', top: 88, alignSelf: 'start' }}>
          <OrderPanel
            market={market}
            userId={dbUser?.id}
            userBalanceSats={dbUser?.balance_satoshis || 0}
            userPositions={positions}
            defaultOutcomeId={defaultOutcomeId}
            defaultSide={defaultSide}
            onTradeComplete={load}
          />
          <div style={{
            marginTop: 14, padding: '14px 16px', borderRadius: 12,
            background: 'var(--cp-card-sub)', border: '1px dashed var(--cp-line-strong)',
            fontSize: 12, color: 'var(--cp-text-2)', lineHeight: 1.45,
          }}>
            <div style={{ fontWeight: 600, color: 'var(--cp-text)', marginBottom: 4,
                          display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon name="flag" size={13}/> Resolution source
            </div>
            {market.rules.split('. ')[0]}.
          </div>
        </div>
      </div>
    </main>
  );
}

function ActivityList({ trades, options }: { trades: Trade[]; options: { id: string; label: string }[] }) {
  if (trades.length === 0) {
    return <div style={{ padding: '20px 0', color: 'var(--cp-text-3)', fontSize: 13, textAlign: 'center' }}>No trades yet on this market.</div>;
  }
  const labelFor = (id: string) => options.find(o => o.id === id)?.label || '—';
  return (
    <div>
      {trades.map((t, i) => {
        const side: 'YES' | 'NO' = t.is_buy ? 'YES' : 'NO';
        return (
          <div key={t.id} style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr auto auto',
            alignItems: 'center', gap: 12, padding: '10px 0',
            borderBottom: i < trades.length - 1 ? '1px solid var(--cp-line)' : 0,
          }}>
            <Avatar name={t.user_id.slice(0, 1).toUpperCase()} size={26} tone={t.is_buy ? 'yes' : 'no'}/>
            <div style={{ fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{t.user_id.slice(0, 6)}…</span>{' '}
              <span style={{ color: 'var(--cp-text-3)' }}>{t.is_buy ? 'bought' : 'sold'}</span>{' '}
              <span className="cp-num" style={{ fontWeight: 600 }}>{t.shares.toLocaleString('en-US', { maximumFractionDigits: 1 })}</span>{' '}
              <span style={{ color: 'var(--cp-text-3)' }}>· {labelFor(t.option_id)}</span>{' '}
              <span style={{
                padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700, marginLeft: 4,
                background: side === 'YES' ? 'var(--cp-yes-soft)' : 'var(--cp-no-soft)',
                color: side === 'YES' ? 'var(--cp-yes-ink)' : 'var(--cp-no-ink)',
              }}>{side}</span>
            </div>
            <div className="cp-num" style={{ fontSize: 12.5, color: 'var(--cp-text-2)' }}>{fmtSats(t.total_cost)}</div>
            <div style={{ fontSize: 11.5, color: 'var(--cp-text-3)' }}>{new Date(t.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        );
      })}
    </div>
  );
}

function Rules({ market }: { market: CpMarket }) {
  return (
    <div style={{ fontSize: 14, color: 'var(--cp-text-2)', lineHeight: 1.6, maxWidth: 680 }}>
      <p style={{ marginTop: 0 }}>{market.rules}</p>
      <div style={{
        marginTop: 14, padding: '12px 14px', borderRadius: 8,
        background: 'var(--cp-card-sub)', border: '1px solid var(--cp-line)',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <Icon name="flag" size={16} style={{ marginTop: 2, color: 'var(--cp-sun)' }}/>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--cp-text)' }}>Sources</div>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13 }}>
            <li>Official government and electoral office tallies</li>
            <li>CARICOM Secretariat press releases</li>
            <li>Verified news and league reporting</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
