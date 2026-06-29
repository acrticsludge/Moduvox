import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { concatWavBuffers } from "@/lib/wav-utils"

export async function GET(
  _request: Request,
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
    return new NextResponse("No audio found", { status: 404 })
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
    return new NextResponse("No slide audio files found", { status: 404 })
  }

  // Read and concatenate all per-slide WAVs
  const wavBuffers: Buffer[] = []
  for (const sf of slideFiles) {
    const { data } = await admin.storage
      .from("presentation-files")
      .download(`${slidesDir}/${sf!.name}`)

    if (data) {
      wavBuffers.push(Buffer.from(await data.arrayBuffer()))
    }
  }

  if (wavBuffers.length === 0) {
    return new NextResponse("Failed to read slide audio files", { status: 500 })
  }

  const combined = concatWavBuffers(wavBuffers)

  return new NextResponse(combined.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "audio/wav",
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=300",
    },
  })
}
