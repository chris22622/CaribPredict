import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function toCents(v: number | undefined | null): number | null {
  if (v == null) return null;
  if (typeof v !== 'number' || !isFinite(v) || v < 0) return null;
  return Math.round(v * 100);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId, dailyDepositUsdt, weeklyDepositUsdt, monthlyDepositUsdt,
      dailyWagerUsdt, dailyLossUsdt, coolingOffHours,
    } = body;
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const upd: any = {
      daily_deposit_cap_cents: toCents(dailyDepositUsdt),
      weekly_deposit_cap_cents: toCents(weeklyDepositUsdt),
      monthly_deposit_cap_cents: toCents(monthlyDepositUsdt),
      daily_wager_cap_cents: toCents(dailyWagerUsdt),
      daily_loss_cap_cents: toCents(dailyLossUsdt),
      updated_at: new Date().toISOString(),
    };
    if (typeof coolingOffHours === 'number' && coolingOffHours > 0) {
      upd.cooling_off_until = new Date(Date.now() + coolingOffHours * 3600 * 1000).toISOString();
    }

    const { error } = await supabase.from('user_responsible_limits').upsert({
      user_id: userId, ...upd,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = new URL(req.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    const { data } = await supabase.from('user_responsible_limits')
      .select('*').eq('user_id', userId).maybeSingle();
    return NextResponse.json({
      limits: data ? {
        dailyDepositUsdt: data.daily_deposit_cap_cents == null ? null : data.daily_deposit_cap_cents / 100,
        weeklyDepositUsdt: data.weekly_deposit_cap_cents == null ? null : data.weekly_deposit_cap_cents / 100,
        monthlyDepositUsdt: data.monthly_deposit_cap_cents == null ? null : data.monthly_deposit_cap_cents / 100,
        dailyWagerUsdt: data.daily_wager_cap_cents == null ? null : data.daily_wager_cap_cents / 100,
        dailyLossUsdt: data.daily_loss_cap_cents == null ? null : data.daily_loss_cap_cents / 100,
        coolingOffUntil: data.cooling_off_until,
      } : null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
