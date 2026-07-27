# Issue #13: Viewer — Slide Auto-Sync, Seeking, and Skip

## Status
Spec updated — planning phase (was: incorrectly scoped to editor)

## Root Cause
The viewer page (`/view/[shareToken]`) has three problems:

### Problem A: PPT not auto-synced with audio
During playback, the slide viewer should automatically advance when the audio reaches a slide boundary. The `detectSlide()` function in `ViewAudioBar.tsx` uses `slideTimings` (computed from per-slide WAV durations) to detect which slide the current audio position falls in.

**Root cause:** `getAllSlideDurations()` in `wav-duration.ts` can fail silently in several ways:
- If per-slide WAV files don't exist (e.g., audio generation started but hasn't finished)
- If any slide's WAV header is missing or corrupt, the `catch { continue }` skips it silently, producing an incomplete timing array
- If ALL slides fail, the timing array is empty → `detectSlide()` never matches → no slide change events fire
- The view API's `catch { /* non-critical */ }` silently swallows errors, leaving `slideTimings` as `undefined`

### Problem B: Clicking on the progress bar to seek doesn't update the slide
The `handleSeekEnd()` function calls `detectSlide(clamped)` which should update the slide. But:
- If `slideTimings` is empty, `detectSlide` never finds a match
- The first-watch clamping logic may clamp the seek position to `maxWatchedRef.current` which could be behind the current slide

### Problem C: Skip to a point in the video (no slide update)
Same root cause as B — any non-playback seek (skip forward/back, click on progress bar) relies on `detectSlide` which needs accurate timing data.

## Expected Behavior
1. **Auto-sync**: As audio plays, the slide viewer auto-advances to match the current audio position
2. **Seek sync**: Clicking on the progress bar immediately shows the correct slide
3. **Graceful fallback**: If timing data can't be computed, the viewer shows manual navigation buttons and a clear message

## Actual Behavior
1. Slide viewer stays on the first slide throughout playback
2. Clicking the progress bar doesn't update the slide
3. User must manually click "Next" to advance slides

## Files Affected
- `frontend/lib/wav-duration.ts` — `getAllSlideDurations()` error handling, logging, fallback
- `frontend/app/api/view/[shareToken]/route.ts` — better error logging for timing computation, fallback values
- `frontend/components/view/ViewAudioBar.tsx` — detectSlide() robustness, fallback when timings are empty
- `frontend/app/view/[shareToken]/page.tsx` — fallback UI when slide sync is unavailable

## Edge Cases
1. Audio generation hasn't finished → no per-slide WAVs exist yet → timings empty → show manual nav
2. One slide's WAV is missing (generation failed) → slide timing array has a gap → detectSlide skips past it
3. User uploaded a new audio version → timings recomputed on next refresh
4. Very short slide durations (< 1 second) → detectSlide may skip if polling interval is too coarse
5. Tab hidden during playback → RAF stops → slide doesn't advance until tab is visible again
6. First-watch clamping: user seeks forward → clamped to maxWatched → if maxWatched is in early slide, slide doesn't update

## Acceptance Criteria
1. During playback, slide automatically advances when audio reaches each slide boundary
2. Clicking on the progress bar (seek) immediately shows the correct slide
3. Skip forward/back 10s buttons update the slide
4. The `getAllSlideDurations` function logs errors instead of silently swallowing them
5. If timing data is completely unavailable, the viewer shows a message "Slide sync unavailable" and keeps manual navigation working
6. After audio regeneration (new version), fresh timing data is fetched and applied
7. First-watch clamping seeks correctly to the right slide

## Design Decision
**Fix the weak link: timing computation.** The primary fix is to make `getAllSlideDurations` robust and to ensure the view API properly reports when timings are available. Secondary fix: if timings are empty or unavailable, `detectSlide` should be a no-op (same as current behavior) but the fallback slide navigation should be more usable (keyboard shortcuts, drag-to-seek on a visual timeline).

The key insight: the system currently has a valid path to compute timings (read WAV headers via Range requests). If this path fails, it's because WAV files don't exist yet, not because the logic is wrong. So the fix is:
1. Make the failure path visible (log errors, report status)
2. Add a retry/refresh mechanism when audio is being generated
3. Improve the fallback UX when timings aren't available
