# Post-Archive Audit Fixes

**Goal:** Fix the 4 critical bugs and 6 high-priority UX issues identified in the full codebase audit.

## Critical Bugs (will break or crash)

1. **Missing `"use client"`** — `ConfirmArchiveDialog.tsx`, `DeletePresentationDialog.tsx` use `useState` without the directive
2. **Regeneration missing voice_id** — `SlideEditor.tsx:488` `handleGenerate()` doesn't pass `voice_id` → regenerated audio uses wrong voice
3. **Regeneration missing presentation_id** — same call missing `presentation_id`
4. **Empty timings crash** — `ViewPlayer.tsx:60` `setCurrentIndex(-1)` when `timings = []`

## High-Priority UX

5. **VoiceRow play sample** — No loading spinner while fetching signed URL. No error feedback if fetch fails.
6. **VoiceRow play icon** — Never changes to stop/pause during playback
7. **`archiving` state never displayed** — Project page tracks archiving Set but never passes it visually to cards
8. **Blue voice-changed banner** — Should be amber (status color inconsistency)
9. **VoiceRow sample fetch silent fail** — Returns null with no user feedback
10. **DeletePresentationDialog missing border color** — Border renders at browser default gray
