// Simple in-memory sliding-window rate limiter — sufficient for a
// single-instance deployment; swap for Redis/Upstash when scaling out.

const windows = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const hits = (windows.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    const retryAfterSeconds = Math.ceil((hits[0] + windowMs - now) / 1000);
    windows.set(key, hits);
    return { ok: false, retryAfterSeconds };
  }
  hits.push(now);
  windows.set(key, hits);
  return { ok: true, retryAfterSeconds: 0 };
}
