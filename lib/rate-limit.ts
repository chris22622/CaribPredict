// In-memory token-bucket rate limiter. Lives for the life of a Vercel
// serverless instance, so it's a soft limit, not a hard ceiling — multiple
// instances can each grant requests in parallel. Fine as a first line of
// defense against single-attacker flooding; upgrade to Redis later if abuse
// becomes a real problem.

interface Bucket { tokens: number; lastRefill: number; }

const buckets = new Map<string, Bucket>();

interface RateLimitOptions {
  /** Max tokens (== max burst). */ capacity: number;
  /** Tokens added per second. */ refillPerSec: number;
}

export function rateLimit(key: string, opts: RateLimitOptions): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b) {
    b = { tokens: opts.capacity, lastRefill: now };
    buckets.set(key, b);
  }
  // Refill
  const elapsedSec = (now - b.lastRefill) / 1000;
  b.tokens = Math.min(opts.capacity, b.tokens + elapsedSec * opts.refillPerSec);
  b.lastRefill = now;
  if (b.tokens >= 1) {
    b.tokens -= 1;
    return { allowed: true, retryAfterMs: 0 };
  }
  const need = 1 - b.tokens;
  const retryMs = (need / opts.refillPerSec) * 1000;
  return { allowed: false, retryAfterMs: Math.ceil(retryMs) };
}

/** Per-IP + per-route key. Strip ?query so a single endpoint shares one bucket. */
export function rateKey(ip: string, route: string): string {
  return `${ip}::${route}`;
}

/** Light cleanup so buckets map doesn't grow unbounded. Called occasionally. */
let lastSweep = Date.now();
export function maybeSweep(maxAgeMs: number = 10 * 60 * 1000) {
  const now = Date.now();
  if (now - lastSweep < maxAgeMs) return;
  for (const [k, b] of buckets.entries()) {
    if (now - b.lastRefill > maxAgeMs) buckets.delete(k);
  }
  lastSweep = now;
}
