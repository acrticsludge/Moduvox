// frontend/lib/voxcpm.ts
// Uses raw fetch to Gradio API — bypasses @gradio/client which hangs on Vercel

const DEFAULT_SPACE_ID = process.env.VOXCPM2_SPACE_ID || "openbmb/VoxCPM-Demo"

export type VoxCPMInput = {
  targetText: string
  referenceAudio?: File | null
  toneInstructions?: string
  ultimateMode?: boolean
  promptText?: string
  cfgValue?: number
  normalize?: boolean
  refDenoise?: boolean
}

export type VoxCPMResult = {
  audioUrl: string
  fileData: Record<string, unknown>
}

/** Upload files to Gradio and return file references. */
async function uploadFiles(
  spaceUrl: string,
  apiPrefix: string,
  files: Blob[],
  timeoutMs = 30_000,
): Promise<Record<string, unknown>[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const formData = new FormData()
    for (const file of files) {
      // FormData in Node.js 22 accepts Blob
      formData.append("files", file)
    }

    const res = await fetch(`${spaceUrl}${apiPrefix}/upload`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Upload failed (${res.status}): ${text.slice(0, 200)}`)
    }
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/** Poll the Gradio SSE endpoint until complete or timeout. */
async function pollResult(
  pollUrl: string,
  timeoutMs = 120_000,
): Promise<{ data: unknown[] }> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30_000)

    try {
      const res = await fetch(pollUrl, { signal: controller.signal })
      const text = await res.text()
      const lines = text.split("\n")

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const payload = JSON.parse(line.slice(6))
          if (payload.type === "complete" || payload.type === "data") {
            return { data: payload.data || [] }
          }
          if (payload.type === "error") {
            throw new Error(`Gradio error: ${payload.error || "Unknown error"}`)
          }
        }
      }
    } finally {
      clearTimeout(timer)
    }

    await new Promise((r) => setTimeout(r, 500))
  }

  throw new Error(`Gradio prediction timed out after ${timeoutMs}ms`)
}

export async function generateAudio(input: VoxCPMInput): Promise<VoxCPMResult> {
  const {
    targetText,
    referenceAudio = null,
    toneInstructions = "",
    ultimateMode = false,
    promptText = "",
    cfgValue = 2.0,
    normalize = true,
    refDenoise = false,
  } = input

  const spaceUrl = `https://${DEFAULT_SPACE_ID.replace("/", "-")}.hf.space`
  const apiPrefix = "/gradio_api"

  // Upload reference audio if provided
  let refAudioRefs: Record<string, unknown>[] = []
  if (referenceAudio) {
    const refBuffer = await referenceAudio.arrayBuffer()
    const blob = new Blob([refBuffer], { type: referenceAudio.type || "audio/wav" })
    refAudioRefs = await uploadFiles(spaceUrl, apiPrefix, [blob])
  }

  // Start prediction
  const body: { data: unknown[] } = {
    data: [
      targetText,
      ultimateMode ? "" : toneInstructions,
      refAudioRefs.length > 0 ? refAudioRefs : null,
      ultimateMode,
      promptText,
      cfgValue,
      normalize,
      refDenoise,
    ],
  }

  const startController = new AbortController()
  const startTimer = setTimeout(() => startController.abort(), 30_000)
  let eventId: string

  try {
    const startRes = await fetch(`${spaceUrl}${apiPrefix}/call/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: startController.signal,
    })
    if (!startRes.ok) {
      const text = await startRes.text()
      throw new Error(`Gradio API error (${startRes.status}): ${text.slice(0, 200)}`)
    }
    const startJson = await startRes.json()
    eventId = startJson.event_id
    if (!eventId) throw new Error("Gradio API did not return an event_id")
  } finally {
    clearTimeout(startTimer)
  }

  // Poll for result
  const pollUrl = `${spaceUrl}${apiPrefix}/call/generate/${eventId}`
  const result = await pollResult(pollUrl)

  const data = result.data as Record<string, unknown>[]
  const fileData = data[0] as Record<string, unknown> & { url?: string; path?: string }

  const audioUrl =
    fileData.url ||
    (fileData.path
      ? `${spaceUrl}/file=${fileData.path}`
      : "") ||
    ""

  return { audioUrl, fileData }
}

export async function generateWithPreset(
  targetText: string,
  voiceDescription: string,
  cfgValue = 2.0,
): Promise<VoxCPMResult> {
  return generateAudio({ targetText, toneInstructions: voiceDescription, cfgValue })
}

export async function generateWithClone(
  targetText: string,
  referenceAudio: File,
  toneInstructions = "",
  cfgValue = 2.0,
): Promise<VoxCPMResult> {
  return generateAudio({ targetText, referenceAudio, toneInstructions, cfgValue, ultimateMode: false })
}

export async function generateUltimateClone(
  targetText: string,
  referenceAudio: File,
  promptText = "",
  cfgValue = 2.0,
): Promise<VoxCPMResult> {
  return generateAudio({ targetText, referenceAudio, ultimateMode: true, promptText, cfgValue })
}
