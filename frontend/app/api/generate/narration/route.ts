import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/lib/supabase/server"

type SlideInput = {
  number: number
  title: string
  bullets: string[]
}

// Simple in-memory rate limiter: { key: [timestamp, ...] }
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW = 60_000 // 1 minute
const RATE_LIMIT_MAX = 10        // 10 requests per minute per user

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(key) || []
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW)
  if (recent.length >= RATE_LIMIT_MAX) return false
  recent.push(now)
  rateLimitMap.set(key, recent)
  return true
}

export async function POST(request: Request) {
  try {
    // Auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limit per user
    if (!checkRateLimit(user.id)) {
      return NextResponse.json({
        error: "rate_limited",
        message: "You've hit the free tier limit. Add your own Gemini API key in Settings for higher limits.",
      }, { status: 429 })
    }

    const { slides, instructions, slideInstructions } = await request.json()

    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return NextResponse.json({ error: "Slides array is required" }, { status: 400 })
    }

    // Check for user's own Gemini key
    const { data: userData } = await supabase
      .from("users")
      .select("gemini_api_key")
      .eq("id", user.id)
      .single()

    const apiKey = userData?.gemini_api_key || process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "No Gemini API key configured" }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    const slideBlocks = slides.map(
      (s: SlideInput) =>
        `Slide ${s.number}:
Title: ${s.title}
Bullets:
${s.bullets.map((b: string) => `- ${b}`).join("\n")}
${slideInstructions?.[s.number] ? `Context: ${slideInstructions[s.number]}` : ""}`,
    )

    const prompt = `You are a professional voice-over narrator. Convert each slide into natural, conversational narration as if presenting to a live audience.

Rules:
- Speak naturally — don't read bullet points verbatim
- Vary sentence rhythm and tone between slides
- For slides with few words (likely image-heavy), describe what the slide conveys
- For thank-you/closing slides, use a warm wrap-up tone
- For data slides, explain the numbers conversationally
- Keep each narration to 2-4 sentences
- Never say "slide N says" — just speak the content
- Don't use markdown or bullet indicators

Respond with ONLY a valid JSON object where keys are slide numbers and values are narration strings. No other text.

${instructions ? `Global style guide: ${instructions}` : ""}

Slides:
${slideBlocks.join("\n\n")}`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Parse the JSON response
    const jsonStart = text.indexOf("{")
    const jsonEnd = text.lastIndexOf("}")
    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json({ error: "AI returned invalid format" }, { status: 502 })
    }
    const narrations = JSON.parse(text.slice(jsonStart, jsonEnd + 1))

    return NextResponse.json({ data: { narrations } })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("Narration generation failed:", msg)

    // Detect rate limit from Gemini itself
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("rate")) {
      return NextResponse.json({
        error: "rate_limited",
        message: "Gemini API rate limit reached. Add your own API key in Settings to continue.",
      }, { status: 429 })
    }

    return NextResponse.json({ error: "Failed to generate narrations" }, { status: 500 })
  }
}
