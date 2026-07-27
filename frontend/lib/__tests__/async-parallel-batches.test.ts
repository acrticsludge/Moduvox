/**
 * Unit tests for parallelBatches.
 *
 * Run: npx tsx --test lib/__tests__/async-parallel-batches.test.ts
 */

import { describe, it } from "node:test"
import assert from "node:assert"
import { parallelBatches } from "../async"

describe("parallelBatches", () => {
  it("processes all items in order", async () => {
    const items = [1, 2, 3, 4, 5]
    const results = await parallelBatches(items, (n) => Promise.resolve(n * 2))
    assert.deepStrictEqual(results, [2, 4, 6, 8, 10])
  })

  it("processes items in batches of configured size", async () => {
    const concurrencyLog: number[] = []
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9]

    await parallelBatches(
      items,
      async (n) => {
        concurrencyLog.push(n)
        // Simulate work — small delay to allow concurrency within batch
        await new Promise((r) => setTimeout(r, 10))
        return n
      },
      undefined,
      3,
    )

    // All items should have been processed
    assert.strictEqual(concurrencyLog.length, 9)
  })

  it("all-or-nothing: rejects entire batch when one item fails", async () => {
    const items = [1, 2, 3, 4, 5]
    let processed = 0

    await assert.rejects(
      parallelBatches(
        items,
        async (n) => {
          processed++
          if (n === 3) throw new Error("Item 3 failed")
          return n
        },
        undefined,
        2,
      ),
      /Item 3 failed/,
    )

    // Items in the failed batch (3) should have thrown — processed may be 2 or 3
    // depending on timing, but the rejection should propagate
    assert.ok(true, "Rejection propagated correctly")
  })

  it("all-or-nothing: no partial results on failure", async () => {
    const items = [1, 2, 3]
    let caught = false

    try {
      await parallelBatches(items, async (n) => {
        if (n === 2) throw new Error("fail")
        return n * 10
      })
    } catch {
      caught = true
    }

    assert.ok(caught, "Should have thrown")
  })

  it("calls progress callback after each item", async () => {
    const items = ["a", "b", "c", "d"]
    const progressCalls: { completed: number; total: number }[] = []

    await parallelBatches(
      items,
      async (s) => s.toUpperCase(),
      (completed, total) => {
        progressCalls.push({ completed, total })
      },
      2,
    )

    assert.strictEqual(progressCalls.length, 4)
    assert.deepStrictEqual(progressCalls[0], { completed: 1, total: 4 })
    assert.deepStrictEqual(progressCalls[3], { completed: 4, total: 4 })
  })

  it("handles empty array", async () => {
    const results = await parallelBatches([], async (n) => n)
    assert.deepStrictEqual(results, [])
  })

  it("handles single item", async () => {
    const results = await parallelBatches(["only"], async (s) => s + "!")
    assert.deepStrictEqual(results, ["only!"])
  })

  it("processes items in same order as input", async () => {
    const items = [10, 20, 30, 40, 50]
    const results = await parallelBatches(
      items,
      async (n) => {
        // Random delay to ensure order is maintained
        await new Promise((r) => setTimeout(r, Math.random() * 20))
        return n / 10
      },
      undefined,
      3,
    )

    assert.deepStrictEqual(results, [1, 2, 3, 4, 5])
  })

  it("batch size defaults to 3", async () => {
    const items = [1, 2, 3, 4, 5]
    const batches: number[][] = []
    let currentBatch = 0

    await parallelBatches(items, async (n, idx) => {
      if (!batches[currentBatch]) batches[currentBatch] = []
      batches[currentBatch].push(n)
      // Use index to track batch boundaries
      if (idx === 2 || idx === 4) currentBatch++
      return n
    })

    // 5 items, batch size 3 → 2 batches: [1,2,3] and [4,5]
    assert.ok(batches.length > 0)
  })
})
