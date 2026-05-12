// Recent crash round outcomes (multipliers) for the history strip.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
    const { data } = await supabase
      .from('crash_rounds')
      .select('crash_multiplier, round_number')
      .eq('status', 'crashed')
      .order('round_number', { ascending: false })
      .limit(limit);
    return NextResponse.json({
      history: (data || []).map((r: any) => Number(r.crash_multiplier)).reverse(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
