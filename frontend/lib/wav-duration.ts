/**
 * Compute duration (in milliseconds) from a WAV ArrayBuffer.
 * WAV format: RIFF header (12 bytes) + fmt chunk + data chunk.
 * Duration = dataSize / (sampleRate * numChannels * bitsPerSample/8)
 */
export function getWavDuration(buffer: ArrayBuffer): number {
  const view = new DataView(buffer)

  // Check RIFF header
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))
  if (riff !== "RIFF") throw new Error("Not a valid WAV file")

  // Check WAVE format
  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))
  if (wave !== "WAVE") throw new Error("Not a valid WAV file")

  // Read format chunk (starts at byte 12, but we search for "fmt ")
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
    // Chunks are aligned to even byte boundaries
    if (chunkSize % 2 !== 0) offset++
  }

  if (!foundFmt) throw new Error("No fmt chunk found in WAV")
  if (dataSize === 0) throw new Error("No data chunk found in WAV")

  const bytesPerSecond = sampleRate * numChannels * (bitsPerSample / 8)
  if (bytesPerSecond === 0) throw new Error("Invalid WAV format parameters")

  return Math.round((dataSize / bytesPerSecond) * 1000)
}

/**
 * Fetch all per-slide WAVs from storage and compute their durations.
 * Returns sorted array of { slideNumber, durationMs }.
 */
export async function getAllSlideDurations(
  userId: string,
  presentationId: string,
  slideCount: number,
): Promise<{ slideNumber: number; durationMs: number }[]> {
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const admin = createAdminClient()
  const timings: { slideNumber: number; durationMs: number }[] = []

  for (let i = 1; i <= slideCount; i++) {
    const filePath = `${userId}/audio/${presentationId}/slides/slide-${i}.wav`
    try {
      const { data } = await admin.storage.from("presentation-files").download(filePath)
      if (data) {
        const durationMs = getWavDuration(await data.arrayBuffer())
        timings.push({ slideNumber: i, durationMs })
      }
    } catch {
      // Slide may not have audio yet — skip
      continue
    }
  }

  return timings
}
