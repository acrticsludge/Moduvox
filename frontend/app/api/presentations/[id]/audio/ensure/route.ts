import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { concatWavBuffers, isValidWav } from "@/lib/wav-utils"
import { downloadFile, listFiles, fileExists, uploadFile, createSignedUrl } from "@/lib/r2"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const r2Key = `audio/${userId}/${presentationId}/combined.wav`

    // Check if combined.wav already exists in R2
    const exists = await fileExists(r2Key)
    if (exists) {
      const url = await createSignedUrl(r2Key)
      if (url) {
        return NextResponse.json({ data: { audioUrl: url } })
      }
    }

    // Generate combined.wav from per-slide WAVs in R2
    const slidesPrefix = `audio/${userId}/${presentationId}/slides/`
    const allFiles = await listFiles(slidesPrefix)

    if (allFiles.length === 0) {
      return NextResponse.json({ error: "No audio found" }, { status: 404 })
    }

    const matched = allFiles
      .map((f) => {
        const relativeName = f.name.replace(slidesPrefix, "")
        const m = relativeName.match(/^slide-(\d+)\.wav$/)
        return m ? { number: parseInt(m[1], 10), key: f.name } : null
      })
      .filter(Boolean)
      .sort((a, b) => a!.number - b!.number)

    if (matched.length === 0) {
      return NextResponse.json({ error: "No slide audio files found" }, { status: 404 })
    }

    const wavBuffers: Buffer[] = []
    for (const sf of matched) {
      const data = await downloadFile(sf!.key)
      if (data && isValidWav(data)) wavBuffers.push(data)
    }

    if (wavBuffers.length === 0) {
      return NextResponse.json({ error: "Failed to read slide audio" }, { status: 500 })
    }

    const combined = concatWavBuffers(wavBuffers)

    // Upload to R2 instead of Supabase Storage
    await uploadFile(r2Key, combined, "audio/wav")

    const url = await createSignedUrl(r2Key)
    return NextResponse.json({
      data: {
        audioUrl: url,
      },
    })
  } catch (err) {
    console.error("ensure audio:", err)
    return NextResponse.json({ error: "Failed to prepare audio" }, { status: 500 })
  }
}
