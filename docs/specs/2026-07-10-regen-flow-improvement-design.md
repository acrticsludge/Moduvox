# Regeneration Flow Improvement

**Date:** 2026-07-10
**Status:** Draft

## Problem Summary

Four interconnected bugs in the audio regeneration flow:

1. **Stacked modals** — multiple `fixed inset-0 z-50` dialogs overlap (RegenerateModal, slide info, progress overlay, error modal).
2. **Stale `combined.wav`** — R2 cached audio never invalidated after regeneration; view page + dashboard play old audio until manual refresh.
3. **Unnecessary Gemini calls** — voice-only changes trigger Gemini narration regeneration (wasteful, causes Gemini errors when the prompt content is sparse).
4. **Narration race condition** — `handleGenerate` reads `narrations` from stale React closure after `generateNarrations` updates state asynchronously.

## Solution Architecture

### 1. Single Multi-Step Modal

Replace `RegenerateModal` + inline `audioGenProgress` overlay + `audioGenError` modal with **one consolidated modal** with 3 internal steps/states:

| Step | Purpose | Content |
|------|---------|---------|
| **Review** | Show what will change | List of affected slides with reason (voice / content / both). Confirm/cancel. |
| **Generating** | Live progress | Per-slide progress bar, current slide title, cancel button. |
| **Complete** | Result summary | ✅ Success count, failure count if any. Actions: Close, View Page. |

**Implementation:**
- One new component: `RegenModal.tsx` (replaces both `RegenerateModal.tsx` and the inline overlay)
- Internal state enum: `'review' | 'generating' | 'complete' | 'error'`
- All states rendered inside a single `fixed inset-0 z-50` container — no stacking possible
- Backdrop click disabled during `generating`; cancel button during generation stops the process
- On error during generation → show error state with retry option, NOT a separate modal

### 2. Invalidate `combined.wav` on Regen

**Where:** In `handleGenerate()` in `SlideEditor.tsx`, after all per-slide audio regenerates successfully.

**What:** Delete `combined.wav` from R2 after regenerating per-slide WAVs.

**Implementation:**
- Import `deleteFile` from `@/lib/r2`
- After the per-slide generation loop succeeds:
  ```typescript
  // Delete old combined.wav so it gets rebuilt from fresh per-slide WAVs
  const combinedKey = `${userId}/audio/${presentationId}/combined.wav`
  await deleteFile(combinedKey).catch(() => {})  // non-critical
  ```
- This ensures the next request to `/api/presentations/[id]/audio/combined` or `/api/view/[shareToken]` will rebuild from the new per-slide audio.
- **Deletion is non-critical** — if it fails, the file will be overwritten anyway within its 1-hour signed URL expiry (acceptable degradation).

**Also update the `/api/generate/audio/slide/route.ts`** to delete `combined.wav` whenever a per-slide WAV is regenerated:
- More defensive: even if the caller forgets, per-slide regeneration always invalidates the combined cache.

### 3. Skip Gemini When Not Needed

**Current flow:** `handleGenerate` always calls `generateNarrations(targetSlides, false)` first.

**New flow:**
```
handleGenerate(slides, reason)
  |
  ├── reason === 'voice_changed'
  |     → Skip Gemini entirely
  |     → Use existing narrations from state
  |     → Go straight to TTS loop
  |
  ├── reason === 'content_changed'
  |     → Call Gemini for those slides only
  |     → Then TTS loop with new narrations
  |
  └── reason === 'manual_regen'
        → Same as content_changed (explicit user regen)
```

**Why this helps:** Most regens happen after a voice setting change. Running Gemini is expensive (3-5s per 15 slides) and can fail if the user's slide content is minimal. If the narration text is already set, there's no reason to regenerate it.

**Gemini error scenario fixed:** When user manually edits narration text and then clicks regen, Gemini is skipped entirely — audio is generated from the existing (manually edited) text directly.

### 4. Fix Narration Closure Race

