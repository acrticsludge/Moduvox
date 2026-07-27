# Plan: Fix Regenerated Audio Playing 2 Seconds Then Failing

## Implementation Order

### Step 1: Audit the combined audio rebuild timing
**File:** `frontend/app/api/generate/audio/slide/route.ts`
- Currently, each per-slide audio generation deletes `combined.wav` immediately (line 121-123)
- This creates a window where the combined file is gone but per-slide files are partially updated
- **Fix:** Remove the combined.wav deletion from per-slide generation

### Step 2: Move combined audio deletion to regeneration completion
**File:** `frontend/components/dashboard/SlideEditor.tsx`
- In `runAudioGeneration()` and `handleGenerate()`, after ALL per-slide WAVs are written:
  1. Trigger combined audio rebuild via a new API endpoint or direct logic
  2. Wait for combined rebuild to complete
  3. Then bump `audio_version`
- This ensures no consumer sees an incomplete combined file

### Step 3: Add combined rebuild API endpoint
**File:** `frontend/app/api/presentations/[id]/audio/rebuild/route.ts` (new)
- POST endpoint that:
  1. Lists all per-slide WAVs for this presentation
  2. Concatenates them into combined.wav
  3. Returns success when combined.wav is fully written
- Called by the editor after all per-slide generation is done

### Step 4: Add generation-state signaling
**File:** `frontend/app/api/presentations/[id]/audio/combined/route.ts`
- Check if a generation is in progress (via DB state or R2 marker file)
- If rebuilding, return 503 with `Retry-After` header instead of partial data
- Alternative: return 202 "Accepted" with metadata about rebuild progress

### Step 5: Update AudioPlayer / ViewAudioBar
- When combined route returns 503 or 202, show "Audio is being updated" instead of error
- Auto-retry after a delay

## Verification
1. Generate audio → combined builds correctly
2. Regenerate audio → during regeneration, old combined still plays (or shows "updating")
3. After regeneration completes, new combined audio plays correctly
4. No 2-second cut-off errors
5. Viewers see consistent behavior during generation
6. Multiple rapid regenerations don't cause race conditions
