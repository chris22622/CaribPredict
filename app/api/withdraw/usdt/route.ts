// Phase 2 USDT withdrawal endpoint. The legacy /api/withdraw (BTCPay/sats)
// stays in place untouched; new flow is here at /api/withdraw/usdt.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendUsdtFromHotWallet, isValidTronAddress, TronEnv } from '@/lib/tron';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const MIN_WITHDRAW_CENTS = 500;            // 5 USDT
const MAX_DAILY_WITHDRAW_CENTS = 50_000_00; // 500 USDT/day per user
const WITHDRAW_FEE_CENTS = 100;            // 1 USDT gas-equivalent fee

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, toAddress, amountUsdt } = body as {
      userId?: string; toAddress?: string; amountUsdt?: number;
    };

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    if (!toAddress || !isValidTronAddress(toAddress)) {
      return NextResponse.json({ error: 'Invalid TRC-20 address' }, { status: 400 });
    }
    if (typeof amountUsdt !== 'number' || !isFinite(amountUsdt)) {
      return NextResponse.json({ error: 'amountUsdt must be a number' }, { status: 400 });
    }
    const amountCents = Math.round(amountUsdt * 100);
    if (amountCents < MIN_WITHDRAW_CENTS) {
      return NextResponse.json({ error: 'Minimum withdrawal is 5 USDT' }, { status: 400 });
    }
    if (!TronEnv.hotWalletAddress || !TronEnv.hasPrivateKey) {
      return NextResponse.json(
        { error: 'Withdrawals are temporarily disabled. The platform hot wallet is being finalized.' },
        { status: 503 },
      );
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, balance_cents, wagering_required_cents, wagering_completed_cents')
      .eq('id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const required = user.wagering_required_cents || 0;
    const completed = user.wagering_completed_cents || 0;
    if (required > 0 && completed < required) {
      return NextResponse.json({
        error: 'Wagering requirement not met',
        wageringRequired: required / 100,
        wageringCompleted: completed / 100,
        wageringRemaining: (required - completed) / 100,
      }, { status: 403 });
    }

    if (amountCents > (user.balance_cents || 0)) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('withdrawals')
      .select('amount_cents, status')
      .eq('user_id', userId)
      .gte('created_at', since)
      .in('status', ['queued', 'sending', 'sent', 'confirmed']);
    const usedToday = (recent || []).reduce((acc, r: any) => acc + r.amount_cents, 0);
    if (usedToday + amountCents > MAX_DAILY_WITHDRAW_CENTS) {
      return NextResponse.json({
        error: 'Daily withdrawal limit exceeded',
        dailyLimitUsdt: MAX_DAILY_WITHDRAW_CENTS / 100,
        usedTodayUsdt: usedToday / 100,
      }, { status: 429 });
    }

    // Debit first, refund on send failure
    const debitedBalance = (user.balance_cents || 0) - amountCents;
    const { error: debitErr } = await supabase
      .from('users').update({ balance_cents: debitedBalance }).eq('id', userId);
    if (debitErr) return NextResponse.json({ error: 'Failed to debit balance' }, { status: 500 });

    const netCents = amountCents - WITHDRAW_FEE_CENTS;
    if (netCents <= 0) {
      await supabase.from('users').update({ balance_cents: user.balance_cents }).eq('id', userId);
      return NextResponse.json({ error: 'Amount must exceed network fee' }, { status: 400 });
    }

    const { data: wrow, error: wErr } = await supabase
      .from('withdrawals')
      .insert({
        user_id: userId,
        to_address: toAddress,
        amount_cents: amountCents,
        fee_cents: WITHDRAW_FEE_CENTS,
        net_cents: netCents,
        status: 'sending',
        sent_at: new Date().toISOString(),
      })
      .select().single();
    if (wErr || !wrow) {
      await supabase.from('users').update({ balance_cents: user.balance_cents }).eq('id', userId);
      return NextResponse.json({ error: 'Failed to create withdrawal record' }, { status: 500 });
    }

    let txHash: string;
    try {
      txHash = await sendUsdtFromHotWallet(toAddress, netCents);
    } catch (sendErr: any) {
      await supabase.from('withdrawals').update({
        status: 'failed',
        error_message: sendErr.message || 'send failed',
        completed_at: new Date().toISOString(),
      }).eq('id', wrow.id);
      const { data: u2 } = await supabase
        .from('users').select('balance_cents').eq('id', userId).single();
      if (u2) {
        await supabase.from('users')
          .update({ balance_cents: (u2.balance_cents || 0) + amountCents })
          .eq('id', userId);
      }
      return NextResponse.json({ error: sendErr.message || 'Transaction failed' }, { status: 502 });
    }

    await supabase.from('withdrawals').update({
      status: 'sent',
      tx_hash: txHash,
      sent_at: new Date().toISOString(),
    }).eq('id', wrow.id);

    return NextResponse.json({
      ok: true,
      withdrawalId: wrow.id,
      txHash,
      netSentUsdt: netCents / 100,
      feeUsdt: WITHDRAW_FEE_CENTS / 100,
      explorerUrl: `https://tronscan.org/#/transaction/${txHash}`,
    });
  } catch (e: any) {
    console.error('[CaribPredict] /api/withdraw/usdt error', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
