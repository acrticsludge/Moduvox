import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withApiHandler } from "@/lib/api-handler"

export const GET = withApiHandler(async (
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

  const { data: version } = await supabase
    .from("narration_versions")
    .select("*")
    .eq("presentation_id", presentationId)
    .eq("slide_number", slideNumber)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({ data: version ?? null })
})