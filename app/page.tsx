'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Market, MarketOption } from '@/lib/types';
import {
  toCpMarket, CpMarket, categoryIdFromDb, getCountry,
  fmtCompactUsd, COUNTRIES,
} from '@/lib/cp-data';
import MarketCard from '@/components/cp/MarketCard';
import CategoryStrip from '@/components/cp/CategoryStrip';
import { Button, Chip } from '@/components/cp/Primitives';
import { SunDot } from '@/components/cp/Icon';
import Icon from '@/components/cp/Icon';

export default function HomePage() {
  const [markets, setMarkets] = useState<CpMarket[]>([]);
  const [category, setCategory] = useState<string>('trending');
  const [country, setCountry] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());

  useEffect(() => { loadMarkets(); }, []);

  async function loadMarkets() {
    setLoading(true); setError('');
    try {
      // Use /api/markets (service-role) for the markets list so the home page
      // always works even if anon RLS denies SELECT on the markets table.
      const res = await fetch('/api/markets?resolved=false');
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Markets API returned ${res.status}`);
      }
      const json = await res.json();
      const ms: Market[] = json.markets || [];
      if (ms.length === 0) { setMarkets([]); return; }
      const ids = ms.map(m => m.id);
      // Options table is anon-readable in the existing schema; keep the
      // direct supabase call but log if it fails.
      const { data: os, error: oErr } = await supabase
        .from('market_options').select('*').in('market_id', ids);
      if (oErr) {
        // eslint-disable-next-line no-console
        console.warn('[CaribPredict] options query failed:', oErr.message);
      }
      const byMarket: Record<string, MarketOption[]> = {};
      (os || []).forEach((o: MarketOption) => { (byMarket[o.market_id] ||= []).push(o); });
      const cps = ms.map(m => toCpMarket(m, byMarket[m.id] || []));
      setMarkets(cps);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('[CaribPredict] loadMarkets failed:', e);
      setError(e.message || 'Failed to load markets');
    } finally { setLoading(false); }
  }

  const filtered = useMemo(() => {
    let list = markets.slice();
    if (category === 'new') {
      list = list.slice().reverse();
    } else if (category !== 'trending') {
      list = list.filter(m => m.category === category);
    }
    if (country !== 'ALL') {
      const c = getCountry(country);
      if (c) list = list.filter(m => m.countryDb === c.dbName);
    }
    return list;
  }, [markets, category, country]);

  function toggleBookmark(id: string) {
    setBookmarks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const byCountryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    markets.forEach(m => { counts[m.countryDb] = (counts[m.countryDb] || 0) + 1; });
    return COUNTRIES.map(c => ({ ...c, count: counts[c.dbName] || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [markets]);

  return (
    <>
      <CategoryStrip active={category} onChange={setCategory} country={country} onCountry={setCountry}/>

      <main className="cp-page-pad" style={{ maxWidth: 1400, margin: '0 auto', padding: '28px', width: '100%' }}>
        <Hero/>

        <section style={{ marginTop: 28 }}>
          <SectionHead title="Trending across the region"
                       subtitle={`${filtered.length} markets · live`}
                       trailing={
                         <div style={{ display: 'flex', gap: 6 }}>
                           <Chip size="sm">24h volume</Chip>
                           <Chip size="sm" active>Heat</Chip>
                           <Chip size="sm">Closing soon</Chip>
                         </div>
                       }/>

          {loading && (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--cp-text-3)' }}>
              <div style={{
                width: 32, height: 32, margin: '0 auto 12px',
                borderRadius: '50%', border: '3px solid var(--cp-line)',
                borderTopColor: 'var(--cp-ink)', animation: 'spin 1s linear infinite',
              }}/>
              Loading markets…
            </div>
          )}

          {error && (
            <div style={{
              padding: '14px 16px', background: 'var(--cp-no-soft)', color: 'var(--cp-no-ink)',
              borderRadius: 10, marginTop: 12, fontSize: 13,
            }}>{error}</div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div style={{
              padding: '60px 20px', background: 'var(--cp-card)', borderRadius: 14,
              border: '1px solid var(--cp-line)', textAlign: 'center', marginTop: 16,
            }}>
              <SunDot size={32}/>
              <h3 style={{ margin: '12px 0 4px', fontFamily: 'var(--cp-serif)', fontSize: 22, fontWeight: 400 }}>No markets here yet</h3>
              <p style={{ margin: 0, color: 'var(--cp-text-3)', fontSize: 13.5 }}>
                Try a different category or country.
              </p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="cp-grid-3" style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16, marginTop: 16,
            }}>
              {filtered.map(m => (
                <MarketCard key={m.id} market={m}
                            bookmarked={bookmarks.has(m.id)}
                            onBookmark={toggleBookmark}/>
              ))}
            </div>
          )}
        </section>

        {byCountryStats.length > 0 && (
          <section style={{ marginTop: 36 }}>
            <SectionHead title="By country" subtitle="Most active markets per CARICOM state"/>
            <div className="cp-grid-4" style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 14,
            }}>
              {byCountryStats.map(s => (
                <button key={s.code}
                  onClick={() => setCountry(s.code)}
                  style={{
                    background: 'var(--cp-card)', borderRadius: 12,
                    border: '1px solid var(--cp-line)', padding: 14,
                    display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                  <div style={{ fontSize: 30, lineHeight: 1 }}>{s.flag}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {s.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                      <span className="cp-num" style={{ fontFamily: 'var(--cp-serif)', fontSize: 22 }}>{s.count}</span>
                      <span style={{ fontSize: 12, color: 'var(--cp-text-3)' }}>markets</span>
                    </div>
                  </div>
                  <span style={{
                    width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--cp-line-strong)',
                    color: 'var(--cp-text-2)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}><Icon name="chevron-r" size={14}/></span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

function Hero() {
  return (
    <div className="cp-hero" style={{
      background: 'var(--cp-ink)', color: 'var(--cp-text-on-ink)',
      borderRadius: 16, padding: 28,
      display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 28, alignItems: 'center',
      overflow: 'hidden', position: 'relative',
    }}>
      <div style={{ position: 'absolute', right: -40, top: -40, opacity: 0.18 }}>
        <SunDot size={220} color="var(--cp-sun)"/>
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: 11, color: 'var(--cp-text-on-ink-3)', textTransform: 'uppercase',
          letterSpacing: '0.12em', fontWeight: 600,
        }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: 'var(--cp-yes)', marginRight: 8, verticalAlign: 'middle' }}/>
          Markets, made for the Caribbean
        </div>
        <h1 className="cp-hero-h1" style={{
          margin: '12px 0 8px', fontFamily: 'var(--cp-serif)', fontWeight: 400,
          fontSize: 46, lineHeight: 1.04, letterSpacing: '-0.02em',
          color: 'var(--cp-text-on-ink)',
        }}>
          Trade on what happens<br/>
          <em style={{ color: 'var(--cp-sun)' }}>between the islands.</em>
        </h1>
        <p style={{ margin: '0 0 18px', color: 'var(--cp-text-on-ink-2)', maxWidth: 480, fontSize: 14.5, lineHeight: 1.55 }}>
          Elections, hurricane seasons, Carnival bands, Test series. Live odds priced in sats and dollars, settled the moment reality does.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button kind="sun" size="lg">Explore markets</Button>
          <Button kind="outline_dark" size="lg" icon="plus">Create a market</Button>
        </div>
      </div>
      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid var(--cp-ink-line)',
        borderRadius: 12, padding: 18,
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14,
      }}>
        <Stat label="Open markets" value="Live" delta="updates daily"/>
        <Stat label="24h volume" value={fmtCompactUsd(0)} delta="loading"/>
        <Stat label="CARICOM nations" value="15" delta="all covered"/>
        <Stat label="Settled in" value="sats" delta="Bitcoin native"/>
      </div>
    </div>
  );
}

function Stat({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div>
      <div style={{
        fontSize: 10.5, color: 'var(--cp-text-on-ink-3)',
        textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
      }}>{label}</div>
      <div className="cp-num" style={{
        fontFamily: 'var(--cp-serif)', fontSize: 28, marginTop: 4,
        color: 'var(--cp-text-on-ink)', letterSpacing: '-0.01em',
      }}>{value}</div>
      <div style={{ fontSize: 11.5, color: 'var(--cp-text-on-ink-2)', marginTop: 2 }} className="cp-num">{delta}</div>
    </div>
  );
}

function SectionHead({ title, subtitle, trailing }: { title: string; subtitle?: string; trailing?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <h2 style={{
          margin: 0, fontFamily: 'var(--cp-serif)', fontWeight: 400,
          fontSize: 26, color: 'var(--cp-text)', letterSpacing: '-0.01em',
        }}>{title}</h2>
        {subtitle && (
          <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--cp-text-3)' }}>{subtitle}</div>
        )}
      </div>
      {trailing}
    </div>
  );
}
