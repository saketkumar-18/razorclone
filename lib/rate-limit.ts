// Minimal in-memory rate limiter (per-instance; best-effort on serverless).
// For stricter multi-instance limits, swap in Upstash Redis or similar.
const WINDOW_MS = 60_000;
const MAX = 30; // requests per window per IP
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(ip: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  entry.count += 1;
  if (entry.count > MAX) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { ok: true };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}
