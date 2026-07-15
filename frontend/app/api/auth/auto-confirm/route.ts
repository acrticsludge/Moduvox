import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const { userId, email, password } = await request.json()
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Auto-confirm the user's email via admin API (bypasses Supabase email verification)
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
    })

    if (updateError) {
      console.error("[auto-confirm] Failed to confirm user:", updateError)
      return NextResponse.json({ error: "Failed to confirm user" }, { status: 500 })
    }

    return NextResponse.json({ data: { confirmed: true } })
  } catch (err) {
    console.error("[auto-confirm] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
