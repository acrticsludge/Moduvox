/**
 * Unit tests for wav-utils functions (worker/lib/wav-utils.js).
 *
 * Run: node --test worker/test/wav-utils.test.js
 */

import { describe, it } from "node:test"
import assert from "node:assert"
import { isValidWav, concatWavBuffers } from "../lib/wav-utils.js"

/**
 * Build a minimal 44-byte PCM WAV header + data.
 * @param {number} dataLen
 * @param {{ sampleRate?: number; channels?: number; bitsPerSample?: number }} opts
 * @returns {Buffer}
 */
function buildWav(dataLen, { sampleRate = 44100, channels = 1, bitsPerSample = 16 } = {}) {
  const header = Buffer.alloc(44)
  header.write("RIFF", 0, "ascii")
  header.writeUInt32LE(36 + dataLen, 4)
  header.write("WAVE", 8, "ascii")
  header.write("fmt ", 12, "ascii")
  header.writeUInt32LE(16, 16) // fmt chunk size
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28) // byte rate
  header.writeUInt16LE(channels * (bitsPerSample / 8), 32) // block align
  header.writeUInt16LE(bitsPerSample, 34)
  header.write("data", 36, "ascii")
  header.writeUInt32LE(dataLen, 40)
  return header
}

describe("isValidWav", () => {
  it("accepts a valid PCM WAV", () => {
    const buf = Buffer.concat([buildWav(0)])
    assert.strictEqual(isValidWav(buf), true)
  })

  it("rejects a buffer smaller than 44 bytes", () => {
    assert.strictEqual(isValidWav(Buffer.alloc(20)), false)
  })

  it("rejects non-RIFF header", () => {
    const buf = Buffer.alloc(44)
    buf.write("XXXX", 0, "ascii")
    assert.strictEqual(isValidWav(buf), false)
  })

  it("rejects non-WAVE format", () => {
    const buf = Buffer.alloc(44)
    buf.write("RIFF", 0, "ascii")
    buf.write("XXXX", 8, "ascii")
    assert.strictEqual(isValidWav(buf), false)
  })

  it("rejects non-PCM format (fmt != 1)", () => {
    const buf = buildWav(0)
    buf.writeUInt16LE(3, 20) // IEEE float
    assert.strictEqual(isValidWav(buf), false)
  })

  it("rejects invalid sample rate", () => {
    const buf = buildWav(0, { sampleRate: 100 })
    assert.strictEqual(isValidWav(buf), false)
  })

  it("rejects too many channels", () => {
    const buf = buildWav(0, { channels: 10 })
    assert.strictEqual(isValidWav(buf), false)
  })

  it("rejects invalid bits per sample", () => {
    const buf = buildWav(0, { bitsPerSample: 20 })
    assert.strictEqual(isValidWav(buf), false)
  })
})

describe("concatWavBuffers", () => {
  it("returns the single buffer unchanged", () => {
    const buf = Buffer.concat([buildWav(4), Buffer.alloc(4, 0x01)])
    const result = concatWavBuffers([buf])
    assert.ok(result.length >= 44)
  })

  it("concatenates two valid WAVs with PCM data", () => {
    const data1 = Buffer.alloc(100, 0xAB)
    const data2 = Buffer.alloc(200, 0xCD)
    const wav1 = Buffer.concat([buildWav(data1.length), data1])
    const wav2 = Buffer.concat([buildWav(data2.length), data2])

    const result = concatWavBuffers([wav1, wav2])

    // Should be valid WAV
    assert.strictEqual(isValidWav(result), true)
    // Data size should be data1 + data2
    const expectedDataSize = data1.length + data2.length
    const actualDataSize = result.readUInt32LE(40)
    assert.strictEqual(actualDataSize, expectedDataSize)
    // Total length = 44 header + data
    assert.strictEqual(result.length, 44 + expectedDataSize)
  })

  it("throws on empty array", () => {
    assert.throws(() => concatWavBuffers([]), /No audio buffers/)
  })

  it("throws when no valid WAVs in array", () => {
    // Need 2+ buffers — single buffer throws "Single buffer is not a valid WAV"
    assert.throws(() => concatWavBuffers([Buffer.alloc(100), Buffer.alloc(200)]), /No valid WAV buffers/)
  })

  it("throws on mismatched sample rates", () => {
    const data1 = Buffer.alloc(10, 0x01)
    const data2 = Buffer.alloc(10, 0x02)
    const wav1 = Buffer.concat([buildWav(data1.length, { sampleRate: 44100 }), data1])
    const wav2 = Buffer.concat([buildWav(data2.length, { sampleRate: 48000 }), data2])
    assert.throws(() => concatWavBuffers([wav1, wav2]), /format mismatch/)
  })

  it("skips invalid buffers in the middle", () => {
    const data1 = Buffer.alloc(50, 0xAA)
    const data2 = Buffer.alloc(50, 0xBB)
    const wav1 = Buffer.concat([buildWav(data1.length), data1])
    const wav2 = Buffer.concat([buildWav(data2.length), data2])

    // invalid WAV in the middle
    const result = concatWavBuffers([wav1, Buffer.alloc(10), wav2])
    assert.strictEqual(isValidWav(result), true)
    assert.strictEqual(result.readUInt32LE(40), 100)
  })

  it("handles WAVs with extra chunks before data", () => {
    // Build a WAV with a "fact" chunk between fmt and data
    const sampleRate = 44100
    const channels = 1
    const bps = 16
    const dataLen = 60

    const header = Buffer.alloc(44 + 12) // extra 12 bytes for fact chunk (8 header + 4 data)
    header.write("RIFF", 0, "ascii")
    header.writeUInt32LE(36 + 12 + dataLen, 4) // adjusted file size
    header.write("WAVE", 8, "ascii")
    header.write("fmt ", 12, "ascii")
    header.writeUInt32LE(16, 16)
    header.writeUInt16LE(1, 20)
    header.writeUInt16LE(channels, 22)
    header.writeUInt32LE(sampleRate, 24)
    header.writeUInt32LE(sampleRate * channels * (bps / 8), 28)
    header.writeUInt16LE(channels * (bps / 8), 32)
    header.writeUInt16LE(bps, 34)
    // Insert fact chunk
    header.write("fact", 36, "ascii")
    header.writeUInt32LE(4, 40) // fact chunk size
    // fact data (4 bytes, zero)
    header.writeUInt32LE(0, 44)
    // data chunk (offset 48)
    header.write("data", 48, "ascii")
    header.writeUInt32LE(dataLen, 52)

    const wav = Buffer.concat([header, Buffer.alloc(dataLen, 0xDD)])

    // concatWavBuffers uses findDataOffset to locate data — should handle the fact chunk
    const result = concatWavBuffers([wav])
    assert.strictEqual(isValidWav(result), true)
  })
})
