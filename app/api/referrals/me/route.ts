import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { REFERRAL_TIERS, tierForActiveReferrals } from '@/lib/referrals';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    // 1. Get user's referral code
    const { data: user } = await supabase
      .from('users').select('referral_code').eq('id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 2. All users this user has referred
    const { data: refs } = await supabase
      .from('users').select('id, created_at').eq('referred_by_user_id', userId);
    const referralIds = (refs || []).map((r: any) => r.id);

    // 3. Among those, how many are "active" (placed at least one matched bet)
    let activeCount = 0;
    if (referralIds.length > 0) {
      const { count } = await supabase
        .from('bet_orders')
        .select('user_id', { count: 'exact', head: true })
        .in('user_id', referralIds)
        .in('status', ['matched', 'partial', 'won', 'lost', 'open']);
      // count of rows; we want distinct users but approximate with row presence
      // (a referee with 1 row counts once because we filter on .in(user_id))
      const { data: distinct } = await supabase
        .from('bet_orders').select('user_id').in('user_id', referralIds);
      const uniq = new Set((distinct || []).map((r: any) => r.user_id));
      activeCount = uniq.size;
      void count;
    }

    const tier = tierForActiveReferrals(activeCount);

    // 4. Earnings summary
    const { data: earnings } = await supabase
      .from('referral_earnings')
      .select('earned_cents, status, created_at')
      .eq('referrer_id', userId);
    const totalCents = (earnings || []).reduce((a, r: any) => a + (r.earned_cents || 0), 0);
    const pendingCents = (earnings || [])
      .filter((r: any) => r.status === 'pending')
      .reduce((a, r: any) => a + (r.earned_cents || 0), 0);
    const paidCents = (earnings || [])
      .filter((r: any) => r.status === 'paid')
      .reduce((a, r: any) => a + (r.earned_cents || 0), 0);

    // 5. Recent earnings (last 10)
    const { data: recent } = await supabase
      .from('referral_earnings')
      .select('id, earned_cents, source_fee_cents, rate_bps, status, created_at')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false }).limit(10);

    return NextResponse.json({
      referralCode: user.referral_code,
      shareUrl: user.referral_code
        ? `https://www.caribpredict.com/?ref=${user.referral_code}`
        : null,
      totalReferrals: refs?.length || 0,
      activeReferrals: activeCount,
      currentTier: tier,
      nextTier: REFERRAL_TIERS.find(t => t.minActiveRefs > activeCount) || null,
      earnings: {
        totalUsdt: totalCents / 100,
        pendingUsdt: pendingCents / 100,
        paidUsdt: paidCents / 100,
      },
      recent: (recent || []).map((r: any) => ({
        ...r,
        earned_usdt: r.earned_cents / 100,
        source_fee_usdt: r.source_fee_cents / 100,
        rate_pct: r.rate_bps / 100,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
