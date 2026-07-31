import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { withApiHandler } from "@/lib/api-handler"

/**
 * POST /api/presentations/[id]/audio/rebuild
 *
 * Bump audio_version and delegate the slow combined-WAV rebuild to the
 * Render worker.  On Vercel Hobby (10s timeout) the R2 download+concat+upload
 * is guaranteed to time out, so we fire-and-forget to the worker which has
 * no timeout constraint.
 */
export const POST = withApiHandler(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const supabase = await createClient()
  const { id: presentationId } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get slide count from editor_state for the worker
  const { data: presentation, error: presError } = await supabase
    .from("presentations")
    .select("editor_state, slide_count")
    .eq("id", presentationId)
    .single()

  if (presError || !presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  const slideCount = presentation.slide_count ?? 0
  if (slideCount === 0) {
    return NextResponse.json({ error: "No slides to rebuild" }, { status: 400 })
  }

  // Bump audio_version immediately so viewers know an update is coming
  try {
    const admin = createAdminClient()
    await admin.rpc("increment_audio_version", { p_presentation_id: presentationId })
  } catch (err) {
    console.error("[rebuild] Failed to bump audio_version:", err)
  }

  // Fire-and-forget to worker for the heavy R2 I/O
  const workerUrl = process.env.RENDER_WORKER_URL
  const workerKey = process.env.RENDER_WORKER_API_KEY
  if (workerUrl && workerKey) {
    const workerPayload = {
      userId: user.id,
      presentationId,
      slideCount,
    }

    fetch(`${workerUrl}/rebuild-audio`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${workerKey}`,
      },
      body: JSON.stringify(workerPayload),
    }).catch((err) => {
      console.error("[rebuild] Worker fire-and-forget failed:", err)
    })
  } else {
    console.warn("[rebuild] RENDER_WORKER_URL or RENDER_WORKER_API_KEY not set — skipping worker rebuild")
  }

  return NextResponse.json({
    data: {
      queued: true,
      slideCount,
    },
  }, { status: 202 })
})
