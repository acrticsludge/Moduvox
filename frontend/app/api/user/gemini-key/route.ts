import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { encrypt, decrypt } from "@/lib/encryption"

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

  // Decrypt the stored key before returning (client needs plaintext)
  let geminiApiKey: string | null = null
  if (data?.gemini_api_key) {
    try {
      geminiApiKey = decrypt(data.gemini_api_key)
    } catch {
      // If decryption fails, key might be in plaintext from before encryption was added
      // Return it as-is (migration path)
      geminiApiKey = data.gemini_api_key
    }
  }

  return NextResponse.json({ data: { geminiApiKey } })
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

  // Encrypt the key before storing
  const encrypted = encrypt(geminiApiKey)

  const { error } = await supabase
    .from("users")
    .update({ gemini_api_key: encrypted })
    .eq("id", user.id)

  if (error) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }

  return NextResponse.json({ data: { saved: true } })
}
