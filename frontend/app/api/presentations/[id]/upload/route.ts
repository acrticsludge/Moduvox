import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { deleteFile, createUploadUrl } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"

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

  // Verify presentation ownership
  const { data: presentation } = await supabase
    .from("presentations")
    .select("id")
    .eq("id", presentationId)
    .eq("user_id", user.id)
    .single()

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  const filePath = `${user.id}/${presentationId}.pptx`

  // Remove any existing file at this path (log failure — the new PUT will
  // overwrite anyway, but a stale object here can confuse confirm/polling)
  const existingDelete = await deleteFile(filePath)
  if (!existingDelete.success) {
    console.error(`[upload] Failed to delete existing ${filePath}: ${existingDelete.error}`)
  }

  // Generate presigned URL for direct browser-to-R2 upload
  const presignedUrl = await createUploadUrl(
    filePath,
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    300,
  )

  if (!presignedUrl) {
    console.error("Failed to create presigned upload URL")
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      presignedUrl,
      path: filePath,
    },
  })
})