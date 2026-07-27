# Plan: Parallel VoxCpm Audio Generation (All-or-Nothing)

## Implementation Order

### Step 1: Extract parallel batch utility
**File:** `frontend/lib/async.ts` (new)

```typescript
/**
 * Process items in parallel batches with all-or-nothing semantics.
 * If any item in a batch rejects, the entire batch fails immediately
 * (remaining items in that batch are abandoned, not cancelled).
 */
export async function parallelBatches<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  batchSize = 3,
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map((item, batchIndex) => fn(item, i + batchIndex)),
    )
    results.push(...batchResults)
  }
  return results
}
```

Use `Promise.all` (not `allSettled`) — one failure rejects the entire batch.

### Step 2: Rewrite `runAudioGeneration()` loop
**File:** `frontend/components/dashboard/SlideEditor.tsx`

Replace the sequential `for` loop:

**Before:**
```typescript
for (let i = 0; i < slideTexts.length; i++) {
  setAudioGenProgress({ current: i + 1, total: slideTexts.length, slideTitle: slideTexts[i].title })
  try {
    const res = await fetch("/api/generate/audio/slide", { ... })
    if (!res.ok) throw new Error(...)
  } catch (err) {
    failedCount++
  }
}
```

**After:**
```typescript
try {
  await parallelBatches(slideTexts, async (slide, idx) => {
    setAudioGenProgress({ current: idx + 1, total: slideTexts.length, slideTitle: slide.title })
    const res = await fetch("/api/generate/audio/slide", { ... })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(typeof json.error === "string" ? json.error : `Slide ${slide.number} failed`)
    }
  }, 3)
  // All succeeded
  setGenerationSummary({ success: slideTexts.length, failed: 0 })
  // ... set audio URL, mark generated, etc.
} catch (err) {
  // One slide failed — entire generation fails
  const message = err instanceof Error ? err.message : "Audio generation failed"
  setAudioGenError(message)
  setAudioGenFailed(true)
  setRegenStep("complete")
}
```

### Step 3: Rewrite `handleGenerate()` loop
**File:** `frontend/components/dashboard/SlideEditor.tsx`

Same pattern as step 2 — replace sequential loop with `parallelBatches` in a try/catch that sets `generationSummary` with 0 failed on success, or shows error on failure.

### Step 4: Progress reporting
- The `setAudioGenProgress` callback fires as each item in the batch completes
- With `Promise.all`, the callbacks fire in order — so progress shows N of M in real-time even within batches
- Only the BATCH-level await matters for sequencing

## Verification
1. Generate audio for 15-slide deck → verify total time is ~2-3 min (vs 5-7 min sequential)
2. **Inject an error on one slide → the entire generation fails with clear error message**
3. Error message includes the slide number that failed
4. User can retry after failure — all slides regenerate from scratch
5. Verify `audio_version` is NOT bumped on failed generation
6. Combined audio on R2 is NOT deleted on failure (stale combined.wav stays valid)
