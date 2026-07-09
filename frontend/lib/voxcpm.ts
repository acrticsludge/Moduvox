// frontend/lib/voxcpm.ts
// Uses raw fetch to Gradio API — bypasses @gradio/client which hangs on Vercel
// Uses Promise.race for timeouts (AbortController/Signal don't reliably abort on Vercel)

const DEFAULT_SPACE_ID = process.env.VOXCPM2_SPACE_ID || "openbmb/VoxCPM-Demo"

export type VoxCPMInput = {
  targetText: string
  referenceAudio?: File | Buffer | null
  toneInstructions?: string
  ultimateMode?: boolean
  promptText?: string
  cfgValue?: number
  normalize?: boolean
  refDenoise?: boolean
  ditSteps?: number
  seedValue?: number
}

export type VoxCPMResult = {
  audioUrl: string
  fileData: Record<string, unknown>
}

function log(tag: string, msg: string, data?: unknown) {
  const extra = data ? ` | ${JSON.stringify(data).slice(0, 200)}` : ""
  console.log(`[VoxCPM] ${tag}: ${msg}${extra}`)
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
  log("UPLOAD", `Starting upload of ${files.length} files (${files[0]?.size ?? 0} bytes)`)

  const formData = new FormData()
  for (const file of files) {
    formData.append("files", file, "audio.wav")
  }

  const t0 = Date.now()
  const res = await withTimeout(
    fetch(`${spaceUrl}${apiPrefix}/upload`, { method: "POST", body: formData }),
    timeoutMs,
    "Upload",
  )
  log("UPLOAD", `Response ${res.status} in ${Date.now() - t0}ms`)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Upload failed (${res.status}): ${text.slice(0, 200)}`)
  }
  const json = await res.json()
  log("UPLOAD", `Result: ${JSON.stringify(json).slice(0, 100)}`)
  return json
}

/** Poll the Gradio SSE endpoint until complete or timeout. */
async function pollResult(
  pollUrl: string,
  timeoutMs = 120_000,
): Promise<{ data: unknown[] }> {
  const deadline = Date.now() + timeoutMs
  let attempts = 0

  while (Date.now() < deadline) {
    attempts++
    const t0 = Date.now()
    const res = await withTimeout(fetch(pollUrl), 30_000, "Poll")
    const text = await res.text()
    log("POLL", `Attempt ${attempts} — status ${res.status}, ${text.length} chars, took ${Date.now() - t0}ms`)

    if (text.length > 10) {
      log("POLL_RAW", text.slice(0, 300))
    }

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

    if (eventType === "complete" && dataJson) {
      try {
        const data = JSON.parse(dataJson)
        log("POLL", `Complete! Data has ${Array.isArray(data) ? data.length : "?"} items`)
        return { data: Array.isArray(data) ? data : data.data || [] }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        log("POLL", `JSON parse error: ${msg}`)
      }
    }

    if (eventType === "error") {
      throw new Error(`Gradio error: ${dataJson || "Unknown error"}`)
    }

    // If we have data but no event type, it might be a different format
    if (dataJson && !eventType) {
      try {
        const parsed = JSON.parse(dataJson)
        const data = Array.isArray(parsed) ? parsed : parsed.data || []
        if (data.length > 0) {
          log("POLL", `Data found (no event type), returning ${data.length} items`)
          return { data }
        }
      } catch { /* keep polling */ }
    }

    await new Promise((r) => setTimeout(r, 500))
  }

  throw new Error(`Gradio prediction timed out after ${timeoutMs}ms (${attempts} poll attempts)`)
}

/** Run inference against any Gradio-compatible space URL. */
async function generateWithGradio(
  input: VoxCPMInput,
  spaceUrl: string,
): Promise<VoxCPMResult> {
  const {
    targetText,
    referenceAudio = null,
    toneInstructions = "",
    ultimateMode = false,
    promptText = "",
    cfgValue = 2.0,
    normalize = true,
    refDenoise = false,
    ditSteps = 10,
    seedValue = 575590034,
  } = input

  log("GRADIO", `spaceUrl=${spaceUrl} targetText="${targetText.slice(0, 50)}..." refAudio=${referenceAudio ? "yes" : "no"} cfg=${cfgValue}`)

  const apiPrefix = "/gradio_api"

  // Upload reference audio if provided
  let refAudioRefs: Record<string, unknown>[] = []
  if (referenceAudio) {
    let refBuffer: ArrayBuffer
    let mimeType: string

    if (referenceAudio instanceof Buffer) {
      refBuffer = referenceAudio.buffer.slice(
        referenceAudio.byteOffset,
        referenceAudio.byteOffset + referenceAudio.byteLength,
      ) as ArrayBuffer
      mimeType = "audio/wav"
      log("GRADIO", `Reference audio from Buffer: ${referenceAudio.length} bytes`)
    } else {
      refBuffer = await (referenceAudio as File).arrayBuffer()
      mimeType = (referenceAudio as File).type || "audio/wav"
      log("GRADIO", `Reference audio from File: ${refBuffer.byteLength} bytes`)
    }

    if (!refBuffer || refBuffer.byteLength === 0) {
      throw new Error("Reference audio is empty")
    }
    const blob = new Blob([refBuffer], { type: mimeType })
    refAudioRefs = await uploadFiles(spaceUrl, apiPrefix, [blob])
  } else {
    log("GRADIO", "No reference audio (preset mode)")
  }

  // Start prediction — send exactly 10 params matching Gradio API
  const body: { data: unknown[] } = {
    data: [
      targetText,                // 1. text
      ultimateMode ? "" : toneInstructions, // 2. control_instruction
      refAudioRefs.length > 0 ? refAudioRefs : null, // 3. ref_wav
      ultimateMode,              // 4. use_prompt_text
      promptText,                // 5. prompt_text_value
      cfgValue,                  // 6. cfg_value
      normalize,                 // 7. do_normalize
      refDenoise,                // 8. denoise
      ditSteps,                  // 9. dit_steps
      seedValue,                 // 10. seed_value
    ],
  }

  log("GRADIO", `Predict body: ${JSON.stringify(body).slice(0, 300)}`)

  const t0 = Date.now()
  const startRes = await withTimeout(
    fetch(`${spaceUrl}${apiPrefix}/call/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    30_000,
    "Gradio predict start",
  )
  log("GRADIO", `Response ${startRes.status} in ${Date.now() - t0}ms`)

  if (!startRes.ok) {
    const text = await startRes.text()
    throw new Error(`Gradio API error (${startRes.status}): ${text.slice(0, 200)}`)
  }
  const startJson = await startRes.json()
  const eventId = startJson.event_id
  log("GRADIO", `Event ID: ${eventId}`)
  if (!eventId) throw new Error("Gradio API did not return an event_id")

  // Poll for result
  const pollUrl = `${spaceUrl}${apiPrefix}/call/generate/${eventId}`
  const result = await pollResult(pollUrl)

  const data = result.data as Record<string, unknown>[]
  log("GRADIO", `Result data items: ${data.length}`)

  const fileData = data[0] as Record<string, unknown> & { url?: string; path?: string }
  log("GRADIO", `FileData: url=${fileData?.url ? "present" : "MISSING"}, path=${fileData?.path ? "present" : "MISSING"}`)

  // Handle audio URL — the Gradio server may be HTTP or HTTPS
  const audioUrl =
    fileData.url ||
    (fileData.path
      ? `${spaceUrl}/file=${fileData.path}`
      : "") ||
    ""

  log("GRADIO", `Audio URL: ${audioUrl ? "generated" : "EMPTY!"}`)

  return { audioUrl, fileData }
}

