import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { updateShareSettingsSchema } from "@/lib/validations/share"
import bcrypt from "bcryptjs"
import { withApiHandler } from "@/lib/api-handler"

export const GET = withApiHandler(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const supabase = await createClient()
  const { id: presentationId } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: presentation } = await supabase
    .from("presentations")
    .select("share_token, password_hash, expires_at, email_gate_enabled")
    .eq("id", presentationId)
    .eq("user_id", user.id)
    .single()

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  const origin = new URL(_request.url).origin

  return NextResponse.json({
    data: {
      share_token: presentation.share_token,
      share_url: `${origin}/view/${presentation.share_token}`,
      has_password: !!presentation.password_hash,
      expires_at: presentation.expires_at,
      email_gate_enabled: presentation.email_gate_enabled,
    },
  })
}

export const PATCH = withApiHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const supabase = await createClient()
  const { id: presentationId } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: existing } = await supabase
    .from("presentations")
    .select("id")
    .eq("id", presentationId)
    .eq("user_id", user.id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = updateShareSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (parsed.data.email_gate_enabled !== undefined) {
    updates.email_gate_enabled = parsed.data.email_gate_enabled
  }

  if (parsed.data.password !== undefined) {
    updates.password_hash = parsed.data.password === null
      ? null
      : await bcrypt.hash(parsed.data.password, 12)
  }

  if (parsed.data.expires_at !== undefined) {
    updates.expires_at = parsed.data.expires_at
  }

  const { data, error } = await supabase
    .from("presentations")
    .update(updates)
    .eq("id", presentationId)
    .eq("user_id", user.id)
    .select("share_token, password_hash, expires_at, email_gate_enabled")
    .single()

  if (error) {
    console.error("PATCH /api/presentations/[id]/share:", error.message)
    return NextResponse.json({ error: "Failed to update share settings" }, { status: 500 })
  }

  const origin = new URL(request.url).origin

  return NextResponse.json({
    data: {
      share_token: data.share_token,
      share_url: `${origin}/view/${data.share_token}`,
      has_password: !!data.password_hash,
      expires_at: data.expires_at,
      email_gate_enabled: data.email_gate_enabled,
    },
  })
})