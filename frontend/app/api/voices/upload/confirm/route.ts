import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { deleteFile } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"
import { z } from "zod"
import { logAuditFromRequest } from "@/lib/audit"

const confirmSchema = z.object({
  path: z.string().min(1),
  name: z.string().min(1).max(100),
  emotion_default: z.string().optional(),
  consent: z.boolean().refine((v) => v === true, { message: "Consent is required" }),
})

/**
 * Called after the browser uploads a voice sample to R2 via presigned URL.
 * Creates the voice record in the database with consent metadata.
 */
export const POST = withApiHandler(async (request: Request) => {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: z.infer<typeof confirmSchema>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = confirmSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { path: filePath, name, emotion_default: emotionDefault, consent } = parsed.data

  // Extract client metadata for audit trail
  const forwardedFor = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown"
  const userAgent = request.headers.get("user-agent") || "unknown"

  // Create voice record with consent metadata
  const { data: voice, error: dbError } = await supabase
    .from("voices")
    .insert({
      user_id: user.id,
      name: name.trim(),
      type: "cloned",
      sample_path: filePath,
      sample_duration_seconds: null,
      emotion_default: emotionDefault ?? "calm",
      consent_granted: consent,
      consent_timestamp: new Date().toISOString(),
      consent_ip: ip,
      consent_user_agent: userAgent,
    })
    .select()
    .single()

  if (dbError) {
    console.error("POST /api/voices/upload/confirm:", dbError.message)
    await deleteFile(filePath)
    return NextResponse.json({ error: "Failed to save voice" }, { status: 500 })
  }

  await logAuditFromRequest(request, {
    presentation_id: voice.id, // voice id as reference
    action: 'voice_consent_recorded',
    metadata: { voice_name: voice.name, voice_type: 'cloned' },
  })

  return NextResponse.json({ data: voice }, { status: 201 })
})