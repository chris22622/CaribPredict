'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Icon from './Icon';
import { Button } from './Primitives';
import { fmtUsdt } from '@/lib/cp-data';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface Intent {
  address: string;
  contract: string;
  network: string;
  sendExactlyUsdt: number;
  expectedTotalCents: number;
  tag: number;
  intentId: string;
  expiresAt: string;
  instructions: string[];
}

export default function DepositModal({ isOpen, onClose, userId }: DepositModalProps) {
  const [step, setStep] = useState<'amount' | 'send'>('amount');
  const [amount, setAmount] = useState<number>(20);
  const [submitting, setSubmitting] = useState(false);
  const [intent, setIntent] = useState<Intent | null>(null);

  useEffect(() => {
    if (!isOpen) { setStep('amount'); setIntent(null); setAmount(20); }
  }, [isOpen]);

  if (!isOpen) return null;

  async function createIntent() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/deposit/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amountUsdt: amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start deposit');
      setIntent(data);
      setStep('send');
    } catch (e: any) {
      toast.error(e.message || 'Could not start deposit');
    } finally { setSubmitting(false); }
  }

  function copy(value: string, label: string) {
    navigator.clipboard.writeText(value).then(() => toast.success(`${label} copied`));
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(11,31,46,0.55)',
      backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, zIndex: 200,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 460, maxWidth: 'calc(100% - 16px)',
        background: 'var(--cp-card)', borderRadius: 14,
        boxShadow: 'var(--cp-shadow-pop)', overflow: 'hidden',
        border: '1px solid var(--cp-line)',
      }}>
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid var(--cp-line)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', background: 'var(--cp-yes)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 12, fontWeight: 700,
            }}>₮</div>
            <h2 style={{ margin: 0, fontFamily: 'var(--cp-serif)', fontWeight: 400, fontSize: 22 }}>
              Deposit USDT
            </h2>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 0, padding: 6, cursor: 'pointer',
            color: 'var(--cp-text-3)',
          }}><Icon name="close" size={20}/></button>
        </header>

        {step === 'amount' && (
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{
                fontSize: 11.5, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>Amount</label>
              <div style={{
                marginTop: 6, display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--cp-card-sub)', borderRadius: 10,
                border: '1px solid var(--cp-line)', padding: '8px 12px',
              }}>
                <input
                  type="text" inputMode="decimal" value={amount}
                  onChange={e => setAmount(Math.max(0, parseFloat(e.target.value.replace(/[^\d.]/g,'')) || 0))}
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
                {[10, 20, 50, 100, 200].map(v => (
                  <button key={v} onClick={() => setAmount(v)} style={{
                    height: 28, padding: '0 12px', borderRadius: 999,
                    border: '1px solid var(--cp-line-strong)', background: 'var(--cp-card)',
                    color: 'var(--cp-text-2)', fontSize: 12, cursor: 'pointer',
                  }}><span className="cp-num">${v}</span></button>
                ))}
              </div>
            </div>
            <div style={{
              padding: 12, borderRadius: 10,
              background: 'var(--cp-card-sub)', border: '1px solid var(--cp-line)',
              fontSize: 12.5, color: 'var(--cp-text-2)', lineHeight: 1.5,
            }}>
              Minimum deposit <span className="cp-num" style={{ fontWeight: 600 }}>5 USDT</span>.
              We&rsquo;ll show you the exact amount to send including a unique decimal
              tag that identifies your deposit.
            </div>
            <Button kind="sun" size="lg" full onClick={createIntent} disabled={submitting || amount < 5}>
              {submitting ? 'Generating address…' : `Continue · ${fmtUsdt(amount)}`}
            </Button>
          </div>
        )}

        {step === 'send' && intent && (
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              padding: 14, borderRadius: 10,
              background: 'var(--cp-sun-soft)', border: '1px solid var(--cp-line)',
              fontSize: 13, color: 'var(--cp-text)',
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Send exactly this amount</div>
              <div className="cp-num" style={{ fontFamily: 'var(--cp-serif)', fontSize: 30, fontWeight: 400 }}>
                {intent.sendExactlyUsdt.toFixed(4)} USDT
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--cp-text-3)', marginTop: 4 }}>
                The last 4 decimals (<span className="cp-num">{String(intent.tag).padStart(4, '0')}</span>)
                are how we identify your deposit. Send less or more and we can&rsquo;t credit it automatically.
              </div>
            </div>

            <Field label="To address (TRC-20)" value={intent.address}
              onCopy={() => copy(intent.address, 'Address')}/>
            <Field label="Network" value={intent.network}/>
            <Field label="USDT contract" value={intent.contract} small
              onCopy={() => copy(intent.contract, 'Contract')}/>

            <a
              href={`https://tronscan.org/#/address/${intent.address}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                fontSize: 12, color: 'var(--cp-yes-ink)', textDecoration: 'none', fontWeight: 600,
              }}
            >View wallet on TronScan →</a>

            <div style={{
              padding: 12, borderRadius: 10, background: 'var(--cp-card-sub)',
              border: '1px solid var(--cp-line)', fontSize: 12.5, color: 'var(--cp-text-2)', lineHeight: 1.5,
            }}>
              {intent.instructions.map((line, i) => (
                <div key={i} style={{ marginTop: i ? 6 : 0 }}>{line}</div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <Button kind="outline" full onClick={() => setStep('amount')}>Change amount</Button>
              <Button kind="primary" full onClick={onClose}>I&rsquo;ve sent it</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, small, onCopy }: { label: string; value: string; small?: boolean; onCopy?: () => void }) {
  return (
    <div>
      <label style={{
        fontSize: 11.5, color: 'var(--cp-text-3)',
        textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600,
      }}>{label}</label>
      <div style={{
        marginTop: 4, display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--cp-card-sub)', borderRadius: 8,
        border: '1px solid var(--cp-line)', padding: '8px 10px',
      }}>
        <code className="cp-num" style={{
          flex: 1, minWidth: 0, fontSize: small ? 11.5 : 12.5, color: 'var(--cp-text)',
          fontFamily: 'var(--cp-mono)', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{value}</code>
        {onCopy && (
          <button onClick={onCopy} style={{
            background: 'transparent', border: '1px solid var(--cp-line-strong)',
            color: 'var(--cp-text-2)', borderRadius: 6, height: 28, padding: '0 10px',
            fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
          }}>Copy</button>
        )}
      </div>
    </div>
  );
}
