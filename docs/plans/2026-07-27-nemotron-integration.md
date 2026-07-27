# Nemotron Integration — Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 10+ critical issues found in the audit of the initial Nemotron implementation: correct image-per-call batching, proper 4-deep fallback chain (user NIM → project NIM → user Gemini → project Gemini), exponential backoff for 429, 500ms token-bucket wait, and all error handling per `docs/architecture/nemotron-image-parsing.md`.

**Architecture:** Nemotron is the primary image analysis provider with Gemini as fallback. Each image is analyzed in a separate API call. A 4-deep key fallback chain ensures maximum availability: user NIM key → project NIM key → user Gemini key → project Gemini key. The project key has a shared token bucket (40 RPM) across all users without their own key.

**Tech Stack:** Next.js App Router, Supabase, NVIDIA NIM API (OpenAI-compatible), Google Gemini API, Node.js `node:zlib` for wire compression.

---

## Files to Create / Modify

| File | Action | Responsibility |
|---|---|---|
| `docs/migrations/035_add_nim_api_key.sql` | **Create** | SQL to add `nim_api_key TEXT` column to `users` table |
| `frontend/lib/validations/user.ts` | **Modify** | Add `UserSettings` type with `nimApiKey` field |
| `frontend/lib/nim-rate-limiter.ts` | **Rewrite** | Add 500ms wait-and-retry loop to token bucket |
| `frontend/app/api/generate/image-descriptions/route.ts` | **Rewrite** | Fix all 10+ critical issues (see audit) |
| `frontend/lib/rate-limiter.ts` | **Unchanged** | Reuse existing in-memory rate limiter |

---

### Task 1: Create migration file for `nim_api_key` column

**Files:**
- Create: `docs/migrations/035_add_nim_api_key.sql`

- [ ] **Create the migration file**

Write `docs/migrations/035_add_nim_api_key.sql`:

```sql
-- Add nim_api_key column for NVIDIA NIM API key storage
-- Encrypted at rest using AES-256-GCM (same pattern as gemini_api_key)
ALTER TABLE users ADD COLUMN IF NOT EXISTS nim_api_key TEXT;
```

- [ ] **Commit**

```bash
git add docs/migrations/035_add_nim_api_key.sql
git commit -m "feat: add nim_api_key column migration"
```

---

### Task 2: Add `UserSettings` type to validations/user.ts

**Files:**
- Modify: `frontend/lib/validations/user.ts`

- [ ] **Add `UserSettings` type**

Edit `frontend/lib/validations/user.ts` to append the `UserSettings` type after the existing exports:

```typescript
// User settings type for API key management
export type UserSettings = {
  geminiApiKey: string | null
  nimApiKey: string | null
}
```

Full file after edit:

```typescript
import { z } from "zod"

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
}).strict()

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

// User settings type for API key management
export type UserSettings = {
  geminiApiKey: string | null
  nimApiKey: string | null
}
```

- [ ] **Commit**

```bash
git add frontend/lib/validations/user.ts
git commit -m "feat: add UserSettings type with nimApiKey"
```

---

### Task 3: Rewrite nim-rate-limiter.ts with 500ms wait loop

**Files:**
- Modify: `frontend/lib/nim-rate-limiter.ts`

- [ ] **Rewrite the entire file**

The token bucket must change from "return false immediately" to "wait up to 500ms for a token, polling every 100ms".

Replace `frontend/lib/nim-rate-limiter.ts` with:

```typescript
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
```

- [ ] **Verify compilation**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30
```
Expected: No errors.

- [ ] **Commit**

```bash
git add frontend/lib/nim-rate-limiter.ts
git commit -m "fix: add 500ms wait loop to NIM token bucket"
```

---

### Task 4: Rewrite image-descriptions/route.ts

**Files:**
- Modify: `frontend/app/api/generate/image-descriptions/route.ts`

This is the largest task. The rewrite fixes all 10+ critical issues from the audit.

**Changes vs the current (broken) implementation:**

| # | Issue | Fix |
|---|-------|-----|
| 1 | Batch loop drops images 2-5 | Process ONE image per Nemotron API call, not batch-of-5 |
| 2 | 5xx errors treated as success | Check all error strings; 500 errors mark as failed, don't fall back to Gemini |
| 3 | 404 errors treated as success | 404 errors fall back to next provider in chain |
| 4 | Fallback chain is 2-deep | Implement 4-deep: user NIM → project NIM → user Gemini → project Gemini |
| 5 | 401/403 doesn't try project NIM | Try project NIM key when user key auth-fails at runtime |
| 6 | Request rejected when Gemini key missing (even if NIM works) | Only reject if NEITHER provider has a key |
| 7 | 429 retry is single attempt | Implement exponential backoff at 1s, 2s, 4s |
| 8 | 503 no special handling | 503 → retry after 5s |
| 9 | Timeout retry uses 120s again | Timeout retry uses 60s timeout |
| 10 | Gemini client initialized unconditionally | Only init Gemini client when needed |

- [ ] **Rewrite the file completely**

Replace the entire content of `frontend/app/api/generate/image-descriptions/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/lib/supabase/server"
import { withApiHandler } from "@/lib/api-handler"
import { checkRateLimit } from "@/lib/rate-limiter"
import { acquireNemotronToken } from "@/lib/nim-rate-limiter"
import { decrypt } from "@/lib/encryption"
import { gzipSync } from "node:zlib"
import { z } from "zod"

