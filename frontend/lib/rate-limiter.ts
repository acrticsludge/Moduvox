/**
 * Simple in-memory rate limiter.
 *
 * NOTE: On Vercel serverless, each function instance has its own memory.
 * This is a best-effort rate limiter — not guaranteed across instances.
 * For production-critical rate limiting, use a distributed store (Upstash Redis, etc.).
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key)
  }
}, 300_000)

/**
 * Check if an action is rate limited.
 *
 * @param key - Unique key (e.g., "waitlist:user_123" or "ip:1.2.3.4")
 * @param limit - Maximum number of actions allowed within the window
 * @param windowMs - Time window in milliseconds
 * @returns Object with `allowed` boolean and `remaining` count
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  entry.count++
  const remaining = Math.max(0, limit - entry.count)

  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining, resetAt: entry.resetAt }
}
