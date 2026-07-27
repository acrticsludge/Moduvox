# Plan: Parallel VoxCpm Audio Generation

## Implementation Order

### Step 1: Extract parallel batch utility
**File:** `frontend/lib/async.ts` (new)
```typescript
export async function parallelBatches<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  batchSize = 3,
): Promise<{ success: boolean; result: R; index: number }[]> {
  const results: { success: boolean; result: R; index: number }[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.allSettled(
      batch.map((item, batchIndex) => fn(item, i + batchIndex))
    )
    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        results.push({ success: true, result: r.value, index: results.length })
      } else {
        results.push({ success: false, result: null as R, index: results.length })
      }
    }
  }
  return results
}
```

### Step 2: Rewrite `runAudioGeneration()` loop
**File:** `frontend/components/dashboard/SlideEditor.tsx`
- Replace `for (let i = 0; i < slideTexts.length; i++)` with `parallelBatches` call
- Batch size: 3 (configurable)
- Progress updates: increment `current` by count of completed items in each batch
- Error tracking: failed slides tracked via failedCount as before
- Log per-batch timing

### Step 3: Rewrite `handleGenerate()` loop similarly
**File:** `frontend/components/dashboard/SlideEditor.tsx`
- Same pattern as step 2

### Step 4: Adjust progress reporting
- The existing `RegenerateModal` progress shows `current/total`. With parallel batches, current jumps by batch size. Keep it as-is (it's close enough).
- Or smooth it: update `setAudioGenProgress` per-item completion instead of per-batch

## Verification
1. Generate audio for 15-slide deck → verify total time is reduced
2. Compare sequential vs parallel timing (roughly 3x faster)
3. Verify per-slide progress updates still work
4. Test with 3, 5, 10 slide decks
5. Error in one slide doesn't block others
6. All WAV files are correctly written to R2
