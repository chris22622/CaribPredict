// Public bet feed: recent settled bets across markets + crash + instant games.
// Anonymized user IDs. Used by the homepage LiveFeed component and big-win
// toast detection. Cached for 4s on the edge.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function shortId(uuid: string): string {
  return uuid.slice(0, 4).toUpperCase() + '…' + uuid.slice(-4).toUpperCase();
}

export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(50, parseInt(new URL(req.url).searchParams.get('limit') || '20', 10));

    const [crash, instant] = await Promise.all([
      supabase.from('crash_bets')
        .select('id, user_id, stake_cents, cashout_multiplier, payout_cents, status, cashed_at, round_id')
        .in('status', ['cashed_out', 'crashed'])
        .order('cashed_at', { ascending: false }).limit(limit),
      supabase.from('instant_game_bets')
        .select('id, user_id, game_type, stake_cents, multiplier, payout_cents, status, settled_at')
        .eq('status', 'settled').order('settled_at', { ascending: false }).limit(limit),
    ]);

    const events: any[] = [];

    for (const b of (crash.data || []) as any[]) {
      events.push({
        id: 'c-' + b.id,
        ts: b.cashed_at,
        game: 'Crash',
        user: shortId(b.user_id),
        stakeUsdt: b.stake_cents / 100,
        won: b.status === 'cashed_out',
        multiplier: b.cashout_multiplier ? Number(b.cashout_multiplier) : null,
        payoutUsdt: (b.payout_cents || 0) / 100,
      });
    }
    for (const b of (instant.data || []) as any[]) {
      events.push({
        id: 'i-' + b.id,
        ts: b.settled_at,
        game: b.game_type.charAt(0).toUpperCase() + b.game_type.slice(1),
        user: shortId(b.user_id),
        stakeUsdt: b.stake_cents / 100,
        won: (b.payout_cents || 0) > b.stake_cents,
        multiplier: b.multiplier ? Number(b.multiplier) : null,
        payoutUsdt: (b.payout_cents || 0) / 100,
      });
    }

    events.sort((a, b) => (a.ts > b.ts ? -1 : 1));
    const out = events.slice(0, limit);

    return NextResponse.json({ feed: out }, {
      headers: { 'Cache-Control': 'public, max-age=4, s-maxage=4' },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
