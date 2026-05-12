'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useCp } from '@/app/layout-client';
import { Button } from '@/components/cp/Primitives';
import { fmtUsdt } from '@/lib/cp-data';

export default function ResponsibleGamblingPage() {
  const { user } = useCp();
  const [exclusion, setExclusion] = useState<any>(null);
  const [limits, setLimits] = useState<any>(null);
  const [excludeDays, setExcludeDays] = useState<number>(7);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [draftLimits, setDraftLimits] = useState({
    dailyDepositUsdt: '',
    weeklyDepositUsdt: '',
    monthlyDepositUsdt: '',
    dailyWagerUsdt: '',
    dailyLossUsdt: '',
  });

  useEffect(() => {
    if (!user) return;
    fetch(`/api/responsible/self-exclude?userId=${user.id}`).then(r => r.json()).then(setExclusion);
    fetch(`/api/responsible/limits?userId=${user.id}`).then(r => r.json()).then(d => {
      setLimits(d.limits);
      setDraftLimits({
        dailyDepositUsdt: d.limits?.dailyDepositUsdt?.toString() || '',
        weeklyDepositUsdt: d.limits?.weeklyDepositUsdt?.toString() || '',
        monthlyDepositUsdt: d.limits?.monthlyDepositUsdt?.toString() || '',
        dailyWagerUsdt: d.limits?.dailyWagerUsdt?.toString() || '',
        dailyLossUsdt: d.limits?.dailyLossUsdt?.toString() || '',
      });
    });
  }, [user]);

  async function applySelfExclusion() {
    if (!user) { toast.error('Sign in first'); return; }
    if (!confirm(
      excludeDays === -1
        ? 'Permanently self-exclude? You will be unable to bet on this platform. Reinstatement requires support and a 6-month minimum cooling period.'
        : `Self-exclude for ${excludeDays} day${excludeDays === 1 ? '' : 's'}? You will be unable to bet during this period.`
    )) return;
    setBusy(true);
    try {
      const r = await fetch('/api/responsible/self-exclude', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, durationDays: excludeDays, reason }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      toast.success(d.message || 'Self-exclusion applied');
      setExclusion({ active: true, ...d });
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally { setBusy(false); }
  }

  async function saveLimits() {
    if (!user) { toast.error('Sign in first'); return; }
    setBusy(true);
    try {
      const payload: any = { userId: user.id };
      for (const k of Object.keys(draftLimits) as Array<keyof typeof draftLimits>) {
        const v = parseFloat(draftLimits[k]);
        payload[k] = isFinite(v) && v > 0 ? v : null;
      }
      const r = await fetch('/api/responsible/limits', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      toast.success('Limits updated');
      setLimits(payload);
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally { setBusy(false); }
  }

  return (
    <main className="cp-page-pad" style={{ maxWidth: 800, margin: '0 auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <header>
        <h1 style={{ margin: 0, fontFamily: 'var(--cp-serif)', fontWeight: 400, fontSize: 36, letterSpacing: '-0.015em' }}>
          Responsible gambling
        </h1>
        <p style={{ margin: '8px 0 0', color: 'var(--cp-text-2)', fontSize: 14.5, lineHeight: 1.6 }}>
          CaribPredict is real-money betting. If gambling is starting to feel like a problem rather than entertainment,
          these tools are here so you can step back without anyone&rsquo;s permission.
        </p>
      </header>

      <Section title="Set your limits"
        body="Pre-commit to a cap on how much you can deposit, wager, or lose in a window. We&rsquo;ll block bets and deposits over the cap until the window rolls over. Leave any field blank to remove that cap.">
        {!user && <SignInNote/>}
        {user && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }} className="cp-portfolio-grid">
            <LimitField label="Daily deposit cap (USDT)" value={draftLimits.dailyDepositUsdt}
              onChange={v => setDraftLimits(s => ({ ...s, dailyDepositUsdt: v }))}/>
            <LimitField label="Weekly deposit cap" value={draftLimits.weeklyDepositUsdt}
              onChange={v => setDraftLimits(s => ({ ...s, weeklyDepositUsdt: v }))}/>
            <LimitField label="Monthly deposit cap" value={draftLimits.monthlyDepositUsdt}
              onChange={v => setDraftLimits(s => ({ ...s, monthlyDepositUsdt: v }))}/>
            <LimitField label="Daily wager cap" value={draftLimits.dailyWagerUsdt}
              onChange={v => setDraftLimits(s => ({ ...s, dailyWagerUsdt: v }))}/>
            <LimitField label="Daily loss cap" value={draftLimits.dailyLossUsdt}
              onChange={v => setDraftLimits(s => ({ ...s, dailyLossUsdt: v }))}/>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button kind="sun" size="md" onClick={saveLimits} disabled={busy}>Save limits</Button>
            </div>
          </div>
        )}
      </Section>

      <Section title="Self-exclude"
        body="Block your account from betting. Limits can be tightened during a window, but once a self-exclusion is set it can&rsquo;t be ended early by you — only by support after a cooling period.">
        {!user && <SignInNote/>}
        {user && exclusion?.active && (
          <div style={{
            padding: 14, borderRadius: 10,
            background: 'var(--cp-no-soft)', color: 'var(--cp-no-ink)',
            fontSize: 13.5, lineHeight: 1.5,
          }}>
            <strong>Self-exclusion is active.</strong>{' '}
            {exclusion.isPermanent ? 'Permanently. ' : `Ends ${new Date(exclusion.endsAt).toLocaleString()}. `}
            Contact support@caribpredict.com to discuss reinstatement.
          </div>
        )}
        {user && !exclusion?.active && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[1, 7, 30, 90, 180, 365, -1].map(d => (
                <button key={d} onClick={() => setExcludeDays(d)} style={{
                  height: 32, padding: '0 14px', borderRadius: 999,
                  border: '1px solid', borderColor: excludeDays === d ? 'transparent' : 'var(--cp-line-strong)',
                  background: excludeDays === d ? 'var(--cp-no)' : 'var(--cp-card)',
                  color: excludeDays === d ? '#fff' : 'var(--cp-text-2)',
                  fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                }}>{d === -1 ? 'Permanent' : d === 1 ? '24 hrs' : `${d} days`}</button>
              ))}
            </div>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Reason (optional, kept private)" rows={2}
              style={{
                width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--cp-line)',
                background: 'var(--cp-card-sub)', fontFamily: 'inherit', fontSize: 13, outline: 'none', resize: 'vertical',
              }}/>
            <Button kind="no" size="md" onClick={applySelfExclusion} disabled={busy}>
              Self-exclude {excludeDays === -1 ? 'permanently' : `for ${excludeDays === 1 ? '24 hrs' : `${excludeDays} days`}`}
            </Button>
          </div>
        )}
      </Section>

      <Section title="If you need help"
        body="Problem gambling is a real medical condition with effective treatments. Resources, free and confidential:">
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: 'var(--cp-text-2)', lineHeight: 1.7 }}>
          <li><strong>Jamaica:</strong> Mental Health Crisis Line +1 (876) 945-7274</li>
          <li><strong>Trinidad & Tobago:</strong> Lifeline 1 (868) 645-2800</li>
          <li><strong>Barbados:</strong> Samaritans (246) 429-9999</li>
          <li><strong>International:</strong> Gamblers Anonymous gamblersanonymous.org</li>
          <li><strong>BeGambleAware:</strong> begambleaware.org (free, multilingual)</li>
        </ul>
      </Section>

      <Section title="Warning signs"
        body="If two or more of these are true, please consider talking to someone:">
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: 'var(--cp-text-2)', lineHeight: 1.7 }}>
          <li>Betting more than you set out to spend</li>
          <li>Chasing losses by increasing stake size</li>
          <li>Hiding bets or balances from family</li>
          <li>Betting with money meant for rent, food, or bills</li>
          <li>Feeling restless or irritable when not betting</li>
          <li>Borrowing money to keep betting</li>
        </ul>
      </Section>

      <div style={{
        padding: 14, borderRadius: 12, background: 'var(--cp-card-sub)',
        border: '1px solid var(--cp-line)', fontSize: 12, color: 'var(--cp-text-3)', lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--cp-text-2)' }}>Eligibility:</strong> You must be 18 or older (or the legal gambling age in your jurisdiction, whichever is higher) to bet on CaribPredict.
        Where local law prohibits online gambling, this platform is not available to you regardless of these settings.
      </div>
    </main>
  );
}

