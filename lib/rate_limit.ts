import { AppError } from './permissions';

/**
 * Minimal in-memory fixed-window rate limiter. Good enough for a single-node
 * deployment; swap for Redis when the app scales horizontally.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    const retrySec = Math.ceil((bucket.resetAt - now) / 1000);
    throw new AppError(`Too many requests — retry in ${retrySec}s`, 429);
  }
  // opportunistic cleanup
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return fwd?.split(',')[0]?.trim() || 'local';
}
