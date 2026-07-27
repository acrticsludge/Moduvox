# Plan: Fix Viewer Slide Auto-Sync and Seeking

## Implementation Order

### Step 1: Fix timing computation — add error logging
**File:** `frontend/lib/wav-duration.ts`
- In `getAllSlideDurations()`, change the catch block from `catch { continue }` to:
  ```typescript
  catch (err) {
    console.warn(`[wav-duration] Slide ${i}: failed to read duration:`, err instanceof Error ? err.message : String(err))
    continue
  }
  ```
- This makes silent failures visible in logs for debugging
- Still skip the slide (don't fail the entire generation) — partial timings are better than none

### Step 2: Fix timing computation — handle full failure
**File:** `frontend/app/api/view/[shareToken]/route.ts`
- After the `getAllSlideDurations` call (lines 96-107), add:
  ```typescript
  if (slideTimings.length === 0 && timings.length > 0) {
    console.warn(`[view] getAllSlideDurations returned 0 timings for presentation ${presentation.id}`)
  }
  ```
- Keep the catch block but log the error
- Ensure `slideTimings` is always returned as an array (even if empty)

### Step 3: Add fallback sync mechanism
**File:** `frontend/components/view/ViewAudioBar.tsx`
- When `slideTimings` is empty or not provided, `detectSlide` is a no-op (already the case — match stays 0)
- BUT: add a **time-based fallback**. If we know `totalDurationMs` and `slideCount`, estimate timing evenly:
  ```typescript
  function getSlideTiming(secs: number): number | null {
    const timings = slideTimingsRef.current
    if (timings.length === 0 && totalDurationMs && slideCount) {
      // Fallback: evenly distribute slides
      const slideDuration = totalDurationMs / slideCount
      const slideIndex = Math.floor((secs * 1000) / slideDuration)
      return Math.min(slideIndex + 1, slideCount)
    }
    // Normal timing-based detection (existing code)
    const ms = secs * 1000
    for (const t of timings) {
      if (ms >= t.startMs && ms < t.endMs) return t.slideNumber
    }
    return null
  }
  ```
- Use this function in `detectSlide()` and `seekToSlide()`
- This requires `totalDurationMs` and `slideCount` to be passed (already are)

### Step 4: Fix seek sync
**File:** `frontend/components/view/ViewAudioBar.tsx`
- In `handleSeekEnd()`: ensure `detectSlide(clamped)` is called BEFORE setting `isSeeking = false`
  (Current code already does this — verify it's working in practice)
- Add a log when detectSlide doesn't find a match: `console.warn("[ViewAudioBar] No slide match for time:", secs)`

### Step 5: Improve fallback UI
**File:** `frontend/app/view/[shareToken]/page.tsx`
- Add a ref to track whether slide timings are available
- If available → auto-sync works (show a small indicator if desired)
- If not available → the existing manual nav buttons suffice, but add keyboard shortcut hints: "← → to navigate slides"

### Step 6: Add refresh mechanism
**File:** `frontend/app/view/[shareToken]/page.tsx`
- The 30-second poll already re-fetches view data (which includes slide_timings)
- When `applyChanges()` is called (after version change detected), timings are refreshed
- This should be sufficient — no additional polling needed

## Verification
1. Open a shared presentation → play audio → slides auto-advance
2. Click on the progress bar at different positions → slide updates immediately
3. Skip forward 10s → slide updates
4. Use prev/next buttons → slide changes, audio seeks to match
5. Open a presentation where audio is still generating → see manual navigation (no auto-sync)
6. After audio finishes generating → refresh → auto-sync works
7. Browser console shows no silent failures in wav-duration