function Section({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: 'var(--cp-card)', borderRadius: 14, border: '1px solid var(--cp-line)',
      padding: 22, display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: 'var(--cp-serif)', fontWeight: 400, fontSize: 22 }}>{title}</h2>
        <p style={{ margin: '6px 0 0', color: 'var(--cp-text-2)', fontSize: 13.5, lineHeight: 1.6 }}>{body}</p>
      </div>
      {children}
    </section>
  );
}

function LimitField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ fontSize: 11.5, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <input
        type="text" inputMode="decimal" value={value} placeholder="No cap"
        onChange={e => onChange(e.target.value.replace(/[^\d.]/g, ''))}
        className="cp-num"
        style={{
          marginTop: 4, width: '100%', height: 38, padding: '0 12px', borderRadius: 8,
          border: '1px solid var(--cp-line)', background: 'var(--cp-card-sub)', fontSize: 16, fontWeight: 600,
          outline: 'none', color: 'var(--cp-text)',
        }}
      />
    </div>
  );
}

function SignInNote() {
  return (
    <div style={{
      padding: 14, borderRadius: 10, background: 'var(--cp-card-sub)',
      fontSize: 13, color: 'var(--cp-text-3)',
    }}>Sign in to set personal limits or self-exclude.</div>
  );
}
