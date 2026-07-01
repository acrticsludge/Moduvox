# Post-Archive Audit Fixes — Plan

**Goal:** Fix 4 critical bugs + 6 high-priority UX issues.

---

### Task 1: Fix missing `"use client"` in two dialogs

- [ ] **ConfirmArchiveDialog.tsx** — Add `"use client"` at line 1
- [ ] **DeletePresentationDialog.tsx** — Add `"use client"` at line 1

### Task 2: Fix regeneration missing voice_id and presentation_id

- [ ] **SlideEditor.tsx line 488** — In `handleGenerate()`, pass `voice_id: selectedVoiceId || undefined` and `presentation_id: presentationId` to the audio generation API call

### Task 3: Fix empty timings crash in ViewPlayer

- [ ] **ViewPlayer.tsx line 60** — Add guard: `if (timings.length === 0) return` after setting initial state, before `setCurrentIndex`

### Task 4: VoiceRow play sample — loading + error states

- [ ] **voices/page.tsx** — Add `loadingSample` state, show spinner on play button while URL is being fetched. Show toast on error if `createSignedUrl` returns null.

### Task 5: VoiceRow play icon swap

- [ ] **voices/page.tsx** — Replace `<Play>` icon with custom pause bars when `playing` is true

### Task 6: Blue voice-changed banner → amber

- [ ] **SlideEditor.tsx** — Change `border-blue-200 bg-blue-50 text-blue-700` to `border-amber-200 bg-amber-50 text-amber-700`

### Task 7: DeletePresentationDialog border color

- [ ] **DeletePresentationDialog.tsx** — Add `border-zinc-200` to the card className
