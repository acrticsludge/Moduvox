import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { withApiHandler } from "@/lib/api-handler"
import { z } from "zod"
import { sha256Hex } from "@/lib/crypto"

const saveSchema = z.object({
  narration_text: z.string(),
  voice_id: z.string().uuid().optional(),
})

export const POST = withApiHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string; slide: string }> }
) => {
  const supabase = await createClient()
  const { id: presentationId, slide } = await params
  const slideNumber = parseInt(slide, 10)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: presentation } = await supabase
    .from("presentations")
    .select("id, editor_state")
    .eq("id", presentationId)
    .eq("user_id", user.id)
    .single()

  if (!presentation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json()
  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const { narration_text, voice_id } = parsed.data

  // Get voice metadata if voice_id provided
  let voiceType = null, voiceName = null, controlInstruction = null
  if (voice_id) {
    const { data: voice } = await supabase
      .from("voices")
      .select("type, name, control_instruction")
      .eq("id", voice_id)
      .eq("user_id", user.id)
      .single()
    if (voice) {
      voiceType = voice.type
      voiceName = voice.name
      controlInstruction = voice.control_instruction
    }
  }

  // Get ultimate_mode from editor_state
  const editorState = presentation.editor_state as Record<string, unknown> | null
  const ultimateMode = (editorState?.ultimateMode as boolean) ?? false

  const contentHash = await sha256Hex(narration_text)

  // Check if identical version already exists
  const { data: existing } = await supabase
    .from("narration_versions")
    .select("id")
    .eq("presentation_id", presentationId)
    .eq("slide_number", slideNumber)
    .eq("content_hash", contentHash)
    .single()

  if (existing) {
    return NextResponse.json({ data: existing })
  }

  // Insert new version
  const { data: version, error } = await supabase
    .from("narration_versions")
    .insert({
      presentation_id: presentationId,
      slide_number: slideNumber,
      content_hash: contentHash,
      narration_text: narration_text,
      voice_id: voice_id ?? null,
      voice_type: voiceType,
      voice_name: voiceName,
      control_instruction: controlInstruction,
      ultimate_mode: ultimateMode,
      status: "draft",
      generated_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error("Save narration version:", error.message)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }

  return NextResponse.json({ data: version })
})