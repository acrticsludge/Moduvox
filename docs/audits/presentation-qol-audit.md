# Presentation QoL — Full Audit Report

> Generated 2026-06-28. Excludes AI narration and audio generation (deferred).

---

## Bug-Level (UX is actively broken)

| # | Issue | Location | Why It Matters |
|---|-------|----------|---------------|
| 1 | **All empty `catch {}` blocks** — upload fails, confirm fails, fallback parse fails, re-upload fails, auto-save fails — all silently swallowed | `SlideEditor.tsx:105,129,162,328`, `page.tsx:121` | User sees "Changes saved" toast when save actually failed. Upload silently fails and viewer shows old PPTX with no error. Re-upload silently fails. |
| 2 | **Auto-save shows success toast even on failure** — `.catch(() => {})` swallows errors | `page.tsx:119-121` | Directly misleads the user — toasts "Changes saved" when the PATCH returned 500 |
| 3 | **Voice re-selection resets CI unnecessarily** — clicking the same voice clears your control instructions | `CreatePageSidebar.tsx:77-90` | User loses their carefully written instructions if they open the voice dropdown |
| 4 | **No `beforeunload` handler** — navigating away during 2s debounce window loses unsaved narration edits | `page.tsx` | User types narration, clicks browser back, changes vaporize |

---

## High Priority — Missing QoL

| # | Feature | Effort | Rationale |
|---|---------|--------|-----------|
| 5 | **Manual Save button** — "Save" alongside auto-save, instant feedback, no timing anxiety | Small | Gives confidence, instant feedback, no waiting |
| 6 | **Upload progress indicator** — show bytes/percentage while PPTX uploads to storage | Small | 50MB uploads take seconds — user has no idea if it's working |
| 7 | **Voice preview/playback in sidebar** — play a sample of the selected voice before committing | Medium | API already exists (`POST /api/generate/test`), just needs a Play button |
| 8 | **Slide count tracking** — update `slide_count` in DB after parsing | Small | Currently always 0 — breaks any potential dashboard list |
| 9 | **Narration word/character count** — small counter below each textarea | Small | Standard UX, helps user gauge script length |
| 10 | **Partial slide regeneration** — pick specific slides in RegenerateModal instead of all-or-nothing | Medium | User might only want to redo voice on 2 of 5 modified slides |
| 11 | **Processing status for rejected uploads** — actionable message when file fails validation | Small | Currently generic error with no retry guidance |

---

## Medium Priority — Polishing

| # | Feature | Effort | Rationale |
|---|---------|--------|-----------|
| 12 | **Keyboard shortcut hints** — tooltip/label showing "← → to navigate" | Tiny | Arrows work, user may not know |
| 13 | **Error boundary on SlideEditor** — catch crashes, prevent white screen | Small | If `parsePptxText` crashes, entire page goes blank |
| 14 | **Iframe error detection** — `onError` on Office viewer to show helpful message | Small | Currently silent — user sees "Link not valid" with no guidance |
| 15 | **Empty PPTX handling** — helpful message when no extractable text found | Small | User needs to know content wasn't found |
| 16 | **Same-voice guard** — skip `handleVoiceChange` if same voice re-selected | Tiny | Prevents unnecessary CI resets (#3) |
| 17 | **Pending save indicator** — spinner in top bar when debounce is counting down | Small | User knows save isn't complete yet |
| 18 | **Slide jump input validation feedback** — flash input red if user types 0 or negative | Tiny | Currently silently clamps to 1 |

---

## Low Priority / Future

| # | Feature | Effort | Rationale |
|---|---------|--------|-----------|
| 19 | Presentation archiving UI (rename, archive) | Large | Status field exists, no UI to use it |
| 20 | Presentation listing page improvements | Large | No way to see all presentations in a project |
| 21 | Slide reordering detection in diff | Medium | Currently position-based, reorder = all modified |
| 22 | Session expiry / re-auth handling on 401 | Medium | If JWT expires mid-session, API errors silently |

---

## Recommendation (batch order)

1. **Batch 1 — Bugs + quick wins:** #1, #2 (empty catches + false toast), #5 (manual save), #16 (same-voice guard), #18 (input validation)
2. **Batch 2 — UX depth:** #7 (voice preview), #6 (upload progress), #9 (narration count), #12 (keyboard hints)
3. **Batch 3 — Robustness:** #13 (error boundary), #14 (iframe error), #11 (upload rejection), #17 (save indicator)
4. **Batch 4 — Features:** #10 (partial regen), #8 (slide count), #15 (empty PPTX)
5. **Future:** #19–#22
