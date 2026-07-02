import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { id: presentationId } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const filePath = body.path as string

  if (!filePath) {
    return NextResponse.json({ error: "No file path provided" }, { status: 400 })
  }

  // Update presentation status
  await supabase
    .from("presentations")
    .update({ status: "ready" })
    .eq("id", presentationId)

  // Generate a signed URL for the Office viewer (1 hour)
  const admin = createAdminClient()
  const { data } = await admin.storage.from("presentation-files").createSignedUrl(filePath, 3600)

  if (!data) {
    return NextResponse.json({ error: "Failed to generate viewer URL" }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      viewerUrl: data.signedUrl,
    },
  })
}
