import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/lib/supabase/server"
import { withApiHandler } from "@/lib/api-handler"
import { checkRateLimit } from "@/lib/rate-limiter"

const MAX_IMAGES_PER_REQUEST = 20

export const POST = withApiHandler(async (request: Request) => {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    presentationId?: string
    slides?: { number: number; images: { index: number; mimeType: string; data: string }[] }[]
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { presentationId, slides } = body
  if (!presentationId || !slides || slides.length === 0) {
    return NextResponse.json({ error: "presentationId and slides are required" }, { status: 400 })
  }

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

  for (const slide of slides) {
    const slideDescriptions: { index: number; description: string; error?: string }[] = []

    for (const image of slide.images) {
      try {
        const prompt =
          "Describe this image from a business presentation slide. " +
          "What is shown? Read any visible text, identify chart types or diagrams, " +
          "explain data trends if applicable, and state the purpose of the visual. " +
          "Keep your description concise (2-3 sentences). " +
          'If the image has no significant visual content, say "No significant visual content detected."'

        const result = await model.generateContent([
          { text: prompt },
          {
            inlineData: {
              mimeType: image.mimeType,
              data: image.data,
            },
          },
        ])

        const description = result.response.text()?.trim() || "No description available"
        slideDescriptions.push({ index: image.index, description })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[image-descriptions] Slide ${slide.number}, image ${image.index}: ${msg}`)
        slideDescriptions.push({
          index: image.index,
          description: "",
          error: "Analysis failed",
        })
      }
    }

    resultSlides.push({ number: slide.number, images: slideDescriptions })
  }

  return NextResponse.json({
    data: { slides: resultSlides },
  })
})
