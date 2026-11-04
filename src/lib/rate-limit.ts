/**
 * In-memory sliding-window rate limiter.
 * Adequate for a single-instance deployment; swap for Redis when scaling out.
 */

type Entry = { hits: number[] };

const store = new Map<string, Entry>();
let lastSweep = Date.now();

const SWEEP_INTERVAL = 10 * 60 * 1000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL) return;
  lastSweep = now;
  for (const [key, entry] of store) {
    entry.hits = entry.hits.filter((t) => now - t < 60 * 60 * 1000);
    if (entry.hits.length === 0) store.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const entry = store.get(key) ?? { hits: [] };
  entry.hits = entry.hits.filter((t) => now - t < windowMs);

  if (entry.hits.length >= limit) {
    const oldest = entry.hits[0];
    store.set(key, entry);
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  entry.hits.push(now);
  store.set(key, entry);
  return { ok: true, remaining: limit - entry.hits.length, retryAfterSec: 0 };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "local";
}

export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser or same-origin GET-style requests
  try {
    const host = req.headers.get("host");
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}
