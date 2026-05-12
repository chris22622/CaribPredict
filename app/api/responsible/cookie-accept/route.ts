import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deviceCookie, userId, ageConfirmed, cookiesAccepted } = body;
    if (!deviceCookie || typeof deviceCookie !== 'string' || deviceCookie.length < 8) {
      return NextResponse.json({ error: 'deviceCookie required' }, { status: 400 });
    }
    const ipRaw = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '';
    const ipHash = ipRaw ? createHash('sha256').update(ipRaw).digest('hex').slice(0, 32) : null;
    const userAgent = (req.headers.get('user-agent') || '').slice(0, 500);

    await supabase.from('cookie_acceptance').insert({
      device_cookie: deviceCookie.slice(0, 64),
      user_id: userId || null,
      ip_hash: ipHash,
      user_agent: userAgent,
      age_confirmed: !!ageConfirmed,
      cookies_accepted: !!cookiesAccepted,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
