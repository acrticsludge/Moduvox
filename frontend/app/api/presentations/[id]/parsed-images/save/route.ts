import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { uploadFile } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"
import { z } from "zod"

const saveSchema = z.object({
  slides: z.array(z.object({
    number: z.number().int().positive(),
    images: z.array(z.object({
      index: z.number().int().min(0),
      mimeType: z.string(),
      data: z.string().min(1),
    })),
  })),
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
  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const keys: Record<string, string> = {}

  for (const slide of parsed.data.slides) {
    for (const img of slide.images) {
      const ext = img.mimeType === "image/png" ? "png"
        : img.mimeType === "image/jpeg" ? "jpg"
        : img.mimeType === "image/webp" ? "webp"
        : "bin"
      const r2Key = `${user.id}/parsed-images/${presentationId}/${slide.number}-${img.index}.${ext}`

      const buffer = Buffer.from(img.data, "base64")
      const result = await uploadFile(r2Key, buffer, img.mimeType)
      if (result.success) {
        keys[`${slide.number}-${img.index}`] = r2Key
      } else {
        console.warn(`[parsed-images] Failed to save ${r2Key}: ${result.error}`)
      }
    }
  }

  return NextResponse.json({ data: { keys } })
})
