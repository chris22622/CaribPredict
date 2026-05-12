// Backstop cron for the crash game. Calls the same state-handling logic the
// /api/crash/state endpoint uses, so rounds keep cycling even if no one is
// looking at /crash. Runs every minute (vercel.json).

import { NextRequest, NextResponse } from 'next/server';

function isCronRequest(req: NextRequest): boolean {
  if (req.headers.get('x-vercel-cron')) return true;
  const auth = req.headers.get('authorization') || '';
  return !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isCronRequest(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  // Just nudge the state endpoint so its self-healing logic runs.
  // We invoke it via fetch against our own origin.
  try {
    const origin = req.nextUrl.origin;
    const res = await fetch(`${origin}/api/crash/state`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: true, state: json });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'tick failed' }, { status: 500 });
  }
}
