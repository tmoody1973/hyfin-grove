/**
 * A sliding-window limit kept in memory.
 * ponytail: per server instance, so a busy bot spread across instances gets a few more tries; move to a shared
 * store (Upstash/Redis) if submissions get flooded.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (key: string, now = Date.now()): boolean => {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    hits.set(key, [...recent, now]);
    if (hits.size > 10_000) hits.clear(); // keep memory bounded
    return true;
  };
}
