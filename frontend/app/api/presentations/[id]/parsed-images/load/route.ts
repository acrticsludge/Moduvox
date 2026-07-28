import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createDownloadUrl } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"
import { z } from "zod"

const loadSchema = z.object({
  keys: z.array(z.string().min(1)),
})

export const POST = withApiHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const supabase = await createClient()
  const { id: presentationId } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = loadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  // Verify each key belongs to this user
  const urls: Record<string, string | null> = {}
  for (const key of parsed.data.keys) {
    if (!key.startsWith(`${user.id}/`)) {
      urls[key] = null
      continue
    }
    try {
      urls[key] = await createDownloadUrl(key, 86400)
    } catch {
      urls[key] = null
    }
  }

  return NextResponse.json({ data: { images: urls } })
})
