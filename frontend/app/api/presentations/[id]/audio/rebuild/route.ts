import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { concatWavBuffers, isValidWav } from "@/lib/wav-utils"
import { listFiles, downloadFileAsBuffer, uploadFile, deleteFile } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"

/**
 * POST /api/presentations/[id]/audio/rebuild
 *
 * Rebuild combined.wav from per-slide WAVs and bump audio_version.
 * Called by the editor after all per-slide audio generation is complete.
 * This prevents race conditions where a viewer requests combined audio
 * while individual slides are still being generated.
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

  const slidesPrefix = `${user.id}/audio/${presentationId}/slides/`
  const combinedKey = `${user.id}/audio/${presentationId}/combined.wav`

  // List per-slide WAVs
  const allFiles = await listFiles(slidesPrefix)
  if (!allFiles.success || allFiles.data.length === 0) {
    return NextResponse.json({ error: "No slide audio files found" }, { status: 404 })
  }

  // Parse slide numbers and sort
  const slideFiles = allFiles.data
    .map((f) => {
      const key = f.Key ?? ""
      const name = key.replace(slidesPrefix, "")
      const match = name.match(/^slide-(\d+)\.wav$/)
      return match ? { number: parseInt(match[1], 10), key } : null
    })
    .filter(Boolean)
    .sort((a, b) => a!.number - b!.number) as { number: number; key: string }[]

  if (slideFiles.length === 0) {
    return NextResponse.json({ error: "No slide audio files found" }, { status: 404 })
  }

  // Read and concatenate all per-slide WAVs
  const wavBuffers: Buffer[] = []
  for (const sf of slideFiles) {
    const result = await downloadFileAsBuffer(sf.key)
    if (result.success && isValidWav(result.data)) {
      wavBuffers.push(result.data)
    } else {
      console.warn(`[rebuild] Skipping corrupt or missing slide ${sf.number}`)
    }
  }

  if (wavBuffers.length === 0) {
    return NextResponse.json({ error: "Failed to read slide audio files" }, { status: 500 })
  }

  const combined = concatWavBuffers(wavBuffers)

  // Write to a temp key first to avoid delete-before-write data loss.
  // If the R2 write succeeds, remove the old combined.wav and upload in its place.
  const tempKey = combinedKey.replace(".wav", "-rebuild.wav")
  const tempResult = await uploadFile(tempKey, combined, "audio/wav")
  if (!tempResult.success) {
    return NextResponse.json({ error: "Failed to save combined audio" }, { status: 500 })
  }

  // Delete old combined.wav
  await deleteFile(combinedKey)

  // Write to real key (buffer still in memory)
  const uploadResult = await uploadFile(combinedKey, combined, "audio/wav")
  if (!uploadResult.success) {
    console.error(`[rebuild] Failed to write final combined.wav — temp file preserved at ${tempKey}`)
    return NextResponse.json({ error: "Failed to save combined audio" }, { status: 500 })
  }

  // Clean up temp file
  await deleteFile(tempKey).catch(() => {})

  // Bump audio_version so viewers know to refresh
  try {
    const admin = createAdminClient()
    await admin.rpc("increment_audio_version", { p_presentation_id: presentationId })
  } catch (err) {
    console.error("[rebuild] Failed to bump audio_version:", err)
  }

  return NextResponse.json({
    data: {
      success: true,
      slideCount: wavBuffers.length,
      durationMs: 0, // caller can compute from audio metadata if needed
    },
  })
})
