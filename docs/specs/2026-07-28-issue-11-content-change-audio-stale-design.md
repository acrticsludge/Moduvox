# Issue #11: User Changed Script, Upon Regeneration Audio Stays the Same

## Status
Not started — planning phase

## Root Cause
In `SlideEditor.tsx`, when the user clicks "Regenerate Audio," the `handleGenerate` function is called with `reason: 'voice_changed'` in all cases (see line 1603):

```typescript
handleGenerate(voiceChangedSinceAudio ? undefined : new Set(changedSlides), "voice_changed")
```

When reason is `'voice_changed'`, the function **skips narration generation** and reuses existing narrations:

```typescript
if (reason === 'content_changed') {
  // ... regenerate narrations via Gemini
}
// For 'voice_changed', narrations are not regenerated — existing used
```

The `changedSlides` state tracks when user edits the narration text (via `updateNarration`), but the regenerate modal always uses `'voice_changed'` reason regardless. So when user edits the script and regenerates, the system re-runs TTS on the **old** narration text, not the edited one.

## Expected Behavior
- When user edits narration text, regeneration should use the edited text
- "Regenerate Audio" should reflect content changes, not just voice changes

## Actual Behavior
- User edits narration in the textarea
- Clicks "Regenerate Audio" (which shows "Voice settings changed" or "Slide content modified" banner)
- Audio is regenerated but uses the old narration text
- The new/edited narration is ignored

## Files Affected
- `frontend/components/dashboard/SlideEditor.tsx` — `handleGenerate` decision logic
- `frontend/components/dashboard/RegenerateModal.tsx` — reason selection

## Edge Cases
1. Both voice AND content changed → should regenerate narrations then audio
2. Only voice changed → use existing narrations (current behavior is correct here)
3. Only content changed → regenerate audio with edited text, no Gemini call needed
4. Neither changed → no generation needed, button should be disabled

## Design Decision
**Separate the two regeneration triggers:**
- The `handleGenerate` should always pass the CURRENT narrations (not snapshotted) to the audio generation loop. The current code already accesses `narrations` state — the issue is that for `voice_changed` the narration loop is correct but for `content_changed` the audio should use whatever `currentNarrations` is.
  
Wait — looking more carefully at the code, the problem is subtle. The `handleGenerate` function already uses `currentNarrations` which starts from `{ ...narrations }`. For `voice_changed`, it keeps existing narrations. For `content_changed`, it regenerates via Gemini. But the audio loop at the bottom uses `currentNarrations[s.number]` — so it DOES use the current narrations.

The actual bug: When `reason === 'content_changed'`, it regenerates narrations via Gemini, which OVERWRITES the user's manual edits. The regenerate should distinguish between "re-generate narrations from AI" vs "use current narrations as-is for TTS."

**Fix**: 
1. Add a `skipNarrationRegen` option or a third reason type `'audio_only'`
2. When user triggers regenerate after editing the textarea, use `reason: 'audio_only'` — no Gemini call, just re-TTS the current text
3. When voice changes, also `'audio_only'` — existing behavior is fine
4. Only call Gemini when user explicitly requests "Re-generate AI narrations"

## Acceptance Criteria
1. Regeneration after script edit uses the edited narration text
2. No unnecessary Gemini calls for purely audio regeneration
3. "Regenerate Audio" button behavior:
   - Voice changed → re-TTS only (existing narrations preserved)
   - Content changed → re-TTS only (use current textarea content)
   - "Re-generate AI narrations" → separate action (Gemini + TTS)
4. User edits are never silently overwritten by stale audio
