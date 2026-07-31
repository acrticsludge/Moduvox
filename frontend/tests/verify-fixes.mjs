/**
 * Verification script for emergency fixes (2026-07-31).
 *
 * Tests:
 * 1. PDF worker file restored in public/
 * 2. View page prefetch sets workerSrc before getDocument()
 * 3. Editor page has slide_count fallback for corrupted editor_state
 *
 * Usage: node tests/verify-fixes.mjs
 */

import { readFileSync, existsSync, statSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const FRONTEND = resolve(__dirname, "..")
let failures = 0
let passed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`)
    passed++
  } else {
    console.error(`  FAIL: ${message}`)
    failures++
  }
}

// ─── Test 1: PDF worker file ────────────────────────────────────────────
console.log("\n── Test 1: PDF worker file")

const workerPath = resolve(FRONTEND, "public", "pdf.worker.min.mjs")
assert(existsSync(workerPath), "pdf.worker.min.mjs exists in public/")

if (existsSync(workerPath)) {
  const stat = statSync(workerPath)
  assert(stat.size > 100_000, `pdf.worker.min.mjs is >100KB (actual: ${(stat.size / 1024).toFixed(0)}KB)`)

  const content = readFileSync(workerPath, "utf-8")
  assert(
    content.includes("pdfjsWorker") || content.includes("pdfjs"),
    "pdf.worker.min.mjs contains pdfjs worker code",
  )

  // Check it's not the CDN redirect or HTML error page
  assert(!content.startsWith("<!DOCTYPE"), "pdf.worker.min.mjs is not HTML")
}

// ─── Test 2: View page workerSrc ────────────────────────────────────────
console.log("\n── Test 2: View page prefetchAllSlideBlobs workerSrc")

const viewPage = readFileSync(
  resolve(FRONTEND, "app", "view", "[shareToken]", "page.tsx"),
  "utf-8",
)

// Check workerSrc is set UNCONDITIONALLY (no guard — react-pdf already sets
// a truthy 'pdf.worker.mjs' default before our code runs)
const hasWorkerConfig = viewPage.includes('pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"')
assert(hasWorkerConfig, "prefetchAllSlideBlobs sets workerSrc after pdfjs import")

// Verify NO guard (guard would prevent override because react-pdf sets a truthy default first)
const hasNoGuard = !viewPage.includes("if (!pdfjs.GlobalWorkerOptions.workerSrc)")
assert(hasNoGuard, "prefetchAllSlideBlobs does NOT guard workerSrc (must always override react-pdf default)")

// Verify workerSrc is set BEFORE getDocument
const importIdx = viewPage.indexOf('await import("react-pdf")')
const workerIdx = viewPage.indexOf('pdfjs.GlobalWorkerOptions.workerSrc')
const getDocIdx = viewPage.indexOf("pdfjs.getDocument")

assert(importIdx > 0, "react-pdf import found in view page")
assert(workerIdx > importIdx, "workerSrc set AFTER react-pdf import")
assert(getDocIdx > workerIdx, "getDocument called AFTER workerSrc is set")

// ─── Test 3: Editor recovery ────────────────────────────────────────────
console.log("\n── Test 3: Editor page slide_count recovery")

const editorPage = readFileSync(
  resolve(
    FRONTEND,
    "app",
    "dashboard",
    "projects",
    "[id]",
    "presentations",
    "[presentationId]",
    "page.tsx",
  ),
  "utf-8",
)

// Check the recovery branch exists
const hasRecovery = editorPage.includes('else if ((p.slide_count ?? 0) > 0)')
assert(hasRecovery, "Editor page has slide_count fallback when storagePath missing")

// Check the recovery message
const hasRecoveryComment = editorPage.includes("Recovery: editor_state.storagePath was lost")
assert(hasRecoveryComment, "Editor page has recovery comment explaining the fallback")

// Check the recovered path construction
const hasRecoveredPath = editorPage.includes("${p.user_id}/${params.presentationId}.pptx")
assert(hasRecoveredPath, "Editor page reconstructs conventional R2 key for recovery")

// Check that storagePath normal path still works
const hasNormalPath = editorPage.includes("if (saved.storagePath)")
assert(hasNormalPath, "Editor page still checks storagePath first (normal path)")

// Check mode is set to editor in recovery branch
const setsEditorMode = editorPage.includes("setMode(\"editor\")")
assert(setsEditorMode, "Editor page sets mode to 'editor'")

// Check placeholder slide data is created when slideData was also lost
const hasPlaceholderSlides = editorPage.includes("placeholderSlides")
assert(hasPlaceholderSlides, "Editor page creates placeholder slideData from slide_count when lost")
// Verify the Array.from is driven by p.slide_count (whitespace-insensitive check)
const hasSlideCount = /Array\.from[\s\S]*?p\.slide_count/.test(editorPage)
assert(hasSlideCount, "Placeholder slides use p.slide_count as array length")

// ─── Summary ─────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(50)}`)
console.log(`Results: ${passed} passed, ${failures} failed`)
if (failures > 0) {
  console.error("SOME TESTS FAILED — review before deploying")
  process.exit(1)
} else {
  console.log("All tests passed!")
}
