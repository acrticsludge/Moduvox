import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createDownloadUrl } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"

/**
 * Generate a signed download URL for a voice sample.
 * Used by the client-side voices page to play preview audio.
 */
export const GET = withApiHandler(async (request: Request) => {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const path = searchParams.get("path")

  if (!path || path.includes("..") || path.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 })
  }

  const pathParts = path.split("/")
  if (pathParts.length < 2 || pathParts[0] !== user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  const audioUrl = await createDownloadUrl(path, 300)
  if (!audioUrl) {
    return NextResponse.json({ error: "Failed to generate signed URL" }, { status: 500 })
  }

  return NextResponse.json({ data: { audioUrl } })
})