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

  console.log("\n✅ ALL TESTS PASSED\n")
}

runTests()
