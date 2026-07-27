# Issue #8: Send Parallel Calls to VoxCpm

## Status
Spec updated — planning phase

## Root Cause
Both `runAudioGeneration()` and `handleGenerate()` in `SlideEditor.tsx` generate audio slides sequentially in a `for...of` loop. Each VoxCpm API call takes 10-30 seconds. For a 30-slide deck, this means 5-15 minutes of total generation time. The Gradio Space supports concurrent requests.

```
for (let i = 0; i < slideTexts.length; i++) {
  // sequential — one at a time
  const res = await fetch("/api/generate/audio/slide", { ... })
}
```

## Expected Behavior
- Slides should be processed in parallel batches (concurrency 3-5)
- Progress tracking shows "Generating slide 7 of 15" accurately
- **If any single slide fails, the entire generation fails** — all slides are regenerated together or none are

## Actual Behavior
- Each slide waits for the previous one to complete
- Total generation time is slideCount × per-slide time
- A single failure causes the remaining slides to continue generating, wasting time on a failed batch

## Files Affected
- `frontend/components/dashboard/SlideEditor.tsx` — `runAudioGeneration()` and `handleGenerate()`

## Edge Cases
1. Rate limiting on HF Space with parallel requests → throttle with small delay between batches
2. Browser tab closes mid-generation → partial generation state — by design (all-or-nothing means partial state is acceptable since user retries from scratch)
3. Progress tracking with concurrent batches → still useful even though the whole thing will fail on error
4. **One slide fails → all in-flight slides are abandoned, promise rejects, error shown to user**
5. Very large decks (30 slides) → balance batch size vs. rate limits

## Design Decision
Use a **bounded parallel pattern with all-or-nothing semantics**:
- Split slides into batches of 3 (configurable)
- Process one batch at a time, all within the batch in parallel
- Use `Promise.all` — if any one fails, the entire batch (and thus the entire generation) fails
- On failure: show clear error "Audio generation failed on slide N. Please try again."
- All generated WAVs from the failed batch are orphaned (safe — stale files are cleaned up on next successful gen)
- Progress shows real-time count (N of M slides completed) even within a batch, by wrapping each call with an increment callback

## Acceptance Criteria
1. Audio generation uses parallel batches of 3 concurrent requests
2. Progress UI shows: "Generating audio (slide 7 of 15)..."
3. **If one slide fails, the entire generation stops with an error**
4. Error message clearly identifies which slide failed
5. Generation time for a 15-slide deck is ~2-3 min instead of ~5-7 min
6. User can retry the entire generation after a failure
