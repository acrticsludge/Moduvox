import { MPEGDecoder } from "mpg123-decoder"

/**
 * Convert an MP3 buffer to PCM WAV format using mpg123-decoder (pure WASM, no native deps).
 * Returns the original buffer unchanged if decoding fails or if it's already valid WAV.
 */
export async function toWav(input: Buffer): Promise<Buffer> {
  try {
    const decoder = new MPEGDecoder()
    await decoder.ready

    // Decode MP3 to raw PCM samples
    const decoded = decoder.decode(input)
    decoder.free()

    if (!decoded || !decoded.channelData?.length || !decoded.samplesDecoded) {
      return input // fallback: return as-is
    }

    const sampleRate = decoded.sampleRate || 24000
    const channels = decoded.channelData.length
    const samplesDecoded = decoded.samplesDecoded

    // Interleave channels into 16-bit PCM
    const pcmData = new Int16Array(samplesDecoded * channels)
    for (let s = 0; s < samplesDecoded; s++) {
      for (let c = 0; c < channels; c++) {
        // Clamp float [-1, 1] to int16 [-32768, 32767]
        const val = Math.max(-1, Math.min(1, decoded.channelData[c][s] ?? 0))
        pcmData[s * channels + c] = val < 0 ? val * 32768 : val * 32767
      }
    }

    const dataSize = pcmData.byteLength
    const HEADER_SIZE = 44
    const wav = Buffer.alloc(HEADER_SIZE + dataSize)

    // WAV header
    wav.write("RIFF", 0, "ascii")
    wav.writeUInt32LE(36 + dataSize, 4)
    wav.write("WAVE", 8, "ascii")
    wav.write("fmt ", 12, "ascii")
    wav.writeUInt32LE(16, 16)      // chunk size (PCM)
    wav.writeUInt16LE(1, 20)       // PCM format
    wav.writeUInt16LE(channels, 22)
    wav.writeUInt32LE(sampleRate, 24)
    wav.writeUInt32LE(sampleRate * channels * 2, 28)  // byte rate
    wav.writeUInt16LE(channels * 2, 32)                // block align
    wav.writeUInt16LE(16, 34)      // bits per sample
    wav.write("data", 36, "ascii")
    wav.writeUInt32LE(dataSize, 40)

    // PCM data (uses any cast to handle Buffer<ArrayBufferLike> compatibility)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(Buffer.from(pcmData.buffer as any) as any).copy(wav, HEADER_SIZE)

    return wav
  } catch {
    return input // fallback: return as-is
  }
}
