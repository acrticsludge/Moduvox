import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { deleteFile, createDownloadUrl, purgePrefix } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"
import { validateUuid } from "@/lib/validate-uuid"

/** Return a presigned download URL for the original PPTX file. */
export const GET = withApiHandler(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const supabase = await createClient()
  const { id: presentationId } = await params
  const validation = validateUuid(presentationId, "presentation id")
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: presentation } = await supabase
    .from("presentations")
    .select("id")
    .eq("id", presentationId)
    .eq("user_id", user.id)
    .single()

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  const filePath = `${user.id}/${presentationId}.pptx`
  const url = await createDownloadUrl(filePath, 120)
  if (!url) {
    return NextResponse.json({ error: "PPTX file not found in storage" }, { status: 404 })
  }
  return NextResponse.json({ data: { url } })
})

export const DELETE = withApiHandler(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const supabase = await createClient()
  const { id: presentationId } = await params
  const validation = validateUuid(presentationId, "presentation id")
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify ownership
  const { data: presentation } = await supabase
    .from("presentations")
    .select("id")
    .eq("id", presentationId)
    .eq("user_id", user.id)
    .single()

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  // Remove PPTX from storage
  const filePath = `${user.id}/${presentationId}.pptx`
  const pptxDelete = await deleteFile(filePath)
  if (!pptxDelete.success) {
    console.error(`[file] Failed to delete PPTX ${filePath}: ${pptxDelete.error}`)
  }

  // Clean up all per-slide PDFs, audio files, and parsed images from R2.
  // Each prefix is purged with result checking — a silent failure here leaves
  // stale files that can resurrect the old deck after a re-upload (old + new).
  const prefixes = [
    `${user.id}/pdf/${presentationId}/`,
    `${user.id}/audio/${presentationId}/`,
    `${user.id}/parsed-images/${presentationId}/`,
  ]
  for (const prefix of prefixes) {
    const { failed } = await purgePrefix(prefix)
    if (failed.length > 0) {
      console.error(`[file] Failed to clean up prefix ${prefix}:`, failed)
    }
  }

  // Reset presentation: clear editor_state, reset status to draft
  const { error: updateError } = await supabase
    .from("presentations")
    .update({
      status: "draft",
      editor_state: {},
      slide_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", presentationId)
    .eq("user_id", user.id)

  if (updateError) {
    console.error("Failed to reset presentation:", updateError.message)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }

  return NextResponse.json({ data: { removed: true } })
})