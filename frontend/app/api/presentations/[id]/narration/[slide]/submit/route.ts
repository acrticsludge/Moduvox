import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withApiHandler } from "@/lib/api-handler"
import { logAuditFromRequest } from "@/lib/audit"

export const POST = withApiHandler(async (
  _request: Request,
  { params }: { params: Promise<{ id: string; slide: string }> }
) => {
  const supabase = await createClient()
  const { id: presentationId, slide } = await params
  const slideNumber = parseInt(slide, 10)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: presentation } = await supabase
    .from("presentations")
    .select("id")
    .eq("id", presentationId)
    .eq("user_id", user.id)
    .single()

  if (!presentation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { data: version, error } = await supabase
    .from("narration_versions")
    .update({ status: "pending" })
    .eq("presentation_id", presentationId)
    .eq("slide_number", slideNumber)
    .eq("status", "draft")
    .order("generated_at", { ascending: false })
    .limit(1)
    .select()
    .single()

  if (error || !version) {
    return NextResponse.json({ error: "No draft version to submit" }, { status: 400 })
  }

  await logAuditFromRequest(request, {
    presentation_id: presentationId,
    slide_number: slideNumber,
    action: 'submitted_for_review',
  })

  return NextResponse.json({ data: version })
})