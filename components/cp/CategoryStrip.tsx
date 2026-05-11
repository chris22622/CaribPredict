'use client';

import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';
import { Chip } from './Primitives';
import { CATEGORIES, COUNTRIES, getCountry } from '@/lib/cp-data';

interface CategoryStripProps {
  active: string;
  onChange: (id: string) => void;
  country: string; // 'ALL' or 2-letter code
  onCountry: (code: string) => void;
}

export default function CategoryStrip({ active, onChange, country, onCountry }: CategoryStripProps) {
  return (
    <div style={{ background: 'var(--cp-page)', borderBottom: '1px solid var(--cp-line)' }}>
      <div style={{
        maxWidth: 1400, margin: '0 auto', padding: '12px 28px',
        display: 'flex', alignItems: 'center', gap: 8,
        overflowX: 'auto', whiteSpace: 'nowrap',
      }} className="cp-noscroll">
        {CATEGORIES.map(c => (
          <Chip key={c.id} icon={c.glyph} active={active === c.id} onClick={() => onChange(c.id)}>
            {c.name}
          </Chip>
        ))}
        <div style={{ width: 1, height: 22, background: 'var(--cp-line-strong)', margin: '0 4px', flex: '0 0 auto' }}/>
        <CountryChip country={country} onCountry={onCountry}/>
      </div>
    </div>
  );
}

function CountryChip({ country, onCountry }: { country: string; onCountry: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const all = country === 'ALL' || !country;
  const c = !all ? getCountry(country) : null;
  return (
    <div ref={ref} style={{ position: 'relative', flex: '0 0 auto' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        height: 34, padding: '0 12px', borderRadius: 999,
        background: all ? 'transparent' : 'var(--cp-ink)',
        color: all ? 'var(--cp-text-2)' : 'var(--cp-text-on-ink)',
        border: '1px solid', borderColor: all ? 'var(--cp-line-strong)' : 'transparent',
        fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
      }}>
        <span style={{ fontSize: 14 }}>{all ? '🌎' : c?.flag}</span>
        <span>{all ? 'All CARICOM' : c?.name}</span>
        <Icon name="chevron-d" size={13}/>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          background: 'var(--cp-card)', borderRadius: 10,
          boxShadow: 'var(--cp-shadow-pop)', padding: 6,
          border: '1px solid var(--cp-line)',
          display: 'grid', gridTemplateColumns: 'repeat(2, minmax(180px, 1fr))', gap: 2,
          minWidth: 380, zIndex: 50,
        }}>
          <CountryRow code="ALL" name="All CARICOM" flag="🌎"
                      active={all} onClick={() => { onCountry('ALL'); setOpen(false); }}/>
          {COUNTRIES.map(co => (
            <CountryRow key={co.code} code={co.code} name={co.name} flag={co.flag}
                        active={country === co.code}
                        onClick={() => { onCountry(co.code); setOpen(false); }}/>
          ))}
        </div>
      )}
    </div>
  );
}

function CountryRow({ code, name, flag, active, onClick }: { code: string; name: string; flag: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
      background: active ? 'var(--cp-card-sub)' : 'transparent',
      border: 0, textAlign: 'left', color: 'var(--cp-text)', fontSize: 13,
    }}>
      <span style={{ fontSize: 16, lineHeight: 1 }}>{flag}</span>
      <span style={{ fontWeight: active ? 600 : 500 }}>{name}</span>
      {active && <Icon name="check" size={13} style={{ marginLeft: 'auto', color: 'var(--cp-yes)' }}/>}
    </button>
  );
}
