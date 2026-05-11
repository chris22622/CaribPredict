'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { Chip, FlagChip, Thumb } from './Primitives';
import { CpMarket, COUNTRIES, CATEGORIES, getCategory, getCountry } from '@/lib/cp-data';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  markets: CpMarket[];
}

export default function SearchModal({ open, onClose, markets }: SearchModalProps) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 0); }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && open) onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return markets.slice(0, 6);
    return markets.filter(m =>
      m.question.toLowerCase().includes(term) ||
      getCategory(m.category)?.name.toLowerCase().includes(term) ||
      m.countries.some(c => getCountry(c)?.name.toLowerCase().includes(term))
    );
  }, [q, markets]);

  const places = COUNTRIES.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8);

  if (!open) return null;

  function handleOpen(m: CpMarket) {
    router.push(`/market/${m.id}`);
    onClose();
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(11,31,46,0.55)',
      backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: 96, zIndex: 200,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 680, maxWidth: 'calc(100% - 32px)',
        background: 'var(--cp-card)', borderRadius: 14,
        boxShadow: 'var(--cp-shadow-pop)', overflow: 'hidden',
        border: '1px solid var(--cp-line)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderBottom: '1px solid var(--cp-line)',
        }}>
          <Icon name="search" size={18} color="var(--cp-text-3)"/>
          <input
            ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search markets, places, traders"
            style={{
              flex: 1, height: 32, border: 0, outline: 'none', background: 'transparent',
              fontSize: 16, fontFamily: 'inherit', color: 'var(--cp-text)',
            }}
          />
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 6px', borderRadius: 4,
            background: 'var(--cp-card-sub)', border: '1px solid var(--cp-line)',
            fontSize: 11, fontFamily: 'var(--cp-mono)', color: 'var(--cp-text-3)',
          }}>esc</span>
        </div>

        <div style={{ maxHeight: 460, overflowY: 'auto', padding: 6 }}>
          <Group title="Markets">
            {filtered.length === 0 && (
              <div style={{ padding: '10px 12px', color: 'var(--cp-text-3)', fontSize: 13 }}>
                No markets match &ldquo;{q}&rdquo;
              </div>
            )}
            {filtered.map(m => (
              <button key={m.id} onClick={() => handleOpen(m)} style={{
                display: 'grid', gridTemplateColumns: 'auto 1fr auto',
                gap: 12, padding: '8px 10px', borderRadius: 8, border: 0,
                background: 'transparent', cursor: 'pointer', width: '100%',
                alignItems: 'center', textAlign: 'left',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--cp-card-sub)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <Thumb market={m} size={32} radius={6}/>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--cp-serif)', fontSize: 15, color: 'var(--cp-text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{m.question}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--cp-text-3)', marginTop: 1 }}>
                    {m.countries.map(c => getCountry(c)?.flag).join(' ')} · {getCategory(m.category)?.name}
                  </div>
                </div>
                <div className="cp-num" style={{ fontWeight: 600, fontSize: 14, minWidth: 36, textAlign: 'right' }}>
                  {Math.round((m.outcomes[0]?.prob || 0) * 100)}%
                </div>
              </button>
            ))}
          </Group>

          {!q && (
            <Group title="Places">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 10px 8px' }}>
                {places.map(c => (<FlagChip key={c.code} code={c.code} name/>))}
              </div>
            </Group>
          )}

          <Group title="Categories">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 10px 8px' }}>
              {CATEGORIES.map(c => (<Chip key={c.id} icon={c.glyph} size="sm">{c.name}</Chip>))}
            </div>
          </Group>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', borderTop: '1px solid var(--cp-line)',
          background: 'var(--cp-card-sub)', fontSize: 11.5, color: 'var(--cp-text-3)',
        }}>
          <span>Powered by CaribPredict search</span>
          <span className="cp-num">{markets.length} markets indexed</span>
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '6px 0' }}>
      <div style={{
        padding: '6px 12px 4px', fontSize: 10.5, color: 'var(--cp-text-3)',
        textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
      }}>{title}</div>
      {children}
    </div>
  );
}
