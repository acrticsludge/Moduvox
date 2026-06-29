import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { concatWavBuffers, isValidWav } from "@/lib/wav-utils"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { id: presentationId } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const slidesDir = `${user.id}/audio/${presentationId}/slides`

  // List all per-slide WAV files
  const { data: files } = await admin.storage
    .from("presentation-files")
    .list(slidesDir, { limit: 200 })

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "No audio found" }, { status: 404 })
  }

  // Parse slide numbers from filenames, sort ascending
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
      } else {
        console.warn(`Skipping invalid WAV: ${sf!.name} (${buf.length} bytes)`)
      }
    }
  }

  if (wavBuffers.length === 0) {
    return new NextResponse("Failed to read slide audio files", { status: 500 })
  }

  const combined = concatWavBuffers(wavBuffers)

  // Support Range requests for proper browser audio playback
  const rangeHeader = request.headers.get("range")
  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : combined.length - 1
    const chunk = new Uint8Array(combined.subarray(start, end + 1))

    return new NextResponse(chunk, {
      status: 206,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Range": `bytes ${start}-${end}/${combined.length}`,
        "Content-Length": String(chunk.length),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=300",
      },
    })
  }

  return new NextResponse(new Uint8Array(combined), {
    headers: {
      "Content-Type": "audio/wav",
      "Content-Length": String(combined.length),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=300",
    },
  })
}
