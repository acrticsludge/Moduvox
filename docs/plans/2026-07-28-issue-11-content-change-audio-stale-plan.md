# Plan: Fix Stale Audio After Content Changes

## Implementation Order

### Step 1: Refactor regenerate reason logic
**File:** `frontend/components/dashboard/SlideEditor.tsx`

Change the `handleGenerate` function signature and behavior:

```typescript
async function handleGenerate(
  selectedSlides?: Set<number>,
) {
  // REMOVE the second parameter 'reason'
  // Always use current narrations (no AI re-generation for audio-only)
  
  // If selectedSlides is not provided, regenerate ALL slides
  // If selectedSlides is provided, regenerate only those slides
  const targetSlides = selectedSlides
    ? slides.filter((s) => selectedSlides.has(s.number))
    : slides
  
  const currentNarrations = { ...narrations } // Always use current text
  
  // ... rest of the audio generation loop
}
```

### Step 2: Update RegenerateModal onConfirm
**File:** `frontend/components/dashboard/RegenerateModal.tsx` + `SlideEditor.tsx`

- `onConfirm` calls `handleGenerate(selectedSlides)` — no reason parameter
- The "voice changed" vs "content changed" distinction is now only used for UI messaging, not logic
- Add a separate "Re-generate AI Narrations" button that explicitly calls Gemini

### Step 3: Add AI narration regeneration option
**File:** `frontend/components/dashboard/SlideEditor.tsx`

Add a new "Re-generate AI Narrations" action:
- Button visible when `audioGenerated` is true
- Calls `generateNarrations(slides, true)` → overwrites current narrations
- After narrations are regenerated, shows "Regenerate Audio" prompt
- Does NOT automatically trigger audio generation (user chooses to do that separately)

## Verification
1. Edit narration text on a slide
2. Click "Regenerate Audio" → new audio uses the edited text, not old AI version
3. Voice change → works as before (existing narrations preserved, just re-TTS)
4. "Re-generate AI Narrations" button exists and generates fresh AI content
5. After AI regeneration, narration textarea shows new content
6. Audio is NOT auto-regenerated after AI narration regen (user must trigger separately)
