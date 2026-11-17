/**
 * Fixed-window rate limiter kept in memory.
 *
 * Swiping by hand is slow; a script firing hundreds of swipes a minute is not
 * a person. Capping the rate makes it harder to automate probing of the feed.
 * In-memory is enough for this single-process demo; a multi-instance deploy
 * would move this to Redis or similar.
 */
export type RateLimiter = {
  check: (key: string) => { allowed: boolean; retryAfterSeconds: number };
};

export function createRateLimiter(opts: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const { limit, windowMs, now = Date.now } = opts;
  const windows = new Map<string, { start: number; count: number }>();

  return {
    check(key) {
      const t = now();
      let w = windows.get(key);
      if (!w || t - w.start >= windowMs) {
        w = { start: t, count: 0 };
        windows.set(key, w);
      }
      w.count += 1;
      if (w.count <= limit) return { allowed: true, retryAfterSeconds: 0 };
      return { allowed: false, retryAfterSeconds: Math.ceil((w.start + windowMs - t) / 1000) };
    },
  };
}

/** 60 swipes per minute per client is far above any human swiping pace. */
export const swipeLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
