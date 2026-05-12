// Transactional email via Resend (https://resend.com).
//
// Set RESEND_API_KEY + RESEND_FROM_EMAIL in Vercel env vars to enable.
// All sends are logged to email_send_log for audit + idempotency.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const RESEND_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'CaribPredict <noreply@caribpredict.com>';

export type EmailTemplate =
  | 'deposit-credited'
  | 'withdraw-sent'
  | 'big-win'
  | 'welcome-bonus'
  | 'wagering-met';

export interface SendInput {
  userId?: string;
  toEmail: string;
  template: EmailTemplate;
  subject: string;
  html: string;
  text?: string;
  payload?: Record<string, any>;
}

export async function sendEmail(input: SendInput): Promise<{ ok: boolean; resendId?: string; error?: string }> {
  if (!RESEND_KEY) {
    await supabase.from('email_send_log').insert({
      user_id: input.userId || null, to_email: input.toEmail,
      template: input.template, subject: input.subject,
      status: 'queued', payload: input.payload || null,
      error: 'RESEND_API_KEY not configured',
    });
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: input.toEmail,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      await supabase.from('email_send_log').insert({
        user_id: input.userId || null, to_email: input.toEmail,
        template: input.template, subject: input.subject,
        status: 'failed', error: data?.message || `HTTP ${res.status}`,
        payload: input.payload || null,
      });
      return { ok: false, error: data?.message || `HTTP ${res.status}` };
    }
    await supabase.from('email_send_log').insert({
      user_id: input.userId || null, to_email: input.toEmail,
      template: input.template, subject: input.subject,
      resend_id: data?.id, status: 'sent',
      payload: input.payload || null,
      sent_at: new Date().toISOString(),
    });
    return { ok: true, resendId: data?.id };
  } catch (e: any) {
    await supabase.from('email_send_log').insert({
      user_id: input.userId || null, to_email: input.toEmail,
      template: input.template, subject: input.subject,
      status: 'failed', error: e?.message || 'network',
      payload: input.payload || null,
    });
    return { ok: false, error: e?.message || 'network' };
  }
}

// ──────────────────────────────────────────────────────────
// Template builders
// ──────────────────────────────────────────────────────────

function shell(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1ECDE;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#14181F">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#0B1F2E;color:#F1ECDE;padding:20px 24px;border-radius:14px 14px 0 0">
    <div style="font-size:24px;font-family:'Iowan Old Style',Georgia,serif;letter-spacing:-0.01em">CaribPredict</div>
    <div style="font-size:11.5px;opacity:0.7;margin-top:2px">${title}</div>
  </div>
  <div style="background:#fff;padding:22px 24px;border-radius:0 0 14px 14px;font-size:14.5px;line-height:1.55">
    ${body}
  </div>
  <div style="font-size:11px;color:#7B8390;margin-top:14px;text-align:center;line-height:1.5">
    You're receiving this because you have an account at caribpredict.com.<br>
    Manage notifications · <a href="https://www.caribpredict.com/responsible-gambling" style="color:#7B8390">Responsible gambling</a>
  </div>
</div></body></html>`;
}

export function depositCreditedEmail(amountUsdt: number, txHash: string) {
  const body = `
    <p>Your deposit just landed.</p>
    <p style="font-family:Menlo,monospace;font-size:24px;color:#08412F;font-weight:600;margin:14px 0">
      +${amountUsdt.toFixed(2)} USDT
    </p>
    <p style="font-size:12.5px;color:#4A5260">
      Transaction:
      <a href="https://tronscan.org/#/transaction/${txHash}" style="color:#0E7C66">${txHash.slice(0, 12)}…${txHash.slice(-8)}</a>
    </p>
    <p style="margin-top:18px">
      <a href="https://www.caribpredict.com" style="background:#0E7C66;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Place a bet</a>
    </p>`;
  return shell('Deposit credited', body);
}

export function withdrawSentEmail(amountUsdt: number, netUsdt: number, txHash: string, toAddress: string) {
  const body = `
    <p>Your withdrawal has been sent on-chain.</p>
    <table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:13.5px">
      <tr><td style="padding:4px 0;color:#4A5260">Amount requested</td><td style="text-align:right">${amountUsdt.toFixed(2)} USDT</td></tr>
      <tr><td style="padding:4px 0;color:#4A5260">Network fee</td><td style="text-align:right">${(amountUsdt - netUsdt).toFixed(2)} USDT</td></tr>
      <tr><td style="padding:4px 0;color:#4A5260">Sent to your wallet</td><td style="text-align:right;font-weight:600">${netUsdt.toFixed(2)} USDT</td></tr>
      <tr><td style="padding:4px 0;color:#4A5260">To</td><td style="text-align:right;font-family:Menlo,monospace;font-size:11.5px">${toAddress.slice(0,8)}…${toAddress.slice(-6)}</td></tr>
    </table>
    <p style="font-size:12.5px;color:#4A5260">
      Verify on chain:
      <a href="https://tronscan.org/#/transaction/${txHash}" style="color:#0E7C66">${txHash.slice(0, 12)}…${txHash.slice(-8)}</a>
    </p>`;
  return shell('Withdrawal sent', body);
}

export function bigWinEmail(amountUsdt: number, game: string, multiplier?: number) {
  const mult = multiplier ? ` at ${multiplier.toFixed(2)}×` : '';
  const body = `
    <p>You just hit a big win on ${game}${mult}.</p>
    <p style="font-family:Menlo,monospace;font-size:32px;color:#08412F;font-weight:700;margin:14px 0">
      +${amountUsdt.toFixed(2)} USDT
    </p>
    <p style="font-size:13px;color:#4A5260">
      Already credited to your balance. Share with the rebrand: caribpredict.com
    </p>`;
  return shell('Big win', body);
}

export function welcomeBonusEmail(amountUsdt: number) {
  const body = `
    <p>Welcome aboard.</p>
    <p>Your <strong>${amountUsdt.toFixed(2)} USDT</strong> free play has been credited.
    It comes with a 10× wagering requirement before withdrawal. Winnings from bonus play are real.</p>
    <p style="margin-top:18px">
      <a href="https://www.caribpredict.com/crash" style="background:#E8A53C;color:#14181F;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700">Try CaribCrash</a>
    </p>`;
  return shell('Welcome bonus credited', body);
}
