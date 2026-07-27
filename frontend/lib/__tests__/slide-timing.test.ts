/**
 * Tests for slide timing / detectSlide logic.
 *
 * Run: npx tsx --test lib/__tests__/slide-timing.test.ts
 */

import { describe, it } from "node:test"
import assert from "node:assert"

/**
 * Simulates the timeToSlide logic from ViewAudioBar.
 * Primary: uses precise per-slide timings.
 * Fallback: evenly distributes slides when timing data unavailable.
 */
function timeToSlide(
  secs: number,
  timings: { slideNumber: number; startMs: number; endMs: number }[],
  durationSec: number,
  slideCount: number,
): number {
  const ms = secs * 1000

  // Primary: use precise per-slide timings
  if (timings.length > 0) {
    for (const t of timings) {
      if (ms >= t.startMs && ms < t.endMs) return t.slideNumber
    }
    // Past the very end
    const last = timings[timings.length - 1]
    if (ms >= last.endMs) return last.slideNumber
  }

  // Fallback: evenly distribute slides
  const durationMs = durationSec * 1000
  if (durationMs > 0 && slideCount > 0) {
    const slideDurationMs = durationMs / slideCount
    const slideIndex = Math.floor(ms / slideDurationMs)
    return Math.min(slideIndex + 1, slideCount)
  }

  return 0
}

describe("timeToSlide — primary (precise timings)", () => {
  const timings = [
    { slideNumber: 1, startMs: 0, endMs: 5000 },
    { slideNumber: 2, startMs: 5000, endMs: 15000 },
    { slideNumber: 3, startMs: 15000, endMs: 30000 },
    { slideNumber: 4, startMs: 30000, endMs: 40000 },
  ]

  it("returns slide 1 at time 0", () => {
    assert.strictEqual(timeToSlide(0, timings, 40, 4), 1)
  })

  it("returns slide 1 at time just before boundary", () => {
    assert.strictEqual(timeToSlide(4.999, timings, 40, 4), 1)
  })

  it("returns slide 2 at the boundary", () => {
    assert.strictEqual(timeToSlide(5, timings, 40, 4), 2)
  })

  it("returns slide 2 mid-way", () => {
    assert.strictEqual(timeToSlide(10, timings, 40, 4), 2)
  })

  it("returns slide 4 at the end", () => {
    assert.strictEqual(timeToSlide(35, timings, 40, 4), 4)
  })

  it("returns last slide past the end", () => {
    assert.strictEqual(timeToSlide(50, timings, 40, 4), 4)
  })

  it("returns 0 for negative time (can't happen in practice — clamped before detectSlide)", () => {
    assert.strictEqual(timeToSlide(-1, timings, 40, 4), 0)
  })
})

describe("timeToSlide — fallback (even distribution)", () => {
  it("evenly distributes 5 slides in 50 seconds", () => {
    const timings: { slideNumber: number; startMs: number; endMs: number }[] = []
    // 50 seconds ÷ 5 slides = 10 seconds per slide
    assert.strictEqual(timeToSlide(0, timings, 50, 5), 1)     // slide 1
    assert.strictEqual(timeToSlide(5, timings, 50, 5), 1)     // still slide 1
    assert.strictEqual(timeToSlide(10, timings, 50, 5), 2)    // slide 2 boundary
    assert.strictEqual(timeToSlide(15, timings, 50, 5), 2)    // slide 2
    assert.strictEqual(timeToSlide(20, timings, 50, 5), 3)    // slide 3
    assert.strictEqual(timeToSlide(35, timings, 50, 5), 4)    // slide 4
    assert.strictEqual(timeToSlide(49, timings, 50, 5), 5)    // slide 5
  })

  it("returns last slide at the very end", () => {
    assert.strictEqual(timeToSlide(50, [], 50, 5), 5)
  })

  it("returns 0 when no duration data", () => {
    assert.strictEqual(timeToSlide(10, [], 0, 5), 0)
  })

  it("returns 0 when no slide count", () => {
    assert.strictEqual(timeToSlide(10, [], 50, 0), 0)
  })

  it("handles single slide", () => {
    assert.strictEqual(timeToSlide(0, [], 30, 1), 1)
    assert.strictEqual(timeToSlide(30, [], 30, 1), 1)
  })
})

describe("timeToSlide — primary takes priority over fallback", () => {
  const timings = [
    { slideNumber: 1, startMs: 0, endMs: 10000 },
    { slideNumber: 2, startMs: 10000, endMs: 20000 },
  ]

  it("uses primary even when fallback is available", () => {
    assert.strictEqual(timeToSlide(5, timings, 60, 6), 1)
    assert.strictEqual(timeToSlide(15, timings, 60, 6), 2)
  })
})
