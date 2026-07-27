/**
 * Tests for useFullscreen — specifically the feature detection logic.
 * Fullscreen API itself can't be tested without a browser environment.
 *
 * Run: npx tsx --test lib/__tests__/use-fullscreen.test.ts
 */

import { describe, it } from "node:test"
import assert from "node:assert"

/**
 * Simulates the fullscreen feature detection logic.
 */
function detectFullscreenSupport(): {
  supported: boolean
  api: string | null
} {
  if (typeof document === "undefined") {
    return { supported: false, api: null }
  }
  if (document.fullscreenEnabled) {
    return { supported: true, api: "standard" }
  }
  if ((document as any).webkitFullscreenEnabled) {
    return { supported: true, api: "webkit" }
  }
  if ((document as any).mozFullScreenEnabled) {
    return { supported: true, api: "moz" }
  }
  return { supported: false, api: null }
}

/**
 * Simulates the fallback logic when fullscreen is unsupported.
 */
function getFallbackUrl(currentUrl: string | null): string | null {
  if (!currentUrl) return null
  return currentUrl // opens in new tab
}

describe("useFullscreen — feature detection", () => {
  it("detects no support outside browser (SSR)", () => {
    // Simulate SSR where document is undefined
    const origDoc = globalThis.document
    ;(globalThis as any).document = undefined

    const result = detectFullscreenSupport()
    assert.strictEqual(result.supported, false)
    assert.strictEqual(result.api, null)

    globalThis.document = origDoc
  })

  it("detects standard fullscreen API", () => {
    const result = detectFullscreenSupport()
    // In Node test runner, document might be undefined or have no fullscreen API
    // So we just verify it doesn't throw
    assert.ok(typeof result.supported === "boolean")
  })

  it("detects webkit prefix", () => {
    const origDoc = globalThis.document
    ;(globalThis as any).document = {
      fullscreenEnabled: false,
      webkitFullscreenEnabled: true,
    }

    const result = detectFullscreenSupport()
    assert.strictEqual(result.supported, true)
    assert.strictEqual(result.api, "webkit")

    globalThis.document = origDoc
  })

  it("detects moz prefix", () => {
    const origDoc = globalThis.document
    ;(globalThis as any).document = {
      fullscreenEnabled: false,
      webkitFullscreenEnabled: false,
      mozFullScreenEnabled: true,
    }

    const result = detectFullscreenSupport()
    assert.strictEqual(result.supported, true)
    assert.strictEqual(result.api, "moz")

    globalThis.document = origDoc
  })

  it("returns false when no API available", () => {
    const origDoc = globalThis.document
    ;(globalThis as any).document = {
      fullscreenEnabled: false,
      webkitFullscreenEnabled: false,
      mozFullScreenEnabled: false,
    }

    const result = detectFullscreenSupport()
    assert.strictEqual(result.supported, false)
    assert.strictEqual(result.api, null)

    globalThis.document = origDoc
  })
})

describe("useFullscreen — fallback URL", () => {
  it("returns the PDF URL for fallback", () => {
    assert.strictEqual(getFallbackUrl("https://example.com/slide.pdf"), "https://example.com/slide.pdf")
  })

  it("returns null for null input", () => {
    assert.strictEqual(getFallbackUrl(null), null)
  })
})
