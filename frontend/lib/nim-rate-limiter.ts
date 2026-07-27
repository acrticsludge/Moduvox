/**
 * In-memory token bucket rate limiter for the shared NVIDIA NIM project key.
 *
 * The project key (NVIDIA_NIM_KEY) has a 40 RPM limit shared across all users
 * who haven't set their own NIM key. This limiter ensures we don't exceed that.
 *
 * If the bucket is empty, acquireNemotronToken() returns false immediately
 * (no busy-wait — the caller can decide whether to fall back or retry).
 *
 * NOTE: On Vercel serverless, each function instance has its own memory.
 * This is a best-effort rate limiter — not guaranteed across instances.
 */

interface TokenBucket {
  tokens: number
  lastRefill: number
  maxTokens: number
  refillRate: number // tokens per second
}

const bucket: TokenBucket = {
  tokens: 40,
  lastRefill: Date.now(),
  maxTokens: 40,
  refillRate: 40 / 60, // 0.667 tokens/sec
}

const WARNING_THRESHOLD = 0.8 // log warning at 80% utilization

function refill(): void {
  const now = Date.now()
  bucket.tokens = Math.min(
    bucket.maxTokens,
    bucket.tokens + ((now - bucket.lastRefill) / 1000) * bucket.refillRate,
  )
  bucket.lastRefill = now
}

/**
 * Try to acquire a token from the project key bucket.
 * Returns true immediately if a token was available, false if the bucket is empty.
 * Does NOT wait — the caller handles 500ms retry logic via sleep(500) if needed.
 */
export function acquireNemotronToken(): boolean {
  refill()

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1

    const utilization = 1 - bucket.tokens / bucket.maxTokens
    if (utilization > WARNING_THRESHOLD) {
      console.warn(
        `[nim-rate-limiter] Project key at ${Math.round(utilization * 100)}% utilization (${bucket.tokens.toFixed(1)} tokens remaining)`,
      )
    }

    return true
  }

  return false
}
