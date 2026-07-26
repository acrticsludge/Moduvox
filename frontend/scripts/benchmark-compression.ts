/**
 * Compression benchmark — simulates before/after withApiHandler flow.
 *
 * Run BEFORE implementing compression:
 *   npx tsx scripts/benchmark-compression.ts
 *
 * Run AFTER implementing compression:
 *   npx tsx scripts/benchmark-compression.ts
 *
 * Measures:
 *   - Response body size (raw vs compressed)
 *   - Response creation time (before vs after)
 *   - Compression overhead
 */

import { gzipSync, brotliCompressSync } from "node:zlib"
import { randomBytes } from "node:crypto"

// ── Representative payloads matching our actual API endpoints ──

function generateViewerList(count: number) {
  const viewers: Record<string, unknown>[] = []
  for (let i = 0; i < count; i++) {
    viewers.push({
      id: `viewer-${i}`,
      viewer_name: `User ${i}`,
      viewer_email: `user${i}@example.com`,
      email_verified: i % 3 === 0,
      consent_granted: true,
      viewed_at: "2026-07-26T12:00:00.000Z",
      completed_at: i % 2 === 0 ? "2026-07-26T12:30:00.000Z" : null,
      time_spent_seconds: Math.floor(Math.random() * 600),
      progress_pct: Math.floor(Math.random() * 100),
      created_at: "2026-07-26T10:00:00.000Z",
    })
  }
  return { data: { viewers, total: count } }
}

function generateNarration(slideCount: number) {
  const narrations: Record<string, string> = {}
  for (let i = 1; i <= slideCount; i++) {
    narrations[String(i)] =
      "Welcome everyone. Today we will be exploring the key trends shaping our industry this quarter. " +
      "Our analysis shows a significant shift in consumer behavior, with more users moving toward " +
      "digital-first solutions. This presents a unique opportunity for us to capture market share " +
      "by focusing on three key areas: product innovation, customer experience, and operational efficiency. " +
      "Let me walk you through the data that supports this strategy."
  }
  return { data: { narrations } }
}

function generateSlides(count: number) {
  const slides: Record<string, unknown>[] = []
  for (let i = 1; i <= count; i++) {
    slides.push({
      slideNumber: i,
      pdfUrl: `https://r2.example.com/user123/pdf/pres-456/slide-${i}.pdf?X-Amz-Signature=${randomBytes(32).toString("hex")}`,
    })
  }
  return { data: { slideCount: count, slides, completed: true, convertedCount: count } }
}

function generateVoiceList(count: number) {
  const voices: Record<string, unknown>[] = []
  for (let i = 0; i < count; i++) {
    voices.push({
      id: `voice-${i}`,
      name: `Voice ${i}`,
      type: i === 0 ? "preset" : "cloned",
      preset_id: i === 0 ? "21m00Tcm4TlvDq8ikWAM" : null,
      control_instruction: "Speak clearly and naturally with a warm, professional tone",
      sample_path: i === 0 ? null : `voices/user123/sample-${i}.wav`,
      gender: i % 2 === 0 ? "female" : "male",
      is_active: true,
      created_at: "2026-07-26T10:00:00.000Z",
    })
  }
  return { data: voices, total: count }
}

function generateSingleObject() {
  return {
    data: {
      id: "pres-123",
      project_id: "proj-456",
      user_id: "user-789",
      title: "Q3 Market Analysis",
      status: "draft",
      slide_count: 15,
      created_at: "2026-07-26T10:00:00.000Z",
      updated_at: "2026-07-26T11:00:00.000Z",
    },
  }
}

// ── Benchmark harness ──

interface BenchResult {
  label: string
  rawBytes: number
  gzipBytes: number
  brotliBytes: number
  gzipTimeUs: number // microseconds
  brotliTimeUs: number
  responseTimeBeforeUs: number
  responseTimeAfterUs: number
}

function jsonResponse(json: unknown): Response {
  const start = performance.now()
  const body = JSON.stringify(json)
  const res = new Response(body, {
    status: 200,
    headers: { "content-type": "application/json" },
  })
  // Simulate reading the body as text (like withApiHandler does)
  const elapsed = performance.now() - start
  return Object.assign(res, { _body: body, _elapsedUs: Math.round(elapsed * 1000) })
}

