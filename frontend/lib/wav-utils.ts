/**
 * Concatenate multiple WAV audio buffers into a single WAV.
 * All inputs must share the same sample rate, channels, and bit depth.
 */
export function concatWavBuffers(buffers: Buffer[]): Buffer {
  if (buffers.length === 0) throw new Error("No audio buffers to concatenate")
  if (buffers.length === 1) return buffers[0]

  // Read header from first buffer to validate format
  const sampleRate = buffers[0].readUInt32LE(24)
  const channels = buffers[0].readUInt16LE(22)
  const bitsPerSample = buffers[0].readUInt16LE(34)

  // Validate all buffers have same format
  for (let i = 1; i < buffers.length; i++) {
    if (buffers[i].readUInt32LE(24) !== sampleRate ||
        buffers[i].readUInt16LE(22) !== channels ||
        buffers[i].readUInt16LE(34) !== bitsPerSample) {
      throw new Error(`WAV format mismatch at buffer ${i}: expected ${sampleRate}Hz/${channels}ch/${bitsPerSample}bit`)
    }
  }

  // The WAV header for PCM is exactly 44 bytes
  const HEADER_SIZE = 44

  // Concatenate raw PCM data (strip headers)
  const pcmChunks = buffers.map((buf) => buf.subarray(HEADER_SIZE))
  const totalDataSize = pcmChunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const combined = Buffer.concat(pcmChunks, totalDataSize)

  // Build new WAV header
  const header = Buffer.alloc(HEADER_SIZE)

  // RIFF header
  header.write("RIFF", 0, "ascii")
  header.writeUInt32LE(36 + totalDataSize, 4) // file size - 8
  header.write("WAVE", 8, "ascii")

  // fmt chunk
  header.write("fmt ", 12, "ascii")
  header.writeUInt32LE(16, 16) // chunk size (PCM)
  header.writeUInt16LE(1, 20)  // audio format (1 = PCM)
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28) // byte rate
  header.writeUInt16LE(channels * (bitsPerSample / 8), 32) // block align
  header.writeUInt16LE(bitsPerSample, 34)

  // data chunk
  header.write("data", 36, "ascii")
  header.writeUInt32LE(totalDataSize, 40)

  return Buffer.concat([header, combined], HEADER_SIZE + totalDataSize)
}
