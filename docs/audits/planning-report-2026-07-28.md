# Moduvox Bug Fix Planning Report

**Date:** 2026-07-28
**Status:** Specs and plans written, branches created
**Total Issues:** 15 (excluding #1 "ignore" and #2 "fixed")

---

## Consolidated Order

| Order | Issue | Branch | Tags | Depends on | Conflicts with | Risk | Why |
|---|---|---|---|---|---|---|---|
| 1 | #3 Require voice selection before generate | `fix/issue-3-require-voice` | UI/validation | None | None | Low | Small isolated change in SlideEditor.tsx |
| 2 | #5 Lock gender for built-in presets | `fix/issue-5-preset-gender-lock` | UI/backend | Creates `lib/presets.ts` | None | Low | Backend + UI validation, well-defined |
| 3 | #16 Prefill gender slots | (merged with #5) | — | — | — | — | Handled as part of #5 design |
| 4 | #6 Auto-preview on voice create/delete | `fix/issue-6-preview-on-create` | Backend/storage | #3 (uses test route) | None | Medium | Background tasks, R2 cleanup, shared lib extraction |
| 5 | #19 Preview audio in voice selector | `fix/issue-19-preview-in-selector` | UI | #6 (preview caching), #9 | #6 (uses cached previews) | Medium | Relies on #6 having cached previews available |
| 6 | #7 Fix silent upload failures | `fix/issue-7-upload-errors` | Backend/UI | None | None | Low | Server-side validation + XHR error handling |
| 7 | #10 Fix image parsing failures | `fix/issue-10-image-parsing` | Backend/UI | None | None | Medium | Touch pptx-renderer, may have multiple root causes |
| 8 | #9 Format image descriptions | `fix/issue-9-image-desc-format` | Backend/UI | #10 (validation) | #10 (same route) | Low | Prompt update + post-processor |
| 9 | #17 Fix recorder voice clone | `fix/issue-17-recorder-format` | Backend | None | None | High | Requires adding WebM→WAV conversion; affects core TTS pipeline |
| 10 | #11 Content change audio staleness | `fix/issue-11-content-change-audio` | UI | None | #8, #13 (same component) | Medium | Refactors regenerate logic in SlideEditor |
| 11 | #8 Parallel VoxCpm calls | `fix/issue-8-parallel-voxcpm` | UI | None | #11, #13 (SlideEditor loops) | Medium | Changes audio generation loops significantly |
| 12 | #18 Combined audio race condition | `fix/issue-18-combined-audio-race` | Backend | #8 (generation loop), #11 | #8, #11 | High | Touches combined route timing, rebuild orchestration |
| 13 | #12 Voice change UI consistency | `fix/issue-12-voice-change-ui` | UI | #11 (snapshot logic) | None | Low | State restoration fix |
| 14 | #13 Let user skip slides | `fix/issue-13-skip-slides` | UI | #3 (voice check), #11 | #8, #11 (RegenerateModal) | Low | Checkbox selection in RegenerateModal |
| 15 | #14 Fullscreen mode | `fix/issue-14-fullscreen` | UI | None | None | Low | New hook + button, independent |
| 16 | #15 Share link access options | `fix/issue-15-share-access` | UI | None | None | Low | UI-only redesign of settings panel |

---

## Cluster Analysis

### Cluster A: Voice Selection (Issues 3, 5, 6, 19)
All touch voice creation, selection, and preview. #6 and #19 share the preview caching flow. Recommend ordering: #3 first (trivial guard), then #5 (preset fix), then #6 (preview infrastructure), then #19 (uses previews).

### Cluster B: Audio Generation Loop (Issues 8, 11, 13, 18)
All touch SlideEditor.tsx's `runAudioGeneration()` and `handleGenerate()`. These are high-conflict:
- #11 refactors the regenerate reason logic
- #8 rewrites the sequential loop to parallel batches
- #13 adds per-slide checkboxes to the review modal
- #18 changes combined audio timing

**Recommendation**: Do #11 first (changes the logic flow), then #8 (parallelism is independent of reason logic), then #13 (adds UI on top of existing modal), then #18 (orchestration changes at the end after the loop is stable).

### Cluster C: Image Processing (Issues 9, 10)
Both touch the image-descriptions route and SlideParsedData. #10 adds validation infrastructure that #9 uses. Do #10 first, then #9.

### Cluster D: Independent (Issues 7, 12, 14, 15, 17)
These have no code dependencies on each other or other clusters. Can be fixed in any order or in parallel.

---

## Risk Summary

### High Risk
- **#17 (Recorder format)**: Unknown WebM→WAV conversion complexity. May depend on `ffmpeg.wasm` or additional Node modules. Risk: we may need to add a heavy dependency or find a lighter alternative. Fallback: convert on client before upload using Web Audio API.
- **#18 (Combined audio race)**: Race conditions are hard to reproduce and verify. If the combined route has other callers (viewer page), the fix needs to handle concurrent access patterns.

### Medium Risk
- **#8 (Parallel VoxCpm)**: Changing from sequential to parallel may hit HF Space rate limits. Need graceful backoff. Progress tracking becomes more complex.
- **#10 (Image parsing)**: Root cause may be in `pptx-renderer` which is a key dependency. If image extraction has fundamental issues, fix may be extensive.

### Low Risk
- All other issues are well-understood with contained changes.

---

## Files Touched (Full Map)

| File | Issues |
|---|---|
| `SlideEditor.tsx` | #3, #7, #8, #11, #12, #13, #14, #18 |
| `CreatePageSidebar.tsx` | #19 |
| `voices/page.tsx` | #5, #6 |
| `VoiceRecorder.tsx` | #17 |
| `RegenerateModal.tsx` | #13 |
| `SlideParsedData.tsx` | #9, #10 |
| `ShareSettingsPanel.tsx` | #15 |
| `api/voices/route.ts` | #5, #6 |
| `api/voices/[id]/route.ts` | #6 |
| `api/voices/upload/confirm/route.ts` | #6 |
| `api/generate/image-descriptions/route.ts` | #9, #10 |
| `api/generate/audio/slide/route.ts` | #18 |
| `api/generate/test/route.ts` | #6 |
| `api/presentations/[id]/upload/route.ts` | #7 |
| `api/presentations/[id]/upload/confirm/route.ts` | #7 |
| `api/presentations/[id]/audio/combined/route.ts` | #18 |
| `api/presentations/[id]/audio/rebuild/route.ts` | #18 (new file) |
| `lib/voxcpm.ts` | #17 |
| `lib/audio-convert.ts` | #17 |
| `lib/use-fullscreen.ts` | #14 (new file) |
| `lib/presets.ts` | #5 (new file) |
| `lib/generate-preview.ts` | #6 (new file) |
| `lib/async.ts` | #8 (new file) |
| `lib/pptx-renderer` | #10 |
| `SlidePdfViewer.tsx` | #14 |

---

## Issues Not Bugs (Flagged)

- **#4 "Able to hear preset before creation (refers to point 19)"** — This is the same feature as #19. Duplicate.
- **#15 "Anyone with the link or custom"** — Existing share settings already support password, email gate, and expiration. The issue is about UX clarity, not missing functionality. Treat as UI enhancement.
- **#16 "Prefill gender slots"** — This is part of #5. When a preset is selected, gender is pre-filled from the preset definition. Already in scope of #5 fix.

---

## Instructions

1. Start with Cluster A (#3 → #5 → #6 → #19) for quick wins with user-visible impact
2. Then Cluster D independent fixes in parallel (#7, #12, #14, #15, #17)
3. Then Cluster C (#10 → #9)
4. Finally Cluster B (#11 → #8 → #13 → #18) — the most complex changes, last

Each branch contains its own spec and plan. Check out `fix/issue-<N>-<slug>`, implement the plan, then push and create PR.
