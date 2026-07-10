import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { withApiHandler } from "@/lib/api-handler"

export const POST = withApiHandler(async (request: Request) => {
  const admin = createAdminClient()

  const { data: { user } } = await admin.auth.getUser(
    request.headers.get("Authorization")?.replace("Bearer ", "") ?? "",
  )

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { error } = await admin
    .from("users")
    .update({
      terms_accepted_at: new Date().toISOString(),
      tos_version: "1.0",
    })
    .eq("id", user.id)

  if (error) {
    console.error("Failed to record terms acceptance:", error.message)
    return NextResponse.json({ error: "Failed to record acceptance" }, { status: 500 })
  }

  return NextResponse.json({ data: { accepted: true } })
})
