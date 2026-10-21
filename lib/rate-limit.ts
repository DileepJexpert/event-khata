// In-memory sliding-window rate limiter for sensitive/costly API routes.
// Automatically cleans up expired windows to prevent memory leaks.

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitRecord>();

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
};

export function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();

  // Periodic cleanup if store exceeds 2,000 entries
  if (store.size > 2000) {
    for (const [k, v] of store.entries()) {
      if (v.resetAt <= now) {
        store.delete(k);
      }
    }
  }

  const record = store.get(key);

  if (!record || record.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetInSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
    };
  }

  record.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    resetInSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
  };
}
