import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { concatWavBuffers, isValidWav } from "@/lib/wav-utils"

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: presentationId } = await params

    // Get userId from auth or session token
    const { userId, error } = await getUserId(request, presentationId)
    if (error) return error

    const admin = createAdminClient()
    const combinedPath = `${userId}/audio/${presentationId}/combined.wav`

    // Check if cached combined.wav exists in Supabase Storage
    const { data: existingFiles } = await admin.storage.from("presentation-files").list(`${userId}/audio/${presentationId}/`)
    const hasCached = existingFiles?.some((f) => f.name === "combined.wav")

    if (hasCached) {
      const { data: urlData } = await admin.storage.from("presentation-files").createSignedUrl(combinedPath, 3600)
      if (urlData) {
        return NextResponse.redirect(urlData.signedUrl)
      }
    }

    // No cached combined file — generate from per-slide WAVs
    const slidesPath = `${userId}/audio/${presentationId}/slides/`
    const { data: allFiles, error: listError } = await admin.storage.from("presentation-files").list(slidesPath)

    if (listError || !allFiles || allFiles.length === 0) {
      return NextResponse.json({ error: "No audio found" }, { status: 404 })
    }

    const slideFiles = allFiles
      .map((f) => {
        const match = f.name.match(/^slide-(\d+)\.wav$/)
        return match ? { number: parseInt(match[1], 10), name: f.name } : null
      })
      .filter(Boolean)
      .sort((a, b) => a!.number - b!.number)

    if (slideFiles.length === 0) {
      return NextResponse.json({ error: "No slide audio files found" }, { status: 404 })
    }

    // Read and concatenate all per-slide WAVs
    const wavBuffers: Buffer[] = []
    for (const sf of slideFiles) {
      const { data } = await admin.storage.from("presentation-files").download(`${slidesPath}${sf!.name}`)
      if (data) {
        const buffer = Buffer.from(await data.arrayBuffer())
        if (isValidWav(buffer)) wavBuffers.push(buffer)
      }
    }

    if (wavBuffers.length === 0) {
      return NextResponse.json({ error: "Failed to read slide audio files" }, { status: 500 })
    }

    const combined = concatWavBuffers(wavBuffers)

    // Store combined audio in Supabase Storage for future requests (fire-and-forget)
    admin.storage.from("presentation-files").upload(combinedPath, combined, {
      contentType: "audio/wav",
      upsert: true,
    }).catch(() => {})

    const rangeHeader = request.headers.get("range")
    return serveWav(combined, rangeHeader, new Date().toISOString())
  } catch (err) {
    console.error("GET /api/presentations/[id]/audio/combined:", err)
    return NextResponse.json({ error: "Failed to load audio" }, { status: 500 })
  }
}
