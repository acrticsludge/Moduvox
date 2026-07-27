import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { listFiles, deleteFile } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"

const cleanupSchema = z.object({
  activeSlideNumbers: z.array(z.number().int().positive()).optional(),
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

  const { data: presentation } = await supabase
    .from("presentations")
    .select("id")
    .eq("id", presentationId)
    .eq("user_id", user.id)
    .single()

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  const body = await request.json()
  const parsed = cleanupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
  const { activeSlideNumbers } = parsed.data
  const activeSet = activeSlideNumbers ? new Set(activeSlideNumbers) : null

  const audioPrefix = `${user.id}/audio/${presentationId}/`
  const slidesPrefix = `${audioPrefix}slides/`

  // 1. Delete combined.wav — forces viewer to refetch
  await deleteFile(`${audioPrefix}combined.wav`).catch(() => {})

  // 2. Delete per-slide WAVs for slides no longer in the active set
  if (activeSet) {
    const allFiles = await listFiles(slidesPrefix)
    if (allFiles.success) {
      const deleteKeys = allFiles.data
        .filter((f: { Key?: string }) => {
          const key = f.Key ?? ""
          const match = key.match(/slide-(\d+)\.wav$/)
          return match && !activeSet.has(parseInt(match[1], 10))
        })
        .map((f: { Key?: string }) => f.Key)
        .filter((k): k is string => !!k)
      const deletePromises = deleteKeys.map((key) => deleteFile(key).catch(() => {}))
      await Promise.all(deletePromises)
    }
  }

  // 3. Clean up editor_state — remove references to deleted slides
  const { data: current } = await supabase
    .from("presentations")
    .select("editor_state")
    .eq("id", presentationId)
    .single()

  if (current?.editor_state && activeSet) {
    const state = { ...current.editor_state } as Record<string, unknown>

    if (state.narrations && typeof state.narrations === "object") {
      const narrations = state.narrations as Record<string, unknown>
      for (const key of Object.keys(narrations)) {
        if (!activeSet.has(Number(key))) delete narrations[key]
      }
      state.narrations = Object.keys(narrations).length > 0 ? narrations : undefined
    }

    if (state.imageDescriptions && typeof state.imageDescriptions === "object") {
      const descs = state.imageDescriptions as Record<string, unknown>
      for (const key of Object.keys(descs)) {
        if (!activeSet.has(Number(key))) delete descs[key]
      }
      state.imageDescriptions = Object.keys(descs).length > 0 ? descs : undefined
    }

    if (Array.isArray(state.changedSlides)) {
      const filtered = (state.changedSlides as number[]).filter((s) => activeSet.has(s))
      state.changedSlides = filtered.length > 0 ? filtered : undefined
    }

    if (Array.isArray(state.slideData)) {
      const filtered = (state.slideData as { title: string; bullets: string[] }[]).filter(
        (_: unknown, i: number) => activeSet.has(i + 1),
      )
      state.slideData = filtered.length > 0 ? filtered : undefined
    }

    state.audioGenerated = false

    const newCount = activeSlideNumbers?.length ?? 0
    if (newCount > 0) {
      state.slideCount = newCount
    }

    if (typeof state.currentSlide === "number") {
      const maxSlide = Math.max(...Array.from(activeSet), 0)
      if (state.currentSlide >= maxSlide) {
        state.currentSlide = Math.max(0, maxSlide - 1)
      }
    }

    await supabase
      .from("presentations")
      .update({
        editor_state: state,
        slide_count: newCount,
      })
      .eq("id", presentationId)
  } else if (activeSet && !current?.editor_state) {
    await supabase
      .from("presentations")
      .update({ slide_count: activeSlideNumbers?.length ?? 0 })
      .eq("id", presentationId)
  }

  // 4. Bump audio_version so view page detects stale audio
  try {
    const admin = createAdminClient()
    await admin.rpc("increment_audio_version", { p_presentation_id: presentationId })
  } catch (err) {
    console.error("[cleanup] Failed to bump audio_version:", err)
  }

  return NextResponse.json({ data: { success: true } })
})
