import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { concatWavBuffers, isValidWav } from "@/lib/wav-utils"
import { listFiles, downloadFileAsBuffer, uploadFile, createDownloadUrl } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"

export const GET = withApiHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id: presentationId } = await params
    const { searchParams } = new URL(request.url)
    const admin = createAdminClient()

    // Auth via ?session=<token> for public viewers
    const sessionToken = searchParams.get("session")
    let userId: string | null = null

    if (sessionToken) {
      const { data: viewer } = await admin
        .from("viewers")
        .select("id, email_verified")
        .eq("session_token", sessionToken)
        .eq("presentation_id", presentationId)
        .single()
      if (!viewer || !viewer.email_verified) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      const { data: presentation } = await admin
        .from("presentations")
        .select("user_id")
        .eq("id", presentationId)
        .single()
      if (!presentation) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      userId = presentation.user_id
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const audioPrefix = `${userId}/audio/${presentationId}/`
    const combinedKey = `${audioPrefix}combined.wav`

    // Check if combined.wav already exists in R2
    const existingFiles = await listFiles(audioPrefix)
    const exists = existingFiles.success && existingFiles.data.some((f) => f.Key === combinedKey)
    if (exists) {
      const audioUrl = await createDownloadUrl(combinedKey, 3600)
      if (audioUrl) {
        return NextResponse.json({ data: { audioUrl } })
      }
    }

    // Generate combined.wav from per-slide WAVs in R2
    const slidesPrefix = `${audioPrefix}slides/`
    const allFiles = await listFiles(slidesPrefix)

    if (!allFiles.success || allFiles.data.length === 0) {
      return NextResponse.json({ error: "No audio found" }, { status: 404 })
    }

    const matched = allFiles.data
      .map((f) => {
        const key = f.Key ?? ""
        const name = key.replace(slidesPrefix, "")
        const m = name.match(/^slide-(\d+)\.wav$/)
        return m ? { number: parseInt(m[1], 10), key } : null
      })
      .filter(Boolean)
      .sort((a, b) => a!.number - b!.number)

    if (matched.length === 0) {
      return NextResponse.json({ error: "No slide audio files found" }, { status: 404 })
    }

    const wavBuffers: Buffer[] = []
    for (const sf of matched) {
      const result = await downloadFileAsBuffer(sf!.key)
      if (result.success && isValidWav(result.data)) {
        wavBuffers.push(result.data)
      }
    }

    if (wavBuffers.length === 0) {
      return NextResponse.json({ error: "Failed to read slide audio" }, { status: 500 })
    }

    const combined = concatWavBuffers(wavBuffers)

    // Upload combined.wav to R2
    await uploadFile(combinedKey, combined, "audio/wav")

    const audioUrl = await createDownloadUrl(combinedKey, 3600)
    return NextResponse.json({
      data: {
        audioUrl: audioUrl ?? null,
      },
    })
  } catch (err) {
    console.error("ensure audio:", err)
    return NextResponse.json({ error: "Failed to prepare audio" }, { status: 500 })
  }
})