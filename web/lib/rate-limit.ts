type Result = { ok: true } | { ok: false; retryAfterSeconds: number };

/**
 * Allow `limit` requests per `windowMs` for each key (here, a client IP).
 *
 * The counts live in this server instance's memory. That's enough for a demo, but on
 * Vercel each instance counts separately and a cold start resets the counts. Production
 * would keep them in shared storage (Vercel KV, Upstash) or use a Vercel Firewall rule.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();

  return function check(key: string, now = Date.now()): Result {
    const recent = (hits.get(key) ?? []).filter((t) => t > now - windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return { ok: false, retryAfterSeconds: Math.ceil((recent[0] + windowMs - now) / 1000) };
    }
    recent.push(now);
    hits.set(key, recent);

    // Keep memory bounded: drop keys with no hits left in the window.
    if (hits.size > 10_000) {
      for (const [k, times] of hits) if (times.every((t) => t <= now - windowMs)) hits.delete(k);
    }
    return { ok: true };
  };
}
