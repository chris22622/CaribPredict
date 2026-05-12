// Admin-only: settle a market. Pay winners, refund unmatched stakes,
// record fee, mark everything resolved. Returns aggregate payout summary.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { settleMarket } from '@/lib/settlement';

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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const marketId = params.id;
    const body = await req.json();
    const { winningOptionId, winningSide } = body as {
      winningOptionId?: string;     // option that resolved YES
      winningSide?: 'YES' | 'NO';   // side that wins for the option
    };
    if (!winningOptionId || (winningSide !== 'YES' && winningSide !== 'NO')) {
      return NextResponse.json({ error: 'winningOptionId + winningSide required' }, { status: 400 });
    }

    const result = await settleMarket(supabase, marketId, winningOptionId, winningSide);
    return NextResponse.json({
      ok: true,
      marketId: result.marketId,
      winningOptionId: result.winningOptionId,
      winningSide: result.winningSide,
      payouts: result.payouts,
      totalPaidOutUsdt: result.totalPaidOutCents / 100,
      totalFeeUsdt: result.totalFeeCents / 100,
      refundedOrders: result.refundedOrders,
      refundedTotalUsdt: result.refundedTotalCents / 100,
    });
  } catch (e: any) {
    console.error('[CaribPredict] /api/markets/[id]/settle error', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
