/**
 * Compute duration (in milliseconds) from a WAV buffer (only needs first ~100 bytes).
 * WAV format: RIFF header (12 bytes) + fmt chunk + data chunk.
 * Duration = dataSize / (sampleRate * numChannels * bitsPerSample/8)
 */
export function getWavDuration(buffer: ArrayBufferLike): number {
  const view = new DataView(buffer)

  // Check RIFF header
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))
  if (riff !== "RIFF") throw new Error("Not a valid WAV file")

  // Check WAVE format
  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))
  if (wave !== "WAVE") throw new Error("Not a valid WAV file")

  // Walk chunks to find fmt and data
  let offset = 12
  let foundFmt = false
  let sampleRate = 0
  let numChannels = 0
  let bitsPerSample = 0
  let dataSize = 0

  while (offset < buffer.byteLength - 8) {
    const chunkId = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3))
    const chunkSize = view.getUint32(offset + 4, true)

    if (chunkId === "fmt ") {
      numChannels = view.getUint16(offset + 8, true)
      sampleRate = view.getUint32(offset + 12, true)
      bitsPerSample = view.getUint16(offset + 22, true)
      foundFmt = true
    } else if (chunkId === "data") {
      dataSize = chunkSize
    }

    offset += 8 + chunkSize
    if (chunkSize % 2 !== 0) offset++
  }

  if (!foundFmt) throw new Error("No fmt chunk found in WAV")
  if (dataSize === 0) throw new Error("No data chunk found in WAV")

  const bytesPerSecond = sampleRate * numChannels * (bitsPerSample / 8)
  if (bytesPerSecond === 0) throw new Error("Invalid WAV format parameters")

  return Math.round((dataSize / bytesPerSecond) * 1000)
}

/**
 * Fetch just the WAV header (first 100 bytes) from a presigned URL using a Range request.
 * This is ~2000x faster than downloading the full audio file (~1-2MB per slide).
 */
async function getWavDurationFromUrl(url: string): Promise<number> {
  const res = await fetch(url, {
    headers: { Range: "bytes=0-99" },
  })
  if (!res.ok) throw new Error(`WAV header fetch failed (${res.status})`)
  const buf = await res.arrayBuffer()
  return getWavDuration(buf)
}

/**
 * Compute per-slide WAV durations by fetching only the header of each file.
 * Returns sorted array of { slideNumber, durationMs }.
 */
export async function getAllSlideDurations(
  userId: string,
  presentationId: string,
  slideCount: number,
): Promise<{ slideNumber: number; durationMs: number }[]> {
  const timings: { slideNumber: number; durationMs: number }[] = []
  const { createDownloadUrl } = await import("@/lib/r2")

  for (let i = 1; i <= slideCount; i++) {
    const key = `${userId}/audio/${presentationId}/slides/slide-${i}.wav`
    try {
      const url = await createDownloadUrl(key, 300) // 5 min should be enough
      if (!url) continue
      const durationMs = await getWavDurationFromUrl(url)
      timings.push({ slideNumber: i, durationMs })
    } catch {
      continue
    }
  }

  return timings
}
