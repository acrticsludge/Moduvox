import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { submitWaitlistSchema } from "@/lib/validations/waitlist"
import { checkRateLimit } from "@/lib/rate-limiter"
import { withApiHandler } from "@/lib/api-handler"

export const POST = withApiHandler(async (request: Request) => {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate limit: 3 submissions per user per hour
  const { allowed, remaining, resetAt } = checkRateLimit(`waitlist:${user.id}`, 3, 3_600_000)
  if (!allowed) {
    return NextResponse.json({
      error: "Too many requests. Please try again later.",
      remaining,
      resetAt: new Date(resetAt).toISOString(),
    }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = submitWaitlistSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from("waitlist")
    .upsert(
      {
        user_id: user.id,
        email: user.email ?? "",
        interest: parsed.data.interest,
      },
      { onConflict: "user_id" },
    )
    .select()
    .single()

  if (error) {
    console.error("POST /api/waitlist:", error.message)
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 })
  }

  return NextResponse.json({ data: { id: data.id } }, { status: 201 })
})
