'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { Thumb } from './Primitives';
import Countdown from './Countdown';
import { CpMarket, getCountry, getCategory, fmtCompactUsdt, multiplierFromProb, satsToUsd } from '@/lib/cp-data';

interface MarketCardProps {
  market: CpMarket;
  density?: 'compact' | 'comfortable';
  onOpen?: (m: CpMarket) => void;
  bookmarked?: boolean;
  onBookmark?: (id: string) => void;
}

export default function MarketCard({ market, density = 'comfortable', onOpen, bookmarked, onBookmark }: MarketCardProps) {
  const [hover, setHover] = useState(false);
  const router = useRouter();
  const topOutcomes = market.outcomes.slice(0, 3);
  const hidden = market.outcomes.length - topOutcomes.length;
  const isBinary = market.outcomes.length === 1;

  function handleOpen() {
    if (onOpen) onOpen(market);
    else router.push(`/market/${market.id}`);
  }

  return (
    <article
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={handleOpen}
      style={{
        background: 'var(--cp-card)', borderRadius: 14,
        border: '1px solid', borderColor: hover ? 'var(--cp-line-strong)' : 'var(--cp-line)',
        padding: 14,
        boxShadow: hover ? 'var(--cp-shadow-hov)' : 'var(--cp-shadow-card)',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow .18s ease, transform .18s ease, border-color .18s',
        cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative',
      }}
    >
      <header style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Thumb market={market} size={56}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: 0, fontFamily: 'var(--cp-serif)', fontWeight: 400,
            fontSize: 19, lineHeight: 1.2, color: 'var(--cp-text)',
            letterSpacing: '-0.01em',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{market.question}</h3>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 6,
            fontSize: 11.5, color: 'var(--cp-text-3)', flexWrap: 'wrap',
          }}>
            <span>{market.countries.map(code => getCountry(code)?.flag).join(' ')}</span>
            <span>·</span>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>
              {getCategory(market.category)?.name}
            </span>
          </div>
          <div style={{ marginTop: 8 }}>
            <Countdown closeIso={market.closeDate} size="sm"/>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onBookmark?.(market.id); }} style={{
          background: 'transparent', border: 0, padding: 4, cursor: 'pointer',
          color: bookmarked ? 'var(--cp-sun)' : 'var(--cp-text-3)',
        }}>
          <Icon name={bookmarked ? 'bookmark-fill' : 'bookmark'} size={16}/>
        </button>
      </header>

      <div style={{
        borderTop: '1px solid var(--cp-line)', paddingTop: 6,
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        {isBinary ? (
          <BinaryOutcomeBlock market={market}/>
        ) : (
          topOutcomes.map(o => (
            <div key={o.id} style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto auto',
              alignItems: 'center', gap: 8, padding: '6px 0',
            }}>
              <div style={{
                fontSize: density === 'compact' ? 12.5 : 13.5,
                color: 'var(--cp-text)', fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{o.label}</div>
              <div className="cp-num" style={{
                fontSize: 14, fontWeight: 600, color: 'var(--cp-text)',
                fontFamily: 'var(--cp-serif)', letterSpacing: '-0.01em',
              }}>{Math.round(o.prob * 100)}%</div>
              <button onClick={(e) => { e.stopPropagation(); router.push(`/market/${market.id}?o=${o.id}&side=YES`); }} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                height: 28, padding: '0 10px', borderRadius: 6,
                background: 'var(--cp-yes-soft)', color: 'var(--cp-yes-ink)',
                border: 0, cursor: 'pointer', fontWeight: 600, fontSize: 12.5,
              }}>
                <span>Yes</span>
                <span className="cp-num" style={{ fontWeight: 500, opacity: 0.85 }}>{multiplierFromProb(o.prob)}</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); router.push(`/market/${market.id}?o=${o.id}&side=NO`); }} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                height: 28, padding: '0 10px', borderRadius: 6,
                background: 'var(--cp-no-soft)', color: 'var(--cp-no-ink)',
                border: 0, cursor: 'pointer', fontWeight: 600, fontSize: 12.5,
              }}>
                <span>No</span>
                <span className="cp-num" style={{ fontWeight: 500, opacity: 0.85 }}>{multiplierFromProb(Math.max(0.01, 1 - o.prob))}</span>
              </button>
            </div>
          ))
        )}
        {hidden > 0 && (
          <div style={{ fontSize: 11.5, color: 'var(--cp-text-3)', marginTop: 2 }}>
            +{hidden} more outcomes
          </div>
        )}
      </div>

      <footer style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 'auto', paddingTop: 8, borderTop: '1px dashed var(--cp-line)',
        fontSize: 11.5, color: 'var(--cp-text-3)',
      }}>
        <span className="cp-num">Pool {fmtCompactUsdt(market.volumeUsd)}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="comment" size={12}/>
            <span className="cp-num">{market.commentCount}</span>
          </span>
        </span>
      </footer>
    </article>
  );
}

function BinaryOutcomeBlock({ market }: { market: CpMarket }) {
  const router = useRouter();
  const o = market.outcomes[0];
  const yesPct = Math.round(o.prob * 100);
  const noPct = 100 - yesPct;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="cp-num" style={{
          fontSize: 28, fontFamily: 'var(--cp-serif)', fontWeight: 400,
          color: 'var(--cp-yes-ink)', letterSpacing: '-0.02em',
        }}>{yesPct}%</span>
        <span style={{ fontSize: 12, color: 'var(--cp-text-3)' }}>chance · {o.label}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <button onClick={(e) => { e.stopPropagation(); router.push(`/market/${market.id}?o=${o.id}&side=YES`); }} style={{
          height: 38, borderRadius: 8, background: 'var(--cp-yes-soft)',
          color: 'var(--cp-yes-ink)', border: 0, cursor: 'pointer',
          fontWeight: 600, fontSize: 13,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          Yes <span className="cp-num" style={{ fontWeight: 500 }}>{yesPct}%</span>
          <span className="cp-num" style={{ fontWeight: 400, opacity: 0.7 }}>({multiplierFromProb(o.prob)})</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); router.push(`/market/${market.id}?o=${o.id}&side=NO`); }} style={{
          height: 38, borderRadius: 8, background: 'var(--cp-no-soft)',
          color: 'var(--cp-no-ink)', border: 0, cursor: 'pointer',
          fontWeight: 600, fontSize: 13,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          No <span className="cp-num" style={{ fontWeight: 500 }}>{noPct}%</span>
          <span className="cp-num" style={{ fontWeight: 400, opacity: 0.7 }}>({multiplierFromProb(Math.max(0.01, 1 - o.prob))})</span>
        </button>
      </div>
    </div>
  );
}
