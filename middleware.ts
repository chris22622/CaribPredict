// Edge middleware: security headers on every response + rate limiting on
// money-moving routes. Runs ahead of every page and API call.

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateKey, maybeSweep } from '@/lib/rate-limit';

// Routes that need stricter rate limiting (money-moving endpoints).
const HOT_PATHS = [
  '/api/bet/place',
  '/api/crash/bet',
  '/api/crash/cashout',
  '/api/withdraw',
  '/api/withdraw/usdt',
  '/api/deposit/address',
];

function addSecurityHeaders(res: NextResponse): NextResponse {
  // Don't break tronscan/coingecko/pollinations images via overly tight CSP.
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  return res;
}

function clientIp(req: NextRequest): string {
  // Trust standard headers Vercel sets. Fall back to "unknown" so the
  // rate-limit key isn't undefined.
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

export function middleware(req: NextRequest) {
  maybeSweep();

  // Rate limit money-moving routes: 10 per minute per IP, burst of 5.
  const path = req.nextUrl.pathname;
  if (HOT_PATHS.some(p => path === p || path.startsWith(p + '/'))) {
    const ip = clientIp(req);
    const limit = rateLimit(rateKey(ip, path), { capacity: 5, refillPerSec: 10 / 60 });
    if (!limit.allowed) {
      const res = NextResponse.json(
        { error: 'Too many requests. Slow down.', retryAfterMs: limit.retryAfterMs },
        { status: 429 },
      );
      res.headers.set('Retry-After', String(Math.ceil(limit.retryAfterMs / 1000)));
      return addSecurityHeaders(res);
    }
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    // Skip Next.js internals + static assets
    '/((?!_next/static|_next/image|favicon.ico|icons|sw.js|workbox-).*)',
  ],
};