/** Ensure a URL has a protocol prefix — defaults to http:// if missing. */
function normalizeUrl(raw: string): string {
  raw = raw.trim()
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    raw = `http://${raw}`
  }
  return raw.replace(/\/+$/, "") // strip trailing slashes
}

export async function generateAudio(input: VoxCPMInput): Promise<VoxCPMResult> {
  const rawFallback = process.env.INFERENCE_BASE_URL
  const fallbackUrl = rawFallback ? normalizeUrl(rawFallback) : undefined

  // Try HF space first
  try {
    const hfUrl = `https://${DEFAULT_SPACE_ID.replace("/", "-")}.hf.space`
    return await generateWithGradio(input, hfUrl)
  } catch (hfError) {
    const msg = hfError instanceof Error ? hfError.message : String(hfError)
    console.warn("[VoxCPM] HF space failed:", msg)

    // Fall back to INFERENCE_BASE_URL if configured
    if (fallbackUrl) {
      console.log("[VoxCPM] Falling back to INFERENCE_BASE_URL:", fallbackUrl)
      return await generateWithGradio(input, fallbackUrl)
    }

    throw hfError
  }
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
  referenceAudio: File | Buffer,
  toneInstructions = "",
  cfgValue = 2.0,
): Promise<VoxCPMResult> {
  return generateAudio({ targetText, referenceAudio, toneInstructions, cfgValue, ultimateMode: false })
}

export async function generateUltimateClone(
  targetText: string,
  referenceAudio: File | Buffer,
  promptText = "",
  cfgValue = 2.0,
): Promise<VoxCPMResult> {
  return generateAudio({ targetText, referenceAudio, ultimateMode: true, promptText, cfgValue })
}
