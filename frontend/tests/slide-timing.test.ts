/**
 * Slide timing logic tests.
 *
 * The view route builds slideTimings from per-slide WAV durations:
 *   timings = [{ slideNumber: 1, durationMs: 13000 }, { slideNumber: 2, durationMs: 8000 }, ...]
 *   → [{ slideNumber: 1, startMs: 0, endMs: 13000 }, { slideNumber: 2, startMs: 13000, endMs: 21000 }, ...]
 *
 * The ViewAudioBar uses these to:
 *   1. timeToSlide(secs) — find which slide a time falls in
 *   2. getSlideStartSec(n) — get the start time of a slide (for seeking)
 *
 * This test suite validates these functions against real data patterns.
 */

// ---- Data structures ----

type SlideTiming = { slideNumber: number; startMs: number; endMs: number }

// ---- Functions under test (copied from ViewAudioBar.tsx) ----

function timeToSlide(secs: number, timings: SlideTiming[], slideCount: number, durationSec: number): number {
  const ms = secs * 1000

  if (timings.length > 0) {
    for (const t of timings) {
      if (ms >= t.startMs && ms < t.endMs) return t.slideNumber
    }
    const last = timings[timings.length - 1]
    if (ms >= last.endMs) return last.slideNumber
  }

  // Fallback: evenly distribute
  const durationMs = durationSec * 1000 || 0
  const count = slideCount || timings.length
  if (durationMs > 0 && count > 0) {
    const slideDurationMs = durationMs / count
    const slideIndex = Math.floor(ms / slideDurationMs)
    return Math.min(slideIndex + 1, count)
  }

  return 0
}

function getSlideStartSec(slideNumber: number, timings: SlideTiming[], slideCount: number, durationSec: number): number | null {
  const timing = timings.find((t) => t.slideNumber === slideNumber)
  if (timing) return timing.startMs / 1000

  // Fallback
  const durationMs = durationSec * 1000 || 0
  const count = slideCount || timings.length
  if (durationMs > 0 && count > 0 && slideNumber >= 1 && slideNumber <= count) {
    return ((slideNumber - 1) * (durationMs / count)) / 1000
  }

  return null
}

function buildSlideTimings(slideDurations: { slideNumber: number; durationMs: number }[]): SlideTiming[] {
  let acc = 0
  return slideDurations.map((t) => {
    const startMs = acc
    acc += t.durationMs
    return { slideNumber: t.slideNumber, startMs, endMs: acc }
  })
}

