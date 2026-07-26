/**
 * Unit tests for compressResponse behavior in withApiHandler.
 *
 * Run: npx tsx --test lib/__tests__/compress-response.test.ts
 */

import { describe, it } from "node:test"
import assert from "node:assert"
import { gzipSync, gunzipSync } from "node:zlib"

import { NextResponse } from "next/server"
import { compressResponse } from "../api-handler"

function makeJsonResponse(data: unknown, status = 200, customHeaders?: Record<string, string>) {
  return NextResponse.json(data, {
    status,
    headers: customHeaders,
  })
}

// ── Tests ──

describe("compressResponse", () => {
  it("compresses JSON responses ≥ 1 KB", async () => {
    // Generate a payload just over 1 KB
    const largePayload = { data: { items: new Array(50).fill(null).map((_, i) => ({ id: i, name: `Item ${i}`, description: "A".repeat(40) })) } }
    const raw = JSON.stringify(largePayload)
    assert(raw.length >= 1024, `Test payload must be ≥1024 bytes (was ${raw.length})`)

    const response = makeJsonResponse(largePayload)
    const compressed = await compressResponse(response)

    // Should be compressed
    assert(compressed.headers.get("content-encoding") === "gzip", "Expected Content-Encoding: gzip")

    // Body should be smaller
    const compressedBody = await compressed.arrayBuffer()
    assert(compressedBody.byteLength < raw.length, "Compressed body should be smaller than raw")

    // Decompress and verify content matches original
    const decompressed = gunzipSync(Buffer.from(compressedBody))
    assert.strictEqual(decompressed.toString("utf-8"), raw, "Decompressed body should match original")
  })

  it("does NOT compress JSON responses < 1 KB", async () => {
    const smallPayload = { data: { id: "123", name: "test" } }
    const raw = JSON.stringify(smallPayload)
    assert(raw.length < 1024, `Test payload must be <1024 bytes (was ${raw.length})`)

    const response = makeJsonResponse(smallPayload)
    const result = await compressResponse(response)

    // Should NOT have Content-Encoding
    assert(!result.headers.has("content-encoding"), "Small responses should not have Content-Encoding")
    assert(result === response, "Small responses should pass through unchanged (same reference)")
  })

  it("does NOT compress non-JSON responses", async () => {
    const response = new NextResponse(JSON.stringify({ data: "test" }), {
      status: 200,
      headers: { "content-type": "text/plain" },
    })
    const result = await compressResponse(response)
    assert(result === response, "Non-JSON responses should pass through unchanged")
  })

  it("does NOT compress error responses (4xx/5xx)", async () => {
    const payload = { error: "Not found" }
    const raw = JSON.stringify(payload)
    // Pad to ≥1 KB so it would be compressed if not for status
    const paddedPayload = { error: "Not found", details: "x".repeat(1024 - raw.length) }

    const response = makeJsonResponse(paddedPayload, 404)
    const result = await compressResponse(response)
    assert(result === response, "Error responses should pass through unchanged")
  })

  it("sets Vary: Accept-Encoding header on compressed responses", async () => {
    const largePayload = { data: new Array(50).fill("x".repeat(50)) }

    const response = makeJsonResponse(largePayload)
    const compressed = await compressResponse(response)

    const vary = compressed.headers.get("vary")
    assert(vary?.includes("Accept-Encoding"), `Vary header should include Accept-Encoding (got: ${vary})`)
  })

  it("does NOT double-compress if already compressed", async () => {
    const payload = { data: "x".repeat(200) }
    const alreadyCompressed = new NextResponse(gzipSync(Buffer.from(JSON.stringify(payload))), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-encoding": "gzip",
      },
    })
    const result = await compressResponse(alreadyCompressed)
    // Should pass through unchanged
    assert(result === alreadyCompressed, "Already-compressed responses should pass through")
  })
})
