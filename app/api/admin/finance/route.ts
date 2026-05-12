// Admin-only finance dashboard data: house fee totals, hot wallet balance,
// pending withdrawals, recent settled markets, total volume.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TronEnv } from '@/lib/tron';

const ADMIN_EMAILS = ['chrissanoleslie1990@gmail.com'];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function isAdmin(req: NextRequest): Promise<boolean> {
  const cookieHeader = req.headers.get('cookie') || '';
  const accessToken = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/)?.[1];
  if (!accessToken) return false;
  try {
    const decoded = JSON.parse(decodeURIComponent(accessToken));
    const token = Array.isArray(decoded) ? decoded[0] : decoded?.access_token || decoded;
    if (!token || typeof token !== 'string') return false;
    const { data: { user } } = await supabase.auth.getUser(token);
    return !!user?.email && ADMIN_EMAILS.includes(user.email);
  } catch { return false; }
}

async function trongridBalanceUsdt(address: string): Promise<number | null> {
  if (!address || !TronEnv.hasApiKey) return null;
  try {
    const url = `${TronEnv.host}/v1/accounts/${address}/transactions/trc20?contract_address=${TronEnv.contract}&limit=1`;
    void url;
    // For balance specifically we hit a different endpoint:
    const res = await fetch(`${TronEnv.host}/v1/accounts/${address}`, {
      headers: { 'TRON-PRO-API-KEY': process.env.TRONGRID_API_KEY || '' },
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const trc20 = (json?.data?.[0]?.trc20 || []) as Array<Record<string, string>>;
    for (const m of trc20) {
      const usdtRaw = m[TronEnv.contract];
      if (usdtRaw) return parseFloat(usdtRaw) / 1_000_000;
    }
    return 0;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // House fee from market matched bets
    const { data: feeRows } = await supabase
      .from('house_fee_ledger').select('fee_cents, created_at');
    const totalMarketFeeCents = (feeRows || []).reduce((a, r: any) => a + (r.fee_cents || 0), 0);

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const todayFee = (feeRows || []).filter((r: any) => r.created_at >= dayAgo)
      .reduce((a, r: any) => a + r.fee_cents, 0);
    const weekFee = (feeRows || []).filter((r: any) => r.created_at >= weekAgo)
      .reduce((a, r: any) => a + r.fee_cents, 0);

    // Crash fee
    const { data: crashBets } = await supabase
      .from('crash_bets').select('fee_cents, created_at').gt('fee_cents', 0);
    const totalCrashFeeCents = (crashBets || []).reduce((a, r: any) => a + r.fee_cents, 0);

    // Volume (matched bets pool + crash stakes)
    const { data: pools } = await supabase
      .from('matched_bets').select('total_pool_cents');
    const totalMatchedVolume = (pools || []).reduce((a, r: any) => a + r.total_pool_cents, 0);
    const { data: stakes } = await supabase
      .from('crash_bets').select('stake_cents');
    const totalCrashVolume = (stakes || []).reduce((a, r: any) => a + r.stake_cents, 0);

    // Pending withdrawals
    const { data: pendingW } = await supabase
      .from('withdrawals')
      .select('id, user_id, to_address, amount_cents, status, created_at')
      .in('status', ['queued', 'sending', 'sent']).order('created_at', { ascending: false }).limit(20);

    // Recent referral payouts
    const { data: refsPaid } = await supabase
      .from('referral_earnings').select('earned_cents').gte('created_at', weekAgo);
    const refPayoutsWeekCents = (refsPaid || []).reduce((a, r: any) => a + r.earned_cents, 0);

    // Hot wallet balance
    const hotBalance = TronEnv.hotWalletAddress
      ? await trongridBalanceUsdt(TronEnv.hotWalletAddress)
      : null;

    return NextResponse.json({
      house: {
        marketFeesTotalUsdt: totalMarketFeeCents / 100,
        marketFeesTodayUsdt: todayFee / 100,
        marketFeesWeekUsdt: weekFee / 100,
        crashFeesTotalUsdt: totalCrashFeeCents / 100,
        totalFeesUsdt: (totalMarketFeeCents + totalCrashFeeCents) / 100,
      },
      volume: {
        matchedTotalUsdt: totalMatchedVolume / 100,
        crashTotalUsdt: totalCrashVolume / 100,
      },
      hotWallet: {
        address: TronEnv.hotWalletAddress || null,
        configured: !!TronEnv.hotWalletAddress,
        canSign: TronEnv.hasPrivateKey,
        balanceUsdt: hotBalance,
      },
      pendingWithdrawals: (pendingW || []).map((w: any) => ({
        id: w.id, userId: w.user_id, toAddress: w.to_address,
        amountUsdt: w.amount_cents / 100, status: w.status, createdAt: w.created_at,
      })),
      referralPayoutsWeekUsdt: refPayoutsWeekCents / 100,
    });
  } catch (e: any) {
    console.error('[CaribPredict] /api/admin/finance error', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