// ── Zod schemas ──────────────────────────────────────────────────

const ImageSchema = z.object({
  index: z.number().int().min(0),
  mimeType: z.string().regex(/^image\/(png|jpeg|webp|gif|bmp)$/),
  data: z.string().min(1),
})

const SlideSchema = z.object({
  number: z.number().int().positive(),
  images: z.array(ImageSchema).max(10),
})

const RequestSchema = z.object({
  presentationId: z.string().uuid(),
  slides: z.array(SlideSchema).max(50),
})

const MAX_IMAGES_PER_REQUEST = 20

// ── Constants ────────────────────────────────────────────────────

const NEMOTRON_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
const NEMOTRON_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"

const NEMOTRON_TIMEOUT_MS = 120_000
const NEMOTRON_RETRY_TIMEOUT_MS = 60_000
const GEMINI_TIMEOUT_MS = 25_000

const IMAGE_PROMPT =
  "Examine this image from a business presentation slide. " +
  "Describe what is shown, read any visible text, identify chart types or diagrams, " +
  "explain data trends if applicable, and state the purpose of the visual. " +
  "Keep the description concise (2-3 sentences). " +
  "If the image has no significant visual content, say 'No significant visual content detected.'"

const GEMINI_PROMPT =
  "Examine these images from a business presentation slide. For each image, describe what is shown, " +
  "read any visible text, identify chart types or diagrams, explain data trends if applicable, and " +
  "state the purpose of the visual. Keep each description concise (2-3 sentences). Number each description. " +
  "If an image has no significant visual content, say 'No significant visual content detected.'"

// ── Type definitions ─────────────────────────────────────────────

type ImageResult = { index: number; description: string; error?: string }

interface ResolvedNimKey {
  key: string
  isUserKey: boolean // false = project key (needs token bucket)
}

// ── Nemotron: analyze a single image ─────────────────────────────

