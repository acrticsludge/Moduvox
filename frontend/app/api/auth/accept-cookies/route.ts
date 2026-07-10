import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { withApiHandler } from "@/lib/api-handler"

export const POST = withApiHandler(async (request: Request) => {
  const admin = createAdminClient()

  const { data: { user } } = await admin.auth.getUser(
    request.headers.get("Authorization")?.replace("Bearer ", "") ?? "",
  )

  if (!user) {
    // Not logged in — nothing to persist server-side
    return NextResponse.json({ data: { accepted: true } })
  }

  await admin
    .from("users")
    .update({ cookies_accepted_at: new Date().toISOString() })
    .eq("id", user.id)

  return NextResponse.json({ data: { accepted: true } })
})