**Current bug:**
```typescript
const ok = await generateNarrations(targetSlides, false)
// generateNarrations calls setInternalNarrations(updated) internally
// but the next line reads `narrations` from the stale closure
const slideTexts = sorted.map(s => s.text = narrations[s.number])  // ← STALE
```

**Fix:** Make `generateNarrations` return the new narrations map, and use that return value directly:

```typescript
const newNarrations = await generateNarrations(targetSlides, false)
if (newNarrations) {
  // Use newNarrations directly — no stale closure
  const slideTexts = sorted.map(s => ({
    text: newNarrations[s.number] || narrations[s.number] || ""
  }))
  // → TTS loop
}
```

Also fix the `runAudioGeneration` function which has the same pattern.

## Component Changes

### New/Modified Components

| File | Change |
|------|--------|
| `frontend/components/dashboard/RegenModal.tsx` | **Rewrite** — single modal with 3-step state machine (review → generating → complete). Remove old simple list-and-confirm dialog. |
| `frontend/components/dashboard/SlideEditor.tsx` | **Remove** inline `audioGenProgress` overlay + `audioGenError` modal. **Add** `deleteFile` call after regen. **Fix** narration closure race. **Add** `reason` parameter to `handleGenerate`. |
| `frontend/app/api/generate/audio/slide/route.ts` | **Add** `deleteFile(combinedKey)` after successful per-slide upload. |
| `frontend/lib/r2.ts` | **No change needed** — `deleteFile` already exists. |

### Removed Components

None. The old `RegenerateModal.tsx` is rewritten in place. The inline overlays in `SlideEditor.tsx` are removed.

## Data Flow

```
User clicks "Regenerate Audio"
  → handleGenerate(affectedSlides, 'voice_changed' | 'content_changed')
  → RegenModal opens in 'review' state
  → User clicks confirm
  → RegenModal transitions to 'generating' state
  → handleGenerate runs async (Gemini if needed → TTS loop)
  → On each slide complete: RegenModal progress bar updates
  → All done: RegenModal transitions to 'complete' state
  → Deletes combined.wav from R2
  → User clicks close → modal closes, auto-saved state persists
```

## Error Handling

- **Per-slide TTS failure:** Log error, continue to next slide, report in final summary
- **Gemini failure:** Show inline error in the modal with retry option — don't abort completely
- **combined.wav deletion failure:** Non-critical — log but don't show to user
- **Modal close during generation:** Abort the AbortController, mark as canceled, show partial results

### 5. Fix First Voice Change Detection

**Bug:** The `snapshotInitialized` sentinel in `SlideEditor.tsx` causes the FIRST voice setting change after page load to be skipped:
```typescript
// First mount: snapshot initialized, returns
// First change: snapshotInitialized was set, goes to sentinel → always false → skipped
// Second change: actual comparison works
```

**Fix:** Remove the `snapshotInitialized` sentinel entirely. Initialize `generatedWithVoiceRef.current` to `null` on mount. On first comparison, if the ref is `null`, initialize it and don't compare. On subsequent changes, compare normally. The `useEffect` that detects voice changes should also track if audio has ever been generated — if `!audioGenerated`, there's nothing to compare against.

```typescript
// On mount or when audioGenerated becomes false: reset
if (!audioGenerated) {
  if (generatedWithVoiceRef.current !== null) {
    generatedWithVoiceRef.current = null
  }
  return
}

// If no snapshot yet, take one and don't compare
if (generatedWithVoiceRef.current === null) {
  generatedWithVoiceRef.current = { ...currentSettings }
  return
}

// Compare snapshot vs current
const voiceChanged = snap.voiceId !== currentVoiceId || ...
setVoiceChangedSinceAudio(voiceChanged)
```

## Migration Path

No migration needed — no schema changes. The `combined.wav` invalidation takes effect immediately on next regen. Old `combined.wav` files for abandoned presentations will expire from cache naturally (1-hour signed URLs).