async function analyzeOneImageWithNemotron(
  img: z.infer<typeof ImageSchema>,
  nimKey: string,
  timeoutMs: number,
): Promise<ImageResult> {
  const payload = {
    model: NEMOTRON_MODEL,
    messages: [
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: IMAGE_PROMPT },
          {
            type: "image_url" as const,
            image_url: { url: `data:${img.mimeType};base64,${img.data}` },
          },
        ],
      },
    ],
    max_tokens: 4096,
    temperature: 0.2,
    top_k: 1,
    chat_template_kwargs: { enable_thinking: false },
  }

  const body = JSON.stringify(payload)
  const compressed = gzipSync(Buffer.from(body, "utf-8"), { level: 6 })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(NEMOTRON_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${nimKey}`,
        "Content-Type": "application/json",
        "Content-Encoding": "gzip",
      },
      body: compressed,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // 401/403 — auth failure; caller should try next key in chain
    if (response.status === 401 || response.status === 403) {
      return { index: img.index, description: "", error: "NEMOTRON_AUTH_FAILED" }
    }

    // 429 — rate limited; caller should retry with backoff
    if (response.status === 429) {
      return { index: img.index, description: "", error: "RATE_LIMITED" }
    }

    // 404 — model name wrong; fall back to next provider
    if (response.status === 404) {
      console.error(`[image-descriptions] Nemotron model not found: ${NEMOTRON_MODEL}`)
      return { index: img.index, description: "", error: "Nemotron model unavailable" }
    }

    // 503 — overloaded; retry after 5s
    if (response.status === 503) {
      return { index: img.index, description: "", error: "SERVICE_UNAVAILABLE" }
    }

    // 5xx — server error; mark as failed, DON'T fall back to Gemini
    if (response.status >= 500) {
      console.warn(`[image-descriptions] Nemotron server error: ${response.status}`)
      return { index: img.index, description: "", error: "Image could not be processed" }
    }

    if (!response.ok) {
      console.warn(`[image-descriptions] Nemotron unexpected status: ${response.status}`)
      return { index: img.index, description: "", error: "Analysis failed" }
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = json?.choices?.[0]?.message?.content?.trim() ?? ""
    return { index: img.index, description: content }
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof DOMException && err.name === "AbortError") {
      return { index: img.index, description: "", error: "TIMEOUT" }
    }
    return { index: img.index, description: "", error: "NETWORK_ERROR" }
  }
}

// ── Gemini: analyze a single image ───────────────────────────────

async function analyzeOneImageWithGemini(
  img: z.infer<typeof ImageSchema>,
  genAI: GoogleGenerativeAI,
): Promise<ImageResult> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

  try {
    const result = await Promise.race([
      model.generateContent([
        { text: GEMINI_PROMPT },
        { inlineData: { mimeType: img.mimeType, data: img.data } },
      ]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timed out")), GEMINI_TIMEOUT_MS),
      ),
    ])

    const text = result.response.text()?.trim() || ""
    return { index: img.index, description: text }
  } catch (err) {
    console.error(`[image-descriptions] Gemini failed: ${err instanceof Error ? err.message : String(err)}`)
    return { index: img.index, description: "", error: "Analysis failed" }
  }
}

// ── Key resolution ───────────────────────────────────────────────

function resolveNimKey(userData: { nim_api_key?: string | null } | null): ResolvedNimKey | null {
  if (userData?.nim_api_key) {
    try {
      return { key: decrypt(userData.nim_api_key), isUserKey: true }
    } catch {
      return { key: userData.nim_api_key, isUserKey: true }
    }
  }
  if (process.env.NVIDIA_NIM_KEY) {
    return { key: process.env.NVIDIA_NIM_KEY, isUserKey: false }
  }
  return null
}

function resolveGeminiKey(userData: { gemini_api_key?: string | null } | null): string | null {
  if (userData?.gemini_api_key) {
    try {
      return decrypt(userData.gemini_api_key)
    } catch {
      return userData.gemini_api_key
    }
  }
  return process.env.GEMINI_API_KEY ?? null
}

// ── Sleep helper ─────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ── Main handler ─────────────────────────────────────────────────

export const POST = withApiHandler(async (request: Request) => {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Parse + validate
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }
  const { presentationId, slides } = parsed.data

  // Ownership
  const { data: presentation } = await supabase
    .from("presentations")
    .select("id")
    .eq("id", presentationId)
    .eq("user_id", user.id)
    .single()
  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  // Rate limit: 10 req/min/user
  const rateCheck = checkRateLimit(`image-desc:${user.id}`, 10, 60 * 1000)
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 })
  }

  // Image cap
  const totalImages = slides.reduce((sum, s) => sum + s.images.length, 0)
  if (totalImages > MAX_IMAGES_PER_REQUEST) {
    return NextResponse.json({
      error: `Too many images (${totalImages}). Maximum is ${MAX_IMAGES_PER_REQUEST} per request.`,
    }, { status: 422 })
  }

  // ── Resolve keys ──────────────────────────────────
  const { data: userData } = await supabase
    .from("users")
    .select("gemini_api_key, nim_api_key")
    .eq("id", user.id)
    .single()

  const userNimKey = resolveNimKey(userData)
  const projectNimKey = process.env.NVIDIA_NIM_KEY ?? null
  const geminiKey = resolveGeminiKey(userData)

  // Must have at least one provider configured
  if (!userNimKey && !projectNimKey && !geminiKey) {
    return NextResponse.json(
      { error: "No AI provider configured. Set a Gemini or NVIDIA NIM API key in Settings." },
      { status: 500 },
    )
  }

  // Lazy-init Gemini client only if needed (we don't know yet if Nemotron will succeed)
  let genAI: GoogleGenerativeAI | null = null
  function getGeminiClient(): GoogleGenerativeAI | null {
    if (genAI) return genAI
    if (geminiKey) {
      genAI = new GoogleGenerativeAI(geminiKey)
      return genAI
    }
    return null
  }

  // ── Process slides ────────────────────────────────
  const resultSlides: { number: number; images: ImageResult[] }[] = []

  for (const slide of slides) {
    const slideDescriptions: ImageResult[] = []

    for (const image of slide.images) {
      // ── Attempt 1: Nemotron (user key → project key) ──
      let result = await tryNemotronSingleImage(image, userNimKey, projectNimKey)

      // ── Retry-able errors ──
      if (result.error === "RATE_LIMITED") {
        // Exponential backoff: 1s, 2s, 4s
        for (const delay of [1000, 2000, 4000]) {
          await sleep(delay)
          const keyToUse = userNimKey?.key ?? projectNimKey!
          result = await analyzeOneImageWithNemotron(image, keyToUse, NEMOTRON_TIMEOUT_MS)
          if (!result.error || result.error === "NEMOTRON_AUTH_FAILED") break
        }
      } else if (result.error === "TIMEOUT") {
        // Retry once with reduced 60s timeout
        const keyToUse = userNimKey?.key ?? projectNimKey!
        result = await analyzeOneImageWithNemotron(image, keyToUse, NEMOTRON_RETRY_TIMEOUT_MS)
      } else if (result.error === "SERVICE_UNAVAILABLE") {
        // Retry after 5s
        await sleep(5000)
        const keyToUse = userNimKey?.key ?? projectNimKey!
        result = await analyzeOneImageWithNemotron(image, keyToUse, NEMOTRON_TIMEOUT_MS)
      } else if (result.error === "NETWORK_ERROR") {
        // Immediate Gemini fallback — don't retry
      }

      // ── If Nemotron succeeded (or gave non-fallback error) ──
      if (!result.error) {
        slideDescriptions.push(result)
        continue
      }

      // Non-retryable Nemotron errors (5xx, model unavailable) — mark as failed, no Gemini fallback
      if (result.error === "Image could not be processed" || result.error === "Nemotron model unavailable") {
        slideDescriptions.push(result)
        continue
      }

      // ── Attempt 2: Gemini (fallback) ──
      const geminiClient = getGeminiClient()
      if (geminiClient) {
        const geminiResult = await analyzeOneImageWithGemini(image, geminiClient)
        slideDescriptions.push(geminiResult)
      } else {
        // No Gemini key available
        slideDescriptions.push({ index: image.index, description: "", error: "Analysis failed" })
      }
    }

    resultSlides.push({ number: slide.number, images: slideDescriptions })
  }

  return NextResponse.json({ data: { slides: resultSlides } })
})

/**
 * Try Nemotron with available keys: user NIM key → project NIM key.
 * If user key auth-fails, automatically tries project key.
 * Returns the ImageResult from whichever key was used.
 */
async function tryNemotronSingleImage(
  image: z.infer<typeof ImageSchema>,
  userNimKey: ResolvedNimKey | null,
  projectNimKey: string | null,
): Promise<ImageResult> {
  // Attempt 1: User NIM key
  if (userNimKey) {
    const result = await analyzeOneImageWithNemotron(image, userNimKey.key, NEMOTRON_TIMEOUT_MS)

    if (result.error !== "NEMOTRON_AUTH_FAILED") {
      // Auth ok (success or non-auth error) — return as-is
      return result
    }

    // Auth failed — fall through to project key
    console.warn("[image-descriptions] User NIM key auth failed, trying project NIM key")
  }

  // Attempt 2: Project NIM key (with token bucket check)
  if (projectNimKey) {
    // Check token bucket — waits up to 500ms if needed
    if (!acquireNemotronToken()) {
      console.warn("[image-descriptions] NIM project key rate limit reached")
      return { index: image.index, description: "", error: "RATE_LIMITED" }
    }

    return await analyzeOneImageWithNemotron(image, projectNimKey, NEMOTRON_TIMEOUT_MS)
  }

  // No NIM key available at all
  return { index: image.index, description: "", error: "No NIM key available" }
}
```

- [ ] **Verify compilation**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30
```
Expected: No errors.

- [ ] **Commit**

```bash
git add frontend/app/api/generate/image-descriptions/route.ts
git commit -m "fix: rewrite Nemotron provider with correct batching, 4-deep fallback, exponential backoff"
```

---

### Task 5: Verify full build

- [ ] **Run full TypeScript check**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1
```
Expected: No errors. If errors appear, fix them per the compiler output.

- [ ] **Commit any final fixes**

```bash
git add -A
git commit -m "chore: fix build errors after Nemotron integration"
```
