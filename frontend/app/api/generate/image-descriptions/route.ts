import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/lib/supabase/server"
import { withApiHandler } from "@/lib/api-handler"
import { checkDbRateLimit } from "@/lib/rate-limiter"
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
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB per image after base64 decode

// ── Constants ────────────────────────────────────────────────────

const NEMOTRON_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
const NEMOTRON_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"

const NEMOTRON_TIMEOUT_MS = 120_000
const NEMOTRON_RETRY_TIMEOUT_MS = 60_000
const GEMINI_TIMEOUT_MS = 25_000

const VALID_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])

const IMAGE_PROMPT =
  "Examine this image from a business presentation slide. " +
  "Provide a description in this exact format:\n" +
  "[Visual type]: [description]. [Key data or insight if applicable].\n\n" +
  "Visual types: Chart, Diagram, Screenshot, Photo, Icon, Table, Logo, Text-only, or Mixed-content.\n" +
  "Be specific about numbers, labels, and trends if present. Keep it 2-3 sentences. " +
  "If no significant visual content, say 'No significant visual content.'"

const GEMINI_PROMPT =
  "Examine these images from a business presentation slide. For each image, provide a description in this format:\n" +
  "[Visual type]: [description]. [Key data or insight if applicable].\n\n" +
  "Visual types: Chart, Diagram, Screenshot, Photo, Icon, Table, Logo, Text-only, or Mixed-content.\n" +
  "Be specific about numbers, labels, and trends if present. Keep each description concise (2-3 sentences). " +
  "Number each description. " +
  "If an image has no significant visual content, say 'No significant visual content.'"

// ── Type definitions ─────────────────────────────────────────────

type ImageResult = { index: number; description: string; error?: string }

interface ResolvedNimKey {
  key: string
  isUserKey: boolean // false = project key (needs token bucket)
}

// ── Image validation ────────────────────────────────────────────

/**
 * Validate an image before sending to AI. Returns an error string or null if valid.
 */
function validateImage(mimeType: string, data: string): string | null {
  if (!VALID_MIME_TYPES.has(mimeType)) {
    return `Unsupported image format: ${mimeType}. Accepted: PNG, JPEG, WebP.`
  }

  // Verify base64 can be decoded and is not corrupt
  let decodedBuffer: Buffer
  try {
    decodedBuffer = Buffer.from(data, "base64")
  } catch {
    return "Corrupt image data: invalid base64 encoding."
  }

  if (decodedBuffer.length === 0 && data.length > 0) {
    return "Corrupt image data: base64 decoded to empty buffer."
  }

  // Check decoded size vs expected size to catch truncation
  const expectedBytes = Math.ceil(data.length * 0.75)
  if (decodedBuffer.length < expectedBytes - 8) {
    return `Image data appears truncated (decoded ${decodedBuffer.length} bytes, expected ~${expectedBytes}).`
  }

  if (decodedBuffer.length > MAX_IMAGE_SIZE_BYTES) {
    return `Image too large (${(decodedBuffer.length / 1024 / 1024).toFixed(1)}MB). Maximum is 5MB.`
  }

  return null
}

// ── Description post-processor ──────────────────────────────────

/**
 * Normalize AI-generated description for consistent display.
 */
function formatDescription(desc: string): string {
  let text = desc.trim()

  if (!text) return ""

  // Strip common AI prefixes
  text = text.replace(/^(here is|this image shows|the image depicts|the screenshot shows|in this image)\s*/i, "")

  // Capitalize first letter
  text = text.charAt(0).toUpperCase() + text.slice(1)

  // Ensure period at end
  if (!/[.!?]$/.test(text)) text += "."

  return text
}

// ── Validate description format ─────────────────────────────────

/**
 * Validate that AI output follows the [Visual type]: format requested in the prompt.
 * If missing, log a warning and prepend "Image: " to maintain structure.
 */
function validateDescriptionFormat(desc: string): string {
  if (!desc) return desc

  if (/^no significant visual content\.?$/i.test(desc)) {
    return desc
  }

  const VISUAL_TYPES = /^(Chart|Diagram|Screenshot|Photo|Icon|Table|Logo|Text-only|Mixed-content|Illustration|Graph|Image):/i
  if (!VISUAL_TYPES.test(desc)) {
    console.warn(`[image-descriptions] Description missing visual type marker, prepending "Image: ". Raw: "${desc.slice(0, 60)}..."`)
    return `Image: ${desc}`
  }

  return desc
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
  if (!userData?.nim_api_key) {
    if (process.env.NVIDIA_NIM_KEY) {
      return { key: process.env.NVIDIA_NIM_KEY, isUserKey: false }
    }
    return null
  }
  try {
    return { key: decrypt(userData.nim_api_key), isUserKey: true }
  } catch {
    return { key: userData.nim_api_key, isUserKey: true }
  }
}

function resolveGeminiKey(userData: { gemini_api_key?: string | null } | null): string | null {
  if (!userData?.gemini_api_key) {
    return process.env.GEMINI_API_KEY ?? null
  }
  try {
    return decrypt(userData.gemini_api_key)
  } catch {
    return userData.gemini_api_key
  }
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
  const rateCheck = await checkDbRateLimit(`image-desc:${user.id}`, 10, 60 * 1000)
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
      // ── Validate image before sending to AI ──
      const validationError = validateImage(image.mimeType, image.data)
      if (validationError) {
        slideDescriptions.push({ index: image.index, description: "", error: validationError })
        continue
      }

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

      // Format description if successful
      if (!result.error && result.description) {
        result.description = validateDescriptionFormat(formatDescription(result.description))
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
        if (geminiResult.description) {
          geminiResult.description = validateDescriptionFormat(formatDescription(geminiResult.description))
        }
        slideDescriptions.push(geminiResult)
      } else {
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
    if (!acquireNemotronToken()) {
      console.warn("[image-descriptions] NIM project key rate limit reached")
      return { index: image.index, description: "", error: "RATE_LIMITED" }
    }

    return await analyzeOneImageWithNemotron(image, projectNimKey, NEMOTRON_TIMEOUT_MS)
  }

  // No NIM key available
  return { index: image.index, description: "", error: "No NIM key available" }
}
