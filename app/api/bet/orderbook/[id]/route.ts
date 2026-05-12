import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { probabilityFromVolumes } from '@/lib/matching';
import { multiplierFromProb as fmtMul } from '@/lib/cp-data';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const marketId = params.id;
    if (!marketId) return NextResponse.json({ error: 'market id required' }, { status: 400 });

    const { data: options } = await supabase
      .from('market_options').select('id, label').eq('market_id', marketId);

    const result: Record<string, any> = {};
    for (const o of options || []) {
      const optionId = (o as any).id as string;

      const { data: matched } = await supabase
        .from('matched_bets')
        .select('yes_stake_cents, no_stake_cents, fee_cents, total_pool_cents, yes_probability, status, settled_at')
        .eq('market_id', marketId).eq('option_id', optionId);

      const openMatched = (matched || []).filter((r: any) => r.status === 'open');
      const yesMatchedTotal = openMatched.reduce((a, r: any) => a + r.yes_stake_cents, 0);
      const noMatchedTotal  = openMatched.reduce((a, r: any) => a + r.no_stake_cents,  0);
      const poolTotal       = openMatched.reduce((a, r: any) => a + r.total_pool_cents, 0);
      const feeTotal        = openMatched.reduce((a, r: any) => a + r.fee_cents,        0);

      const { data: openOrders } = await supabase
        .from('bet_orders')
        .select('id, side, stake_cents, matched_cents, probability_at_order, created_at')
        .eq('market_id', marketId).eq('option_id', optionId)
        .in('status', ['open', 'partial'])
        .order('created_at', { ascending: true });

      const unmatchedYesCents = (openOrders || [])
        .filter((r: any) => r.side === 'YES')
        .reduce((a, r: any) => a + (r.stake_cents - r.matched_cents), 0);
      const unmatchedNoCents = (openOrders || [])
        .filter((r: any) => r.side === 'NO')
        .reduce((a, r: any) => a + (r.stake_cents - r.matched_cents), 0);

      const probability = probabilityFromVolumes(yesMatchedTotal, noMatchedTotal);

      result[optionId] = {
        optionId,
        label: (o as any).label,
        probability,
        yesMultiplier: fmtMul(probability),
        noMultiplier:  fmtMul(Math.max(0.01, 1 - probability)),
        matched: {
          yesUsdt: yesMatchedTotal / 100,
          noUsdt:  noMatchedTotal  / 100,
          poolUsdt: poolTotal      / 100,
          feeUsdt:  feeTotal       / 100,
          count: openMatched.length,
        },
        unmatched: {
          yesUsdt: unmatchedYesCents / 100,
          noUsdt:  unmatchedNoCents  / 100,
          count: (openOrders || []).length,
        },
      };
    }

    return NextResponse.json({ marketId, options: result });
  } catch (e: any) {
    console.error('[CaribPredict] /api/bet/orderbook error', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
