// frontend/lib/voxcpm.ts
// Uses raw fetch to Gradio API — bypasses @gradio/client which hangs on Vercel
// Uses Promise.race for timeouts (AbortController/Signal don't reliably abort on Vercel)

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

/** Race a promise against a timeout — doesn't rely on AbortSignal working */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ])
}

/** Upload files to Gradio and return file references. */
async function uploadFiles(
  spaceUrl: string,
  apiPrefix: string,
  files: Blob[],
  timeoutMs = 30_000,
): Promise<Record<string, unknown>[]> {
  const formData = new FormData()
  for (const file of files) {
    formData.append("files", file, "audio.wav")
  }

  const res = await withTimeout(
    fetch(`${spaceUrl}${apiPrefix}/upload`, { method: "POST", body: formData }),
    timeoutMs,
    "Upload",
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Upload failed (${res.status}): ${text.slice(0, 200)}`)
  }
  return await res.json()
}

/** Poll the Gradio SSE endpoint until complete or timeout. */
async function pollResult(
  pollUrl: string,
  timeoutMs = 120_000,
): Promise<{ data: unknown[] }> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const res = await withTimeout(
      fetch(pollUrl),
      30_000,
      "Poll",
    )
    const text = await res.text()
    const lines = text.split("\n")

    let eventType = ""
    let dataJson = ""

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.slice(7).trim()
      } else if (line.startsWith("data: ")) {
        dataJson = line.slice(6)
      }
    }

    if (eventType === "complete" || dataJson) {
      try {
        const data = JSON.parse(dataJson)
        return { data: Array.isArray(data) ? data : data.data || [] }
      } catch {
        // data may not be valid JSON yet, keep polling
      }
    }

    if (eventType === "error") {
      throw new Error(`Gradio error: ${dataJson || "Unknown error"}`)
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
    if (!refBuffer || refBuffer.byteLength === 0) {
      throw new Error("Reference audio is empty")
    }
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

  const startRes = await withTimeout(
    fetch(`${spaceUrl}${apiPrefix}/call/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    30_000,
    "Predict start",
  )
  if (!startRes.ok) {
    const text = await startRes.text()
    throw new Error(`Gradio API error (${startRes.status}): ${text.slice(0, 200)}`)
  }
  const startJson = await startRes.json()
  const eventId = startJson.event_id
  if (!eventId) throw new Error("Gradio API did not return an event_id")

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
