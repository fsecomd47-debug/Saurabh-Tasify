import { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __stRateBuckets: Map<string, Bucket> | undefined;
}

const buckets = (globalThis.__stRateBuckets ??= new Map<string, Bucket>());

/**
 * Fixed-window in-memory rate limiter (single-instance dev).
 * For multi-instance production swap for Redis/Upstash — interface stays identical.
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true as const, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return {
      ok: false as const,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true as const, remaining: limit - bucket.count, retryAfterSec: 0 };
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

/**
 * CSRF defense-in-depth for cookie-auth mutations (spec §47):
 * SameSite=Lax already blocks cross-site POSTs from forms/fetch without CORS,
 * but we additionally require a same-origin Origin header when present.
 */
export function sameOriginGuard(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients / same-origin form posts
  const host = req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
