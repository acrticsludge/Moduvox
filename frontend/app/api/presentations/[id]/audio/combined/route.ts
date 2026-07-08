import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { concatWavBuffers, isValidWav } from "@/lib/wav-utils"
import { listFiles, downloadFileAsBuffer, uploadFile, createDownloadUrl } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"

async function getUserId(
  request: Request,
  presentationId: string,
): Promise<{ userId: string | null; error?: NextResponse }> {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const { data: { user } } = await supabase.auth.getUser()

  const sessionToken = searchParams.get("session")
  let userId: string | null = user?.id ?? null

  if (!user && sessionToken) {
    const admin = createAdminClient()
    const { data: viewer } = await admin
      .from("viewers")
      .select("id, email_verified")
      .eq("session_token", sessionToken)
      .eq("presentation_id", presentationId)
      .single()

    if (!viewer || !viewer.email_verified) {
      return { userId: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
    }

    const { data: presentation } = await admin
      .from("presentations")
      .select("user_id")
      .eq("id", presentationId)
      .single()

    if (!presentation) {
      return { userId: null, error: NextResponse.json({ error: "Presentation not found" }, { status: 404 }) }
    }
    userId = presentation.user_id
  } else if (!user) {
    return { userId: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  return { userId }
}

function serveWav(data: Buffer, rangeHeader: string | null, mtime: string) {
  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : data.length - 1
    const chunk = new Uint8Array(data.subarray(start, end + 1))
    return new NextResponse(chunk, {
      status: 206,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Range": `bytes ${start}-${end}/${data.length}`,
        "Content-Length": String(chunk.length),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=300",
        "Last-Modified": mtime,
      },
    })
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "audio/wav",
      "Content-Length": String(data.length),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=300",
      "Last-Modified": mtime,
    },
  })
}

export const GET = withApiHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id: presentationId } = await params

    // Get userId from auth or session token
    const { userId, error } = await getUserId(request, presentationId)
    if (error) return error

    const audioPrefix = `${userId}/audio/${presentationId}/`
    const combinedKey = `${audioPrefix}combined.wav`

    // Check if cached combined.wav exists in R2
    const existingFiles = await listFiles(audioPrefix)
    const hasCached = existingFiles.success && existingFiles.data.some((f) => f.Key === combinedKey)

    if (hasCached) {
      const audioUrl = await createDownloadUrl(combinedKey, 3600)
      if (audioUrl) {
        return NextResponse.redirect(audioUrl)
      }
    }

    // No cached combined file — generate from per-slide WAVs
    const slidesPrefix = `${audioPrefix}slides/`
    const allFiles = await listFiles(slidesPrefix)

    if (!allFiles.success || allFiles.data.length === 0) {
      return NextResponse.json({ error: "No audio found" }, { status: 404 })
    }

    const slideFiles = allFiles.data
      .map((f) => {
        const key = f.Key ?? ""
        const name = key.replace(slidesPrefix, "")
        const match = name.match(/^slide-(\d+)\.wav$/)
        return match ? { number: parseInt(match[1], 10), key } : null
      })
      .filter(Boolean)
      .sort((a, b) => a!.number - b!.number)

    if (slideFiles.length === 0) {
      return NextResponse.json({ error: "No slide audio files found" }, { status: 404 })
    }

    // Read and concatenate all per-slide WAVs
    const wavBuffers: Buffer[] = []
    for (const sf of slideFiles) {
      const result = await downloadFileAsBuffer(sf!.key)
      if (result.success && isValidWav(result.data)) {
        wavBuffers.push(result.data)
      }
    }

    if (wavBuffers.length === 0) {
      return NextResponse.json({ error: "Failed to read slide audio files" }, { status: 500 })
    }

    const combined = concatWavBuffers(wavBuffers)

    // Store combined audio in R2 for future requests (fire-and-forget)
    uploadFile(combinedKey, combined, "audio/wav").catch(() => {})

    const rangeHeader = request.headers.get("range")
    return serveWav(combined, rangeHeader, new Date().toISOString())
  } catch (err) {
    console.error("GET /api/presentations/[id]/audio/combined:", err)
    return NextResponse.json({ error: "Failed to load audio" }, { status: 500 })
  }
}
