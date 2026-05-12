// Live-now widget data: rough online count + total wagered today across all
// games. Cached for 8s.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET() {
  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const [
      crashStakes, instantStakes, matchedPools,
      activeCrash, activeInstant, activeMarket,
    ] = await Promise.all([
      supabase.from('crash_bets').select('stake_cents, user_id, created_at')
        .gte('created_at', dayAgo),
      supabase.from('instant_game_bets').select('stake_cents, user_id, created_at')
        .gte('created_at', dayAgo).eq('status', 'settled'),
      supabase.from('matched_bets').select('total_pool_cents, created_at')
        .gte('created_at', dayAgo),
      supabase.from('crash_bets').select('user_id').gte('created_at', tenMinAgo),
      supabase.from('instant_game_bets').select('user_id').gte('created_at', tenMinAgo),
      supabase.from('bet_orders').select('user_id').gte('created_at', tenMinAgo),
    ]);

    const totalWageredCents =
      (crashStakes.data || []).reduce((a: number, r: any) => a + r.stake_cents, 0) +
      (instantStakes.data || []).reduce((a: number, r: any) => a + r.stake_cents, 0) +
      (matchedPools.data || []).reduce((a: number, r: any) => a + r.total_pool_cents, 0);

    const activeUsers = new Set<string>();
    [...(activeCrash.data || []), ...(activeInstant.data || []), ...(activeMarket.data || [])]
      .forEach((r: any) => r.user_id && activeUsers.add(r.user_id));

    return NextResponse.json({
      onlineNow: activeUsers.size,
      totalWageredTodayUsdt: totalWageredCents / 100,
      betCount24h:
        (crashStakes.data?.length || 0) + (instantStakes.data?.length || 0) + (matchedPools.data?.length || 0),
    }, {
      headers: { 'Cache-Control': 'public, max-age=8, s-maxage=8' },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