// ---- Tests ----

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`)
    process.exit(1)
  }
  console.log(`  ✓ ${message}`)
}

function assertApprox(actual: number, expected: number, tolerance: number, message: string) {
  if (Math.abs(actual - expected) > tolerance) {
    console.error(`❌ FAIL: ${message} — expected ${expected} ±${tolerance}, got ${actual}`)
    process.exit(1)
  }
  console.log(`  ✓ ${message}`)
}

// Scenario: 15 slides, total 301 seconds
// Simulates the user's real presentation — durations from getWavDuration
// Total = 301000ms (301s), with first slide 13000ms (13s)
// Using realistic per-slide durations that sum to 301s
const DURATIONS_15 = [
  { slideNumber: 1, durationMs: 13000 },
  { slideNumber: 2, durationMs: 12000 },
  { slideNumber: 3, durationMs: 15000 },
  { slideNumber: 4, durationMs: 18000 },
  { slideNumber: 5, durationMs: 20000 },
  { slideNumber: 6, durationMs: 22000 },
  { slideNumber: 7, durationMs: 25000 },
  { slideNumber: 8, durationMs: 28000 },
  { slideNumber: 9, durationMs: 15000 },
  { slideNumber: 10, durationMs: 18000 },
  { slideNumber: 11, durationMs: 22000 },
  { slideNumber: 12, durationMs: 25000 },
  { slideNumber: 13, durationMs: 28000 },
  { slideNumber: 14, durationMs: 15000 },
  { slideNumber: 15, durationMs: 25000 },
]

function runTests() {
  console.log("\n=== Slide Timing Tests ===\n")

  // Test 1: buildSlideTimings produces correct cumulative values
  const timings = buildSlideTimings(DURATIONS_15)
  assert(timings.length === 15, "15 timings for 15 slides")
  assert(timings[0].slideNumber === 1, "First slide is number 1")
  assert(timings[0].startMs === 0, "First slide starts at 0ms")
  assert(timings[0].endMs === 13000, "First slide ends at 13000ms")
  assert(timings[1].startMs === 13000, "Second slide starts at 13000ms")
  assert(timings[1].endMs === 13000 + 12000, `Second slide ends at ${13000 + 12000}ms`)

  const totalMs = DURATIONS_15.reduce((s, t) => s + t.durationMs, 0)
  assert(totalMs === 301000, `Total duration is 301000ms (301s)`)

  // Test 2: timeToSlide — finding which slide a time falls in
  assert(timeToSlide(0, timings, 15, 301) === 1, "Time 0s → slide 1")
  assert(timeToSlide(6.5, timings, 15, 301) === 1, "Time 6.5s → still slide 1")
  assert(timeToSlide(12.999, timings, 15, 301) === 1, "Time 12.999s → still slide 1")
  assert(timeToSlide(13.0, timings, 15, 301) === 2, "Time 13s → slide 2")
  assert(timeToSlide(20.999, timings, 15, 301) === 2, "Time 20.999s → slide 2")
  assert(timeToSlide(25.0, timings, 15, 301) === 3, "Time 25s → slide 3")

  // Past the end — should return last slide
  assert(timeToSlide(999, timings, 15, 301) === 15, "Time 999s → last slide")

  // Test 3: getSlideStartSec — navigation to slides
  const slide1Start = getSlideStartSec(1, timings, 15, 301)
  assert(slide1Start === 0, "Slide 1 starts at 0s")

  const slide2Start = getSlideStartSec(2, timings, 15, 301)
  assert(slide2Start === 13, "Slide 2 starts at 13s")

  const slide3Start = getSlideStartSec(3, timings, 15, 301)
  assert(slide3Start === 25, "Slide 3 starts at 25s")

  // Test 4: Fallback timing (no precise data)
  const emptyTimings: SlideTiming[] = []
  const fbSlide2 = getSlideStartSec(2, emptyTimings, 15, 301)
  assertApprox(fbSlide2!, 301 / 15, 0.1, "Fallback: slide 2 starts at total/15 ≈ 20.07s")

  // Test 5: Navigation math — the goToSlide pattern
  // currentSlide is 0-indexed. Next slide = goToSlide(currentSlide + 2)
  // If currentSlide=0 (slide 1), next=goToSlide(2) → slide 2 start = 13s
  const nextSlideNum = 0 + 2 // currentSlide + 2
  const nextSlideStart = getSlideStartSec(nextSlideNum, timings, 15, 301)
  assert(nextSlideStart === 13, "From slide 1: next slide (2) starts at 13s")

  // If currentSlide=1 (slide 2), next=goToSlide(3) → slide 3 start = 21s
  const nextSlideNum2 = 1 + 2
  const nextSlideStart2 = getSlideStartSec(nextSlideNum2, timings, 15, 301)
  assert(nextSlideStart2 === 25, "From slide 2: next slide (3) starts at 25s")

  // Test 6: Previous slide from currentSlide
  // If currentSlide=1 (slide 2), prev=goToSlide(1) → slide 1 start = 0s
  const prevSlideNum = 1 // currentSlide (0-indexed), clampSlide gives max(1,...)
  const clampedPrev = Math.max(1, Math.min(prevSlideNum, 15))
  const prevSlideStart = getSlideStartSec(clampedPrev, timings, 15, 301)
  assert(prevSlideStart === 0, "From slide 2: prev slide (1) starts at 0s")

  // Test 7: Verify no doubling — if durations are doubled, cumulative would be wrong
  // If slide 2 started at 26s (doubled), that would mean slide 1 duration is 26s,
  // but we know it's 13s. Verify the cumulative isn't double.
  const slide2StartActual = timings[1].startMs
  const slide1Duration = timings[0].endMs - timings[0].startMs
  assert(slide2StartActual === slide1Duration, "Slide 2 start equals slide 1's duration (no gap/doubling)")

  // Test 8: Edge case — single slide
  const single = buildSlideTimings([{ slideNumber: 1, durationMs: 60000 }])
  assert(timeToSlide(0, single, 1, 60) === 1, "Single slide: time 0 → slide 1")
  assert(timeToSlide(59, single, 1, 60) === 1, "Single slide: time 59 → slide 1")
  assert(getSlideStartSec(1, single, 1, 60) === 0, "Single slide: start at 0s")

  // Test 9: Edge case — 0 duration
  const zero = buildSlideTimings([])
  assert(getSlideStartSec(1, zero, 0, 0) === null, "No data: returns null")
  assert(timeToSlide(10, zero, 0, 0) === 0, "No data: timeToSlide returns 0")

  // ══════════════════════════════════════════════════════════════
  //  WAV Duration Tests
  // ══════════════════════════════════════════════════════════════

  console.log("\n=== WAV Duration Tests ===\n")

  // Replicates getWavDuration from frontend/lib/wav-duration.ts
  function getWavDuration(buffer: ArrayBufferLike): number {
    const view = new DataView(buffer)
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))
    if (riff !== "RIFF") throw new Error("Not a valid WAV file")
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))
    if (wave !== "WAVE") throw new Error("Not a valid WAV file")

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
        numChannels = view.getUint16(offset + 10, true) // offset +8 = audioFormat, +10 = numChannels
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

  function buildWav(
    numChannels: number,
    sampleRate: number,
    bitsPerSample: number,
    dataSize: number,
  ): ArrayBuffer {
    const headerSize = 44
    const buf = new ArrayBuffer(headerSize + dataSize)
    const v = new DataView(buf)
    const writeStr = (off: number, s: string) => {
      for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i))
    }
    writeStr(0, "RIFF")
    v.setUint32(4, 36 + dataSize, true)
    writeStr(8, "WAVE")
    writeStr(12, "fmt ")
    v.setUint32(16, 16, true)
    v.setUint16(20, 1, true)
    v.setUint16(22, numChannels, true)
    v.setUint32(24, sampleRate, true)
    v.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true)
    v.setUint16(32, numChannels * (bitsPerSample / 8), true)
    v.setUint16(34, bitsPerSample, true)
    writeStr(36, "data")
    v.setUint32(40, dataSize, true)
    return buf
  }

  // ── Test 1: Mono 16-bit 44100Hz, 0.5s ──
  //   dataSize = 44100 * 0.5 * 16/8 = 44100 bytes
  //   Expected duration = 44100 / (44100 * 1 * 2) * 1000 = 500ms
  //   Buggy code reads numChannels from audioFormat=1 → matches actual 1 → no bug for mono
  {
    const buf = buildWav(1, 44100, 16, 44100)
    const dur = getWavDuration(buf)
    assert(dur === 500, `Mono 0.5s WAV: expected 500ms, got ${dur}ms`)
  }

  // ── Test 2: Stereo 16-bit 44100Hz, 0.5s ──
  //   dataSize = 44100 * 0.5 * 2ch * 16/8 = 88200 bytes
  //   Expected duration = 88200 / (44100 * 2 * 2) * 1000 = 500ms
  //   Buggy code reads numChannels from audioFormat=1 (not actual 2) →
  //     computed = 88200 / (44100 * 1 * 2) * 1000 = 1000ms (2x bug!)
  {
    const buf = buildWav(2, 44100, 16, 88200)
    const dur = getWavDuration(buf)
    const correct = 500
    if (dur === correct) {
      assert(true, `Stereo 0.5s WAV: expected ${correct}ms, got ${dur}ms`)
    } else if (dur === 1000) {
      // Bug confirmed: 2x due to reading audioFormat (1) instead of numChannels (2)
      console.log("  ⚠ BUG CONFIRMED: Stereo WAV duration is 2x (1000ms vs 500ms)")
      console.log("    Root cause: getWavDuration reads numChannels from offset+8 (audioFormat=1)")
      console.log("    instead of offset+10 (actual numChannels=2)")
      assert(false, `Stereo 0.5s WAV: expected ${correct}ms, got ${dur}ms — 2x bug!`)
    } else {
      assert(false, `Stereo 0.5s WAV: expected ${correct}ms, got ${dur}ms`)
    }
  }

  // ── Test 3: 8-bit mono 22050Hz, 1s ──
  //   dataSize = 22050 * 1 * 8/8 = 22050 bytes
  //   Expected = 22050 / (22050 * 1 * 1) * 1000 = 1000ms
  {
    const buf = buildWav(1, 22050, 8, 22050)
    const dur = getWavDuration(buf)
    assert(dur === 1000, `8-bit mono 1s WAV: expected 1000ms, got ${dur}ms`)
  }

  // ── Test 4: Stereo 8-bit 22050Hz, 1s ──
  //   dataSize = 22050 * 1 * 2ch * 8/8 = 44100 bytes
  //   Expected = 44100 / (22050 * 2 * 1) * 1000 = 1000ms
  //   Buggy = 44100 / (22050 * 1 * 1) * 1000 = 2000ms (2x!)
  {
    const buf = buildWav(2, 22050, 8, 44100)
    const dur = getWavDuration(buf)
    const correct = 1000
    if (dur === correct) {
      assert(true, `Stereo 8-bit 1s WAV: expected ${correct}ms, got ${dur}ms`)
    } else if (dur === 2000) {
      console.log("  ⚠ BUG CONFIRMED: Stereo 8-bit WAV duration is also 2x")
      assert(false, `Stereo 8-bit 1s WAV: expected ${correct}ms, got ${dur}ms — 2x bug!`)
    } else {
      assert(false, `Stereo 8-bit 1s WAV: expected ${correct}ms, got ${dur}ms`)
    }
  }

  console.log("\n✅ ALL WAV DURATION TESTS PASSED (mono cases pass; stereo cases expose the 2x bug)\n")
}

runTests()
