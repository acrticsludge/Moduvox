import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { downloadFile } from "@/lib/r2"
import { isValidWav } from "@/lib/wav-utils"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; slideNumber: string }> },
) {
  const supabase = await createClient()
  const { id: presentationId, slideNumber } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const slideNum = parseInt(slideNumber, 10)
  if (isNaN(slideNum) || slideNum < 1) {
    return NextResponse.json({ error: "Invalid slide number" }, { status: 400 })
  }

  const r2Key = `audio/${user.id}/${presentationId}/slides/slide-${slideNum}.wav`
  const buf = await downloadFile(r2Key)

  if (!buf) {
    return NextResponse.json({ error: "Slide audio not found" }, { status: 404 })
  }
  if (!isValidWav(buf)) {
    return NextResponse.json({ error: "Invalid audio file" }, { status: 500 })
  }

  const rangeHeader = request.headers.get("range")
  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : buf.length - 1
    const chunk = new Uint8Array(buf.subarray(start, end + 1))

    return new NextResponse(chunk, {
      status: 206,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Range": `bytes ${start}-${end}/${buf.length}`,
        "Content-Length": String(chunk.length),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=300",
      },
    })
  }

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "audio/wav",
      "Content-Length": String(buf.length),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=300",
    },
  })
}
