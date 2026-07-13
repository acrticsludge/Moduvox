// scripts/backfill-narration-versions.ts
// Run with: npx tsx scripts/backfill-narration-versions.ts
import { createClient } from "@supabase/supabase-js"
import { sha256Hex } from "../frontend/lib/crypto"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function backfill() {
  console.log("Starting narration versions backfill...")

  const { data: presentations, error } = await supabase
    .from("presentations")
    .select("id, user_id, editor_state, status, updated_at")

  if (error) {
    console.error("Failed to fetch presentations:", error)
    return
  }

  console.log(`Found ${presentations?.length ?? 0} presentations`)

  for (const pres of presentations ?? []) {
    const editorState = pres.editor_state as {
      narrations?: Record<number, string>
      selectedVoiceId?: string
      controlInstructions?: string
      ultimateMode?: boolean
    } | null

    if (!editorState?.narrations) {
      console.log(`  Skipping ${pres.id}: no narrations in editor_state`)
      continue
    }

    const voiceId = editorState.selectedVoiceId
    let voiceType = null, voiceName = null, controlInstruction = null
    if (voiceId) {
      const { data: voice } = await supabase
        .from("voices")
        .select("type, name, control_instruction")
        .eq("id", voiceId)
        .single()
      if (voice) {
        voiceType = voice.type
        voiceName = voice.name
        controlInstruction = voice.control_instruction
      }
    }

    const status = pres.status === "ready" ? "published" : "draft"

    for (const [slideNumStr, text] of Object.entries(editorState.narrations)) {
      const slideNumber = parseInt(slideNumStr, 10)
      const contentHash = await sha256Hex(text)

      const { error: upsertError } = await supabase.from("narration_versions").upsert({
        presentation_id: pres.id,
        slide_number: slideNumber,
        content_hash: contentHash,
        narration_text: text,
        voice_id: voiceId ?? null,
        voice_type: voiceType,
        voice_name: voiceName,
        control_instruction: controlInstruction,
        ultimate_mode: editorState.ultimateMode ?? false,
        status,
        generated_by: pres.user_id,
        generated_at: pres.updated_at,
        published_at: status === "published" ? pres.updated_at : null,
      }, { onConflict: "presentation_id,slide_number,generated_at" })

      if (upsertError) {
        console.error(`  Error backfilling ${pres.id} slide ${slideNumber}:`, upsertError.message)
      }
    }

    console.log(`  Backfilled ${pres.id}: ${Object.keys(editorState.narrations).length} slides (${status})`)
  }

  console.log("Backfill complete!")
}

backfill().catch(console.error)