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
    const admin = createAdminClient()

    // Get userId from auth or session token
    const { userId, error } = await getUserId(request, presentationId)
    if (error) return error

    const combinedPath = `${userId}/audio/${presentationId}/combined.wav`

    // Check if cached combined.wav exists
    const { data: existing } = await admin.storage
      .from("presentation-files")
      .list(`${userId}/audio/${presentationId}`, { limit: 100 })

    const hasCachedFile = existing?.some((f) => f.name === "combined.wav")

    if (hasCachedFile) {
      // Redirect to Supabase Storage CDN — instant Range requests,
      // no serverless proxy overhead. Browser follows the redirect
      // transparently, re-sending Range headers to the CDN.
      const { data: signed } = await admin.storage
        .from("presentation-files")
        .createSignedUrl(combinedPath, 86400)

      if (signed?.signedUrl) {
        return NextResponse.redirect(signed.signedUrl)
      }
    }

    // No cached combined file — generate from per-slide WAVs
    const slidesDir = `${userId}/audio/${presentationId}/slides`
    const { data: files } = await admin.storage
      .from("presentation-files")
      .list(slidesDir, { limit: 200 })

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No audio found" }, { status: 404 })
    }

    const slideFiles = files
      .map((f) => {
        const match = f.name?.match(/^slide-(\d+)\.wav$/)
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
      const { data } = await admin.storage
        .from("presentation-files")
        .download(`${slidesDir}/${sf!.name}`)

      if (data) {
        const buf = Buffer.from(await data.arrayBuffer())
        if (isValidWav(buf)) {
          wavBuffers.push(buf)
        }
      }
    }

    if (wavBuffers.length === 0) {
      return NextResponse.json({ error: "Failed to read slide audio files" }, { status: 500 })
    }

    const combined = concatWavBuffers(wavBuffers)

    // Store combined audio for future requests (blocking — ensures cache is ready)
    await admin.storage
      .from("presentation-files")
      .upload(combinedPath, combined, {
        contentType: "audio/wav",
        upsert: true,
      })
      .catch(() => {}) // Non-critical — will regenerate next time if upload fails

    const rangeHeader = request.headers.get("range")
    return serveWav(combined, rangeHeader, new Date().toISOString())
  } catch (err) {
    console.error("GET /api/presentations/[id]/audio/combined:", err)
    return NextResponse.json({ error: "Failed to load audio" }, { status: 500 })
  }
}
