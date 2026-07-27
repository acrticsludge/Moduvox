import { createAdminClient } from "./supabase/admin"

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
 * In-memory rate limiter (fallback when Supabase is unreachable).
 * Not guaranteed across serverless instances.
 */
export function checkMemoryRateLimit(
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

/**
 * DB-backed rate limiter using Supabase.
 * Effective across serverless instances (unlike in-memory).
 * Falls back to in-memory limiter on DB error.
 *
 * Requires a `rate_limits` table:
 *   CREATE TABLE rate_limits (
 *     id BIGSERIAL PRIMARY KEY,
 *     key TEXT NOT NULL,
 *     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
 *   );
 *   CREATE INDEX idx_rate_limits_key_created ON rate_limits (key, created_at);
 */
export async function checkDbRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const supabase = createAdminClient()
  const now = new Date()
  const windowStart = new Date(now.getTime() - windowMs)

  try {
    const { count, error } = await supabase
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("key", key)
      .gte("created_at", windowStart.toISOString())

    if (error) {
      console.error("[rate-limiter] DB query failed:", error.message)
      return checkMemoryRateLimit(key, limit, windowMs)
    }

    const currentCount = count || 0
    if (currentCount >= limit) {
      return { allowed: false, remaining: 0, resetAt: now.getTime() + windowMs }
    }

    // Log this request
    try {
      await supabase.from("rate_limits").insert({
        key,
        created_at: now.toISOString(),
      })
    } catch {
      // fire-and-forget insert is acceptable
    }

    return { allowed: true, remaining: limit - currentCount - 1, resetAt: now.getTime() + windowMs }
  } catch (err) {
    console.error("[rate-limiter] DB exception:", err)
    return checkMemoryRateLimit(key, limit, windowMs)
  }
}
