import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/lib/supabase/server"
import { withApiHandler } from "@/lib/api-handler"
import { checkRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"

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

export const POST = withApiHandler(async (request: Request) => {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", fields: parsed.error.flatten().fieldErrors }, { status: 422 })
  }
  const { presentationId, slides } = parsed.data

  // Verify the user owns this presentation
  const { data: presentation } = await supabase
    .from("presentations")
    .select("id")
    .eq("id", presentationId)
    .eq("user_id", user.id)
    .single()

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  // Rate limit: 10 requests per user per minute
  const ipLimit = checkRateLimit(`image-desc:${user.id}`, 10, 60 * 1000)
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 })
  }

  // Count total images and enforce cap
  const totalImages = slides.reduce((sum, s) => sum + s.images.length, 0)
  if (totalImages > MAX_IMAGES_PER_REQUEST) {
    return NextResponse.json({
      error: `Too many images (${totalImages}). Maximum is ${MAX_IMAGES_PER_REQUEST} per request.`,
    }, { status: 422 })
  }

  // Get API key
  const { data: userData } = await supabase
    .from("users")
    .select("gemini_api_key")
    .eq("id", user.id)
    .single()

  const apiKey = userData?.gemini_api_key || process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 })
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

  const resultSlides: {
    number: number
    images: { index: number; description: string; error?: string }[]
  }[] = []

  const BATCH_SIZE = 5
  const BATCH_TIMEOUT_MS = 25000

  for (const slide of slides) {
    const slideDescriptions: { index: number; description: string; error?: string }[] = []

    for (let i = 0; i < slide.images.length; i += BATCH_SIZE) {
      const batch = slide.images.slice(i, i + BATCH_SIZE)

      try {
        const contents = [
          { text: "Examine these images from a business presentation slide. For each image, describe what is shown, read any visible text, identify chart types or diagrams, explain data trends if applicable, and state the purpose of the visual. Keep each description concise (2-3 sentences). Number each description. If an image has no significant visual content, say 'No significant visual content detected.'" },
          ...batch.map(img => ({
            inlineData: { mimeType: img.mimeType, data: img.data }
          }))
        ]

        const result = await Promise.race([
          model.generateContent(contents),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Batch timed out after 25s")), BATCH_TIMEOUT_MS)
          ),
        ])

        const text = result.response.text()?.trim() || ""
        const lines = text.split("\n").filter(l => l.trim())
        batch.forEach((img, batchIdx) => {
          const desc = lines[batchIdx] || "No description available"
          const cleanDesc = desc.replace(/^\d+[\.\)]\s*/, "").trim()
          slideDescriptions.push({ index: img.index, description: cleanDesc })
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[image-descriptions] Slide ${slide.number}, batch ${Math.floor(i / BATCH_SIZE)}: ${msg}`)
        batch.forEach(img => {
          slideDescriptions.push({ index: img.index, description: "", error: "Analysis failed" })
        })
      }
    }

    resultSlides.push({ number: slide.number, images: slideDescriptions })
  }

  return NextResponse.json({
    data: { slides: resultSlides },
  })
})
