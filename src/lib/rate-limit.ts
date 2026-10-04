/**
 * Minimal fixed-window rate limiter (in-memory, per server instance).
 * Best-effort on serverless — pair with a DB-backed limit for anything that
 * must hold across instances (see password-reset service).
 */
const buckets = new Map<string, { count: number; resetAt: number }>()
const MAX_BUCKETS = 10_000

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()

  if (buckets.size > MAX_BUCKETS) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
  }

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= limit) return false
  bucket.count++
  return true
}

export function getClientIp(req: { headers: Headers }): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
}