function bench(label: string, payload: unknown, iterations = 50): BenchResult {
  const rawBytes = Buffer.byteLength(JSON.stringify(payload), "utf-8")

  // Measure gzip time (average of iterations)
  let gzipTotal = 0
  let brotliTotal = 0
  let gzipResult: Buffer | null = null
  let brotliResult: Buffer | null = null

  for (let i = 0; i < iterations; i++) {
    const json = JSON.stringify(payload)
    const buf = Buffer.from(json, "utf-8")

    const gzStart = performance.now()
    gzipResult = gzipSync(buf, { level: 6 })
    gzipTotal += (performance.now() - gzStart) * 1000

    const brStart = performance.now()
    brotliResult = brotliCompressSync(buf)
    brotliTotal += (performance.now() - brStart) * 1000
  }

  // Measure response creation + read-back (simulating before)
  let responseBeforeTotal = 0
  let responseAfterTotal = 0

  for (let i = 0; i < iterations; i++) {
    // Before: create response, read body text
    const bStart = performance.now()
    const res = new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
    // Simulate what withApiHandler does: must read body for compression
    responseBeforeTotal += (performance.now() - bStart) * 1000

    // After: create response, read body, compress, create new response
    const aStart = performance.now()
    const res2 = new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
    const body = JSON.stringify(payload)
    const compressed = gzipSync(Buffer.from(body, "utf-8"), { level: 6 })
    const compressedRes = new Response(compressed, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-encoding": "gzip",
        "content-length": String(compressed.length),
      },
    })
    responseAfterTotal += (performance.now() - aStart) * 1000
  }

  return {
    label,
    rawBytes,
    gzipBytes: gzipResult?.length ?? 0,
    brotliBytes: brotliResult?.length ?? 0,
    gzipTimeUs: Math.round(gzipTotal / iterations),
    brotliTimeUs: Math.round(brotliTotal / iterations),
    responseTimeBeforeUs: Math.round(responseBeforeTotal / iterations),
    responseTimeAfterUs: Math.round(responseAfterTotal / iterations),
  }
}

// ── Run benchmarks ──

const scenarios = [
  { label: "Single object CRUD", payload: generateSingleObject() },
  { label: "Viewer list (50)", payload: generateViewerList(50) },
  { label: "Viewer list (200 max)", payload: generateViewerList(200) },
  { label: "Narration (15 slides)", payload: generateNarration(15) },
  { label: "Narration (30 slides)", payload: generateNarration(30) },
  { label: "Slides (30 presigned URLs)", payload: generateSlides(30) },
  { label: "Voice list (20)", payload: generateVoiceList(20) },
]

console.log("=".repeat(120))
console.log("COMPRESSION BENCHMARK — withApiHandler flow simulation")
console.log("=".repeat(120))
console.log()
console.log(
  "Scenario".padEnd(30),
  "Raw".padEnd(10),
  "Gzip".padEnd(10),
  "Brotli".padEnd(10),
  "Gzip Δ".padEnd(10),
  "Brotli Δ".padEnd(10),
  "Before(μs)".padEnd(12),
  "After(μs)".padEnd(12),
  "Overhead".padEnd(10),
)
console.log("-".repeat(120))

for (const s of scenarios) {
  const r = bench(s.label, s.payload, 50)
  const gzipRatio = ((1 - r.gzipBytes / r.rawBytes) * 100).toFixed(1)
  const brotliRatio = ((1 - r.brotliBytes / r.rawBytes) * 100).toFixed(1)
  const overhead = r.responseTimeAfterUs - r.responseTimeBeforeUs
  console.log(
    s.label.padEnd(30),
    String(r.rawBytes).padEnd(10),
    String(r.gzipBytes).padEnd(10),
    String(r.brotliBytes).padEnd(10),
    `-${gzipRatio}%`.padEnd(10),
    `-${brotliRatio}%`.padEnd(10),
    String(r.responseTimeBeforeUs).padEnd(12),
    String(r.responseTimeAfterUs).padEnd(12),
    overhead > 0 ? `+${overhead}μs`.padEnd(10) : `${overhead}μs`.padEnd(10),
  )
}

// Summary
console.log()
console.log("─".repeat(120))
console.log("SUMMARY")
console.log("─".repeat(120))

const allResults = scenarios.map((s) => bench(s.label, s.payload, 50))
const totalRaw = allResults.reduce((a, r) => a + r.rawBytes, 0)
const totalGzip = allResults.reduce((a, r) => a + r.gzipBytes, 0)
const totalBrotli = allResults.reduce((a, r) => a + r.brotliBytes, 0)
const totalBefore = allResults.reduce((a, r) => a + r.responseTimeBeforeUs, 0)
const totalAfter = allResults.reduce((a, r) => a + r.responseTimeAfterUs, 0)

console.log(`  Total raw bytes (7 scenarios): ${totalRaw.toLocaleString()} B`)
console.log(`  Total gzip bytes:              ${totalGzip.toLocaleString()} B (${((1 - totalGzip / totalRaw) * 100).toFixed(1)}% smaller)`)
console.log(`  Total brotli bytes:            ${totalBrotli.toLocaleString()} B (${((1 - totalBrotli / totalRaw) * 100).toFixed(1)}% smaller)`)
console.log(`  Avg response time BEFORE:      ${Math.round(totalBefore / allResults.length)} μs`)
console.log(`  Avg response time AFTER:       ${Math.round(totalAfter / allResults.length)} μs`)
console.log(`  Avg compression overhead:      ${Math.round((totalAfter - totalBefore) / allResults.length)} μs per response`)
console.log()
console.log("Note: μs = microseconds. 1,000 μs = 1 ms.")
console.log("The 'after' time includes: JSON.stringify + gzipSync + new Response.")
console.log("The 'before' time includes: JSON.stringify + new Response (no compression).")
console.log()
