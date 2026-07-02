import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { concatWavBuffers, isValidWav } from "@/lib/wav-utils"

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

    const storageKey = `${userId}/audio/${presentationId}/combined.wav`

    // Check if combined.wav already exists in Supabase Storage
    const { data: existingFiles } = await admin.storage.from("presentation-files").list(`${userId}/audio/${presentationId}/`)
    const exists = existingFiles?.some((f) => f.name === "combined.wav")
    if (exists) {
      const { data: urlData } = await admin.storage.from("presentation-files").createSignedUrl(storageKey, 3600)
      if (urlData) {
        return NextResponse.json({ data: { audioUrl: urlData.signedUrl } })
      }
    }

    // Generate combined.wav from per-slide WAVs in Supabase Storage
    const slidesDir = `${userId}/audio/${presentationId}/slides/`
    const { data: allFiles, error: listError } = await admin.storage.from("presentation-files").list(slidesDir)

    if (listError || !allFiles || allFiles.length === 0) {
      return NextResponse.json({ error: "No audio found" }, { status: 404 })
    }

    const matched = allFiles
      .map((f) => {
        const m = f.name.match(/^slide-(\d+)\.wav$/)
        return m ? { number: parseInt(m[1], 10), name: f.name } : null
      })
      .filter(Boolean)
      .sort((a, b) => a!.number - b!.number)

    if (matched.length === 0) {
      return NextResponse.json({ error: "No slide audio files found" }, { status: 404 })
    }

    const wavBuffers: Buffer[] = []
    for (const sf of matched) {
      const { data } = await admin.storage.from("presentation-files").download(`${slidesDir}${sf!.name}`)
      if (data) {
        const buffer = Buffer.from(await data.arrayBuffer())
        if (isValidWav(buffer)) wavBuffers.push(buffer)
      }
    }

    if (wavBuffers.length === 0) {
      return NextResponse.json({ error: "Failed to read slide audio" }, { status: 500 })
    }

    const combined = concatWavBuffers(wavBuffers)

    // Upload combined.wav to Supabase Storage
    await admin.storage.from("presentation-files").upload(storageKey, combined, {
      contentType: "audio/wav",
      upsert: true,
    })

    const { data: urlData } = await admin.storage.from("presentation-files").createSignedUrl(storageKey, 3600)
    return NextResponse.json({
      data: {
        audioUrl: urlData?.signedUrl ?? null,
      },
    })
  } catch (err) {
    console.error("ensure audio:", err)
    return NextResponse.json({ error: "Failed to prepare audio" }, { status: 500 })
  }
}
