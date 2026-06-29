import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

type SlideInput = {
  number: number
  title: string
  bullets: string[]
}

export async function POST(request: Request) {
  try {
    const { slides, instructions, slideInstructions } = await request.json()

    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return NextResponse.json({ error: "Slides array is required" }, { status: 400 })
    }

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
  } catch (error) {
    console.error("Narration generation failed:", error)
    return NextResponse.json({ error: "Failed to generate narrations" }, { status: 500 })
  }
}
