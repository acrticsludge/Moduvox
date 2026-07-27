# Issue #18: Regenerated Audio Plays 2 Seconds Then Says Audio Gen Failed

## Status
Not started — planning phase

## Root Cause
This is a **race condition between regeneration and combined audio serving**. The flow is:

1. User triggers regeneration → per-slide WAVs are regenerated
2. Per-slide WAVs are written to R2 → old combined.wav is deleted
3. New per-slide WAVs are complete → audio_version is bumped
4. AudioPlayer (or viewer) tries to play the combined audio
5. The `GET /api/presentations/[id]/audio/combined` route checks for cached combined.wav → not found (just deleted)
6. Route rebuilds combined.wav by concatenating per-slide WAVs
7. **But**: if the route is called before ALL per-slide WAVs are written, it produces a partial/incomplete combined file
8. This partial combined file gets cached in R2
9. Server returns partial WAV → browser plays 2 seconds → next bytes don't arrive → error

Additional factor: The browser's Audio element and Howler.js may handle partial WAV differently. A truncated WAV file has a valid header but insufficient data, so it plays until the data runs out then errors.

## Expected Behavior
- Combined audio should only be served when ALL per-slide WAVs are fully written
- No partial/incomplete combined files in R2
- Viewer should gracefully handle the case where combined audio is being rebuilt

## Actual Behavior
- Combined audio can be served from partial data during regeneration
- Browser plays a few seconds then errors with "audio generation failed"

## Files Affected
- `frontend/app/api/presentations/[id]/audio/combined/route.ts` — atomic combined file generation
- `frontend/app/api/presentations/[id]/audio/slide/route.ts` — ensure audio_version bump happens AFTER combined rebuild
- `frontend/lib/r2.ts` — atomic write/read support

## Edge Cases
1. Concurrent read requests while regenerating → serve stale until new is ready
2. Generation fails mid-way → don't serve partial combined
3. Browser cached the old combined URL → cache busting with ?v= param (already done)
4. Multiple rapid regenerations → handle with generation counter/token

## Design Decision
**Write-audit pattern for combined audio:**
1. After all per-slide WAVs are written, delete old combined.wav (existing behavior)
2. Generate new combined.wav to a **temporary key** like `combined.wav.tmp`
3. Once fully written, atomically rename/move to `combined.wav` (R2 doesn't support rename natively, but we can write to final key directly after construction)
4. OR: Use a generation timestamp/version in the combined key: `combined-v{version}.wav`, update the route to always build fresh if version doesn't match

**Simplest approach**: After regeneration completes (all per-slide WAVs are written), rebuild combined.wav SYNCHRONOUSLY before bumping `audio_version`. This ensures the combined file is complete before any consumer sees the new version.

Also: The `/api/generate/audio/slide` route should NOT delete combined.wav for each slide. Only delete it once at the end when all slides are regenerated.

## Acceptance Criteria
1. Combined audio is only rebuilt AFTER all per-slide WAVs are written
2. No partial combined.wav is served during regeneration
3. Browser/player doesn't show "audio generation failed" after successful regeneration
4. `audio_version` is bumped only after combined audio is fully rebuilt
5. Cache busting (?v=timestamp) works reliably
6. Viewers see "Audio is being updated..." during rebuild, not an error
