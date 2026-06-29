const HEADER_SIZE = 44

export function isValidWav(buf: Buffer): boolean {
  if (buf.length < HEADER_SIZE) return false
  if (buf.toString("ascii", 0, 4) !== "RIFF") return false
  if (buf.toString("ascii", 8, 12) !== "WAVE") return false
  const fmt = buf.readUInt16LE(20)
  if (fmt !== 1) return false
  const sr = buf.readUInt32LE(24)
  const ch = buf.readUInt16LE(22)
  const bps = buf.readUInt16LE(34)
  if (sr < 1000 || sr > 192000) return false
  if (ch < 1 || ch > 8) return false
  if ([8, 16, 24, 32].indexOf(bps) === -1) return false
  return true
}

export function concatWavBuffers(buffers: Buffer[]): Buffer {
  if (buffers.length === 0) throw new Error("No audio buffers to concatenate")
  if (buffers.length === 1) {
    if (!isValidWav(buffers[0])) throw new Error("Single buffer is not a valid WAV")
    return buffers[0]
  }

  const valid = buffers.filter(isValidWav)
  if (valid.length === 0) throw new Error("No valid WAV buffers to concatenate")

  const sampleRate = valid[0].readUInt32LE(24)
  const channels = valid[0].readUInt16LE(22)
  const bitsPerSample = valid[0].readUInt16LE(34)

  for (let i = 1; i < valid.length; i++) {
    if (valid[i].readUInt32LE(24) !== sampleRate ||
        valid[i].readUInt16LE(22) !== channels ||
        valid[i].readUInt16LE(34) !== bitsPerSample) {
      throw new Error(`WAV format mismatch at buffer ${i}: expected ${sampleRate}Hz/${channels}ch/${bitsPerSample}bit`)
    }
  }

  const pcmChunks = valid.map((buf) => buf.subarray(HEADER_SIZE))
  const totalDataSize = pcmChunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const combined = Buffer.concat(pcmChunks, totalDataSize)

  const header = Buffer.alloc(HEADER_SIZE)
  header.write("RIFF", 0, "ascii")
  header.writeUInt32LE(36 + totalDataSize, 4)
  header.write("WAVE", 8, "ascii")
  header.write("fmt ", 12, "ascii")
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28)
  header.writeUInt16LE(channels * (bitsPerSample / 8), 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write("data", 36, "ascii")
  header.writeUInt32LE(totalDataSize, 40)

  return Buffer.concat([header, combined], HEADER_SIZE + totalDataSize)
}
