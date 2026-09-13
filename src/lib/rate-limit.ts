// Simple in-memory sliding-window rate limiter (per-process).
// For a single-instance deployment this is effective; swap with Redis for multi-node.

type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 50_000;

function prune(now: number) {
  // occasionally clear stale buckets to bound memory
  if (buckets.size > MAX_KEYS) {
    for (const [key, b] of buckets) {
      if (b.hits.length === 0 || b.hits[b.hits.length - 1] < now - 600_000) buckets.delete(key);
    }
  }
}

export function rateLimit(opts: {
  key: string;
  max: number;
  windowMs: number;
}): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  prune(now);
  const bucket = buckets.get(opts.key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => t > now - opts.windowMs);
  if (bucket.hits.length >= opts.max) {
    const oldest = bucket.hits[0];
    buckets.set(opts.key, bucket);
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((oldest + opts.windowMs - now) / 1000)),
    };
  }
  bucket.hits.push(now);
  buckets.set(opts.key, bucket);
  return { ok: true, retryAfterSec: 0 };
}

export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}
