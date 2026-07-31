/**
 * Port of frontend/lib/wav-utils.ts for Node.js worker.
 * Plain JS — no TypeScript build step needed.
 */

/**
 * Walk a WAV buffer to find the byte offset where the "data" chunk starts.
 * Standard WAVs have `fmt ` at 12 and `data` at 36, but some tools insert
 * extra chunks (fact, list, cue, etc.) between fmt and data.
 * @param {Buffer} buf
 * @returns {number} byte offset of the PCM data, or -1 if not found
 */
function findDataOffset(buf) {
  let offset = 12
  while (offset + 8 < buf.length) {
    const chunkId = buf.toString("ascii", offset, offset + 4)
    const chunkSize = buf.readUInt32LE(offset + 4)
    if (chunkId === "data") {
      return offset + 8
    }
    offset += 8 + chunkSize
    if (chunkSize % 2 !== 0) offset += 1
  }
  return -1
}

/**
 * Validate that a buffer is a readable PCM WAV.
 * @param {Buffer} buf
 * @returns {boolean}
 */
export function isValidWav(buf) {
  if (buf.length < 44) return false
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

/**
 * Concatenate multiple valid WAV buffers into one.
 * @param {Buffer[]} buffers
 * @returns {Buffer}
 */
export function concatWavBuffers(buffers) {
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

  const pcmChunks = valid.map((buf) => {
    const dataOff = findDataOffset(buf)
    if (dataOff === -1) throw new Error("No data chunk found in WAV buffer")
    return buf.subarray(dataOff)
  })

  const totalDataSize = pcmChunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const combined = Buffer.concat(pcmChunks, totalDataSize)

  const headerLen = 44
  const header = Buffer.alloc(headerLen)
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

  return Buffer.concat([header, combined], headerLen + totalDataSize)
}
