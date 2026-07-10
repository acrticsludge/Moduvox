import { NextResponse } from "next/server"
import { z } from "zod"
import { withApiHandler } from "@/lib/api-handler"

const verifySchema = z.object({
  token: z.string().min(1),
})

export const POST = withApiHandler(async (request: Request) => {
  if (!process.env.RECAPTCHA_SECRET_KEY) {
    // No key configured — allow in dev mode
    return NextResponse.json({ data: { success: true, score: 1 } })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = verifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing token" }, { status: 422 })
  }

  const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: process.env.RECAPTCHA_SECRET_KEY,
      response: parsed.data.token,
    }),
  })

  const verifyJson = await verifyRes.json()

  if (!verifyJson.success) {
    console.error("reCAPTCHA verification failed:", verifyJson)
    return NextResponse.json({ error: "Security check failed" }, { status: 403 })
  }

  if (typeof verifyJson.score === "number" && verifyJson.score < 0.5) {
    console.error("reCAPTCHA low score:", verifyJson.score)
    return NextResponse.json({ error: "Security check failed" }, { status: 403 })
  }

  return NextResponse.json({ data: { success: true, score: verifyJson.score } })
})
