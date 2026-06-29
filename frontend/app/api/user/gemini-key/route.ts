import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data } = await supabase
    .from("users")
    .select("gemini_api_key")
    .eq("id", user.id)
    .single()

  return NextResponse.json({ data: { geminiApiKey: data?.gemini_api_key || null } })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { geminiApiKey } = await request.json()
  if (typeof geminiApiKey !== "string") {
    return NextResponse.json({ error: "geminiApiKey must be a string" }, { status: 400 })
  }

  const { error } = await supabase
    .from("users")
    .update({ gemini_api_key: geminiApiKey || null })
    .eq("id", user.id)

  if (error) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }

  return NextResponse.json({ data: { saved: true } })
}
