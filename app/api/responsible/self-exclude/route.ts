import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const VALID_DURATIONS_DAYS = [1, 7, 30, 90, 180, 365, -1]; // -1 = permanent

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, durationDays, reason } = body as {
      userId?: string; durationDays?: number; reason?: string;
    };
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    if (typeof durationDays !== 'number' || !VALID_DURATIONS_DAYS.includes(durationDays)) {
      return NextResponse.json({
        error: 'durationDays must be one of 1, 7, 30, 90, 180, 365, or -1 (permanent)',
      }, { status: 400 });
    }

    // Check user not already actively excluded
    const { data: active } = await supabase
      .from('self_exclusions').select('id').eq('user_id', userId).is('released_at', null).limit(1);
    if (active && active.length) {
      return NextResponse.json({ error: 'You already have an active self-exclusion.' }, { status: 400 });
    }

    const startsAt = new Date();
    const endsAt = durationDays === -1
      ? null
      : new Date(startsAt.getTime() + durationDays * 86400000);

    const { data, error } = await supabase.from('self_exclusions').insert({
      user_id: userId,
      reason: (reason || '').slice(0, 500),
      starts_at: startsAt.toISOString(),
      ends_at: endsAt ? endsAt.toISOString() : null,
    }).select().single();
    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to set exclusion' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true, exclusionId: data.id,
      startsAt: data.starts_at,
      endsAt: data.ends_at,
      message: durationDays === -1
        ? 'Permanent self-exclusion applied. Contact support to discuss reinstatement after 6 months.'
        : `Self-exclusion active for ${durationDays} day${durationDays === 1 ? '' : 's'}.`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = new URL(req.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    const { data } = await supabase
      .from('self_exclusions').select('*')
      .eq('user_id', userId).is('released_at', null)
      .order('starts_at', { ascending: false }).limit(1).maybeSingle();
    const now = Date.now();
    const active = !!data && (!data.ends_at || new Date(data.ends_at).getTime() > now);
    return NextResponse.json({
      active,
      startsAt: data?.starts_at || null,
      endsAt: data?.ends_at || null,
      isPermanent: data && !data.ends_at,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
