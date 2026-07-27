# Issue #8: Send Parallel Calls to VoxCpm

## Status
Not started — planning phase

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
- Progress tracking should still show current/total accurately
- Failures in one batch element shouldn't block other elements

## Actual Behavior
- Each slide waits for the previous one to complete
- Total generation time is slideCount × per-slide time

## Files Affected
- `frontend/components/dashboard/SlideEditor.tsx` — `runAudioGeneration()` and `handleGenerate()`

## Edge Cases
1. Rate limiting on HF Space with parallel requests → throttle with small delay between batches
2. Browser tab closes mid-generation → partial generation state (already handled by existing increment_audio_version)
3. Progress tracking with concurrent batches → needs careful state management
4. Error in one parallel request shouldn't cancel others → use Promise.allSettled
5. Very large decks (30 slides) → balance batch size vs. rate limits

## Design Decision
Use a **bounded parallel pattern**:
- Split slides into batches of 3 (configurable)
- Process one batch at a time, all within the batch in parallel
- Wait for all results in batch before moving to next
- Track per-slide success/failure
- This keeps progress reporting meaningful (batch N of M, each with K slides)

## Acceptance Criteria
1. Audio generation uses parallel batches of 3 concurrent requests
2. Progress UI shows: "Generating audio (slide 7 of 15)..."
3. Errors in individual slides don't cancel the entire batch
4. Generation time for a 15-slide deck is ~2-3 min instead of ~5-7 min
5. Progress updates smoothly, not jumping in large chunks
