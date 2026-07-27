import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { encrypt, decrypt } from "@/lib/encryption"
import { withApiHandler } from "@/lib/api-handler"

export const GET = withApiHandler(async () => {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data } = await supabase
    .from("users")
    .select("nim_api_key")
    .eq("id", user.id)
    .single()

  // Decrypt the stored key before returning (client needs plaintext)
  let nimApiKey: string | null = null
  if (data?.nim_api_key) {
    try {
      nimApiKey = decrypt(data.nim_api_key)
    } catch {
      // If decryption fails, key might be in plaintext from before encryption was added
      // Return it as-is (migration path)
      nimApiKey = data.nim_api_key
    }
  }

  return NextResponse.json({ data: { nimApiKey } })
})

export const PUT = withApiHandler(async (...args: unknown[]) => {
  const request = args[0] as Request
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { nimApiKey } = await request.json()
  if (typeof nimApiKey !== "string" && nimApiKey !== null) {
    return NextResponse.json({ error: "nimApiKey must be a string or null" }, { status: 400 })
  }

  if (nimApiKey === null) {
    // Remove the key
    const { error } = await supabase
      .from("users")
      .update({ nim_api_key: null })
      .eq("id", user.id)

    if (error) {
      return NextResponse.json({ error: "Failed to remove key" }, { status: 500 })
    }

    return NextResponse.json({ data: { saved: true } })
  }

  // Encrypt the key before storing
  const encrypted = encrypt(nimApiKey)

  const { error } = await supabase
    .from("users")
    .update({ nim_api_key: encrypted })
    .eq("id", user.id)

  if (error) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }

  return NextResponse.json({ data: { saved: true } })
})
