import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createPresetVoiceSchema } from "@/lib/validations/voice"
import { checkPresetVoiceQuota, quotaBlockResponse } from "@/lib/quota"
import { withApiHandler } from "@/lib/api-handler"

export const GET = withApiHandler(async () => {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("voices")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("GET /api/voices:", error.message)
    return NextResponse.json({ error: "Failed to fetch voices" }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export const POST = withApiHandler(async (request: Request) => {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = createPresetVoiceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  // Check free tier preset voice quota
  const presetCheck = await checkPresetVoiceQuota(supabase, user.id)
  if (!presetCheck.allowed) {
    return quotaBlockResponse(presetCheck)
  }

  const { data, error } = await supabase
    .from("voices")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      type: "preset",
      preset_id: parsed.data.preset_id,
      control_instruction: parsed.data.control_instruction || null,
      sample_path: null,
      sample_duration_seconds: null,
      emotion_default: parsed.data.emotion_default,
    })
    .select()
    .single()

  if (error) {
    console.error("POST /api/voices:", error.message)
    return NextResponse.json({ error: "Failed to create voice" }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
