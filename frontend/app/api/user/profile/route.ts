import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { updateProfileSchema } from "@/lib/validations/user"

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const { error } = await supabase
    .from("users")
    .update({ name: parsed.data.name, updated_at: new Date().toISOString() })
    .eq("id", user.id)

  if (error) {
    console.error("PATCH /api/user/profile:", error.message)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }

  return NextResponse.json({ data: { name: parsed.data.name } })
}
