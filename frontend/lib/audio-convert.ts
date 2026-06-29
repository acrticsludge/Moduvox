import { execFile } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"
import os from "os"

const execFileAsync = promisify(execFile)

// ffmpeg-static exports a string path to the binary
let ffmpegPath: string | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ffmpegPath = require("ffmpeg-static") as string
} catch {
  // ffmpeg not available — conversion will be skipped
}

/**
 * Convert an audio buffer to PCM WAV format using FFmpeg.
 * If FFmpeg is not available, returns the original buffer unchanged.
 */
export async function toWav(input: Buffer, _inputFormat?: string): Promise<Buffer> {
  if (!ffmpegPath) return input

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "voxcpm-"))
  const inPath = path.join(tmpDir, "input")
  const outPath = path.join(tmpDir, "output.wav")

  try {
    fs.writeFileSync(inPath, input)
    await execFileAsync(ffmpegPath, [
      "-y",
      "-i", inPath,
      "-acodec", "pcm_s16le",
      "-ar", "24000",
      "-ac", "1",
      outPath,
    ], { timeout: 30000 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Buffer.from(fs.readFileSync(outPath) as any)
  } finally {
    // Cleanup temp files
    try { fs.rmSync(tmpDir, { recursive: true }) } catch { /* ignore */ }
  }
}
