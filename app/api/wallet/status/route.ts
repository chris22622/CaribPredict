import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const { data: user } = await supabase
      .from('users')
      .select('id, balance_cents, wagering_required_cents, wagering_completed_cents')
      .eq('id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { data: pending } = await supabase
      .from('deposit_intents')
      .select('id, expected_total_cents, tag, expires_at')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentDeposits } = await supabase
      .from('deposits')
      .select('id, tx_hash, amount_cents, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentWithdrawals } = await supabase
      .from('withdrawals')
      .select('id, to_address, amount_cents, net_cents, tx_hash, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const required = user.wagering_required_cents || 0;
    const completed = user.wagering_completed_cents || 0;
    return NextResponse.json({
      balanceUsdt: (user.balance_cents || 0) / 100,
      balanceCents: user.balance_cents || 0,
      wagering: {
        requiredUsdt: required / 100,
        completedUsdt: completed / 100,
        remainingUsdt: Math.max(0, (required - completed) / 100),
        unlocked: required === 0 || completed >= required,
      },
      pendingIntents: pending || [],
      recentDeposits: recentDeposits || [],
      recentWithdrawals: recentWithdrawals || [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
