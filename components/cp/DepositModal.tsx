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

type Mode = 'crypto' | 'card';
type Step = 'amount' | 'crypto-send' | 'card-launch';

const TRANSAK_API_KEY = process.env.NEXT_PUBLIC_TRANSAK_API_KEY || '';
const TRANSAK_HOST = process.env.NEXT_PUBLIC_TRANSAK_ENV === 'production'
  ? 'https://global.transak.com'
  : 'https://global-stg.transak.com';

export default function DepositModal({ isOpen, onClose, userId }: DepositModalProps) {
  const [mode, setMode] = useState<Mode>('crypto');
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState<number>(20);
  const [submitting, setSubmitting] = useState(false);
  const [intent, setIntent] = useState<Intent | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setMode('crypto');
      setStep('amount');
      setIntent(null);
      setAmount(20);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function buildTransakUrl(i: Intent): string {
    const params = new URLSearchParams({
      apiKey: TRANSAK_API_KEY,
      cryptoCurrencyCode: 'USDT',
      network: 'tron',
      walletAddress: i.address,
      cryptoAmount: i.sendExactlyUsdt.toFixed(4),
      disableWalletAddressForm: 'true',
      fiatCurrency: 'USD',
      themeColor: '0B1F2E',
      redirectURL: typeof window !== 'undefined' ? window.location.origin + '/profile?deposit=processing' : '',
    });
    return `${TRANSAK_HOST}/?${params.toString()}`;
  }

  async function generateIntent(): Promise<Intent | null> {
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
      return data as Intent;
    } catch (e: any) {
      toast.error(e.message || 'Could not start deposit');
      return null;
    } finally { setSubmitting(false); }
  }

  async function continueCrypto() {
    const i = await generateIntent();
    if (i) setStep('crypto-send');
  }

  async function continueCard() {
    if (!TRANSAK_API_KEY) {
      toast.error('Card deposits are being configured. Use the Crypto wallet tab for now.');
      return;
    }
    const i = await generateIntent();
    if (!i) return;
    setStep('card-launch');
    const url = buildTransakUrl(i);
    // Open Transak in a new tab. The user completes KYC + card payment;
    // the USDT lands at our master wallet with the tagged amount; our
    // poll-deposits cron credits the balance.
    window.open(url, '_blank', 'noopener,noreferrer,width=500,height=720');
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
        width: 480, maxWidth: 'calc(100% - 16px)',
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
            {/* Tabs */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              background: 'var(--cp-page-2)', borderRadius: 8, padding: 3,
            }}>
              {(['crypto', 'card'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  height: 36, borderRadius: 6, border: 0, cursor: 'pointer',
                  background: mode === m ? 'var(--cp-card)' : 'transparent',
                  color: mode === m ? 'var(--cp-text)' : 'var(--cp-text-3)',
                  fontWeight: 600, fontSize: 13,
                  boxShadow: mode === m ? '0 1px 2px rgba(20,24,31,.08)' : 'none',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  {m === 'crypto' ? <><Icon name="wallet" size={13}/>Crypto wallet</> : <><Icon name="plus" size={13}/>Buy with card</>}
                </button>
              ))}
            </div>

            <div>
              <label style={{ fontSize: 11.5, color: 'var(--cp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</label>
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

            {mode === 'crypto' && (
              <div style={{
                padding: 12, borderRadius: 10,
                background: 'var(--cp-card-sub)', border: '1px solid var(--cp-line)',
                fontSize: 12.5, color: 'var(--cp-text-2)', lineHeight: 1.5,
              }}>
                Send USDT TRC-20 from any wallet (TronLink, Trust, Binance, Bybit).
                Minimum <strong className="cp-num">5 USDT</strong>. Confirmation usually within 60s.
              </div>
            )}
            {mode === 'card' && (
              <div style={{
                padding: 12, borderRadius: 10,
                background: 'var(--cp-sun-soft)', border: '1px solid var(--cp-sun)',
                fontSize: 12.5, color: 'var(--cp-text-2)', lineHeight: 1.5,
              }}>
                Pay with Visa, Mastercard, Apple Pay, or Google Pay via Transak.
                KYC handled by them. USDT lands in your CaribPredict balance in
                5–15 minutes after card approval. Min <strong className="cp-num">15 USDT</strong>.
                {!TRANSAK_API_KEY && (
                  <div style={{ marginTop: 8, color: 'var(--cp-no-ink)', fontWeight: 600 }}>
                    Card flow is being configured. Use the Crypto wallet tab for now.
                  </div>
                )}
              </div>
            )}

            <Button
              kind="sun" size="lg" full
              onClick={mode === 'crypto' ? continueCrypto : continueCard}
              disabled={submitting || amount < (mode === 'card' ? 15 : 5)}
            >
              {submitting
                ? 'Generating…'
                : mode === 'crypto'
                ? `Continue · ${fmtUsdt(amount)} via wallet`
                : `Continue · ${fmtUsdt(amount)} with card`}
            </Button>
          </div>
        )}

        {step === 'crypto-send' && intent && (
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
              style={{ fontSize: 12, color: 'var(--cp-yes-ink)', textDecoration: 'none', fontWeight: 600 }}
            >View wallet on TronScan →</a>

            <div style={{ display: 'flex', gap: 8 }}>
              <Button kind="outline" full onClick={() => setStep('amount')}>Change amount</Button>
              <Button kind="primary" full onClick={onClose}>I&rsquo;ve sent it</Button>
            </div>
          </div>
        )}

        {step === 'card-launch' && intent && (
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              padding: 14, borderRadius: 10,
              background: 'var(--cp-sun-soft)', border: '1px solid var(--cp-sun)',
              fontSize: 13, color: 'var(--cp-text)',
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Complete your card payment in the popup</div>
              <div className="cp-num" style={{ fontFamily: 'var(--cp-serif)', fontSize: 28, fontWeight: 400 }}>
                {intent.sendExactlyUsdt.toFixed(4)} USDT
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--cp-text-3)', marginTop: 4 }}>
                Transak opened in a new tab. Don&rsquo;t close it until you finish.
                Once your card clears, your balance updates within a few minutes.
              </div>
            </div>

            <button
              onClick={() => window.open(buildTransakUrl(intent), '_blank', 'noopener,noreferrer,width=500,height=720')}
              style={{
                height: 44, borderRadius: 10, border: 0, cursor: 'pointer',
                background: 'var(--cp-ink)', color: 'var(--cp-text-on-ink)',
                fontWeight: 700, fontSize: 14,
              }}
            >Reopen card window</button>

            <div style={{
              padding: 10, borderRadius: 10, background: 'var(--cp-card-sub)',
              fontSize: 11.5, color: 'var(--cp-text-3)', lineHeight: 1.55,
            }}>
              We never see your card. Transak handles KYC and the card processor.
              The USDT they purchase is sent directly to our deposit address with
              your unique tag (<span className="cp-num">{String(intent.tag).padStart(4, '0')}</span>)
              so we know to credit you.
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <Button kind="outline" full onClick={() => setStep('amount')}>Change amount</Button>
              <Button kind="primary" full onClick={onClose}>Close</Button>
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
