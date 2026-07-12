import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"
import { WelcomeEmail } from "@/emails/welcome"
import { checkRateLimit } from "@/lib/rate-limiter"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://moduvox.pulsemonitor.dev"

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    // Rate limit: 1 welcome email per user ever
    const userLimit = checkRateLimit(`welcome:${userId}`, 1, 365 * 24 * 60 * 60 * 1000)
    if (!userLimit.allowed) {
      return NextResponse.json({ data: { sent: true, skipped: true } })
    }

    // Per-IP rate limit: 5 requests per hour
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown"
    const ipLimit = checkRateLimit(`welcome-ip:${ip}`, 5, 60 * 60 * 1000)
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const supabase = createAdminClient()
    const { data: user, error } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", userId)
      .single()

    if (error || !user) {
      console.error("[send-welcome] User not found:", userId)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const dashboardUrl = `${SITE_URL}/dashboard`

    const result = await sendEmail({
      to: user.email,
      subject: `Welcome to Moduvox, ${user.name}!`,
      auditType: "welcome",
      auditUserId: userId,
      template: <WelcomeEmail userName={user.name} dashboardUrl={dashboardUrl} />,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ data: { sent: true } })
  } catch (err) {
    console.error("[send-welcome] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
