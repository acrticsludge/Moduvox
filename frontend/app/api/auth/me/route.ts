import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return NextResponse.json({ user: user ? { id: user.id } : null })
  } catch {
    return NextResponse.json({ user: null })
  }
}
