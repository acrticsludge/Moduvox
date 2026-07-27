# Issue #12: Change in Voice Is Still Visibly Seen Between Calls

## Status
Not started — planning phase

## Root Cause
The `voiceChangedSinceAudio` state in `SlideEditor.tsx` detects when the voice selection has changed since the last audio generation. However, there's a timing/visual issue: when navigating between slides in the editor, the audio player shows the combined audio, which was generated with the **old** voice. The visual mismatch is noticeable because:

1. The narration textarea shows the current narration (which may match the old voice's style)
2. The audio player plays old-voice audio
3. There's no clear indicator mapping "which voice was used for which segment"

Additionally, `generatedWithVoiceRef.current` snapshot is only set after successful generation. If the page is reloaded with `editor_state` restoring `audioGenerated: true`, the ref is null → no comparison happens until next gen.

## Expected Behavior
- Clear visual indicator of which voice was used for the current audio
- Consistent visual state across page reloads
- No confusing "voice changed" banner on initial load when voice matches saved state

## Actual Behavior
- On page reload, `voiceChangedSinceAudio` may be inaccurate because `generatedWithVoiceRef.current` is reset
- Navigating slides shows audio that was generated with potentially different voice than currently selected

## Files Affected
- `frontend/components/dashboard/SlideEditor.tsx` — snapshot restoration logic

## Edge Cases
1. Page reload with saved state — voice snapshot should restore from saved voice ID
2. Voice is deleted by another session → "Voice not found" handling
3. User clicks "Regenerate" and mid-generation changes voice again → race condition
4. Multiple voice changes without regeneration in between → only latest matters

## Design Decision
- Restore `generatedWithVoiceRef.current` from saved `editor_state` on mount (already has `voiceId`, `voiceDescription`, `ultimateMode`)
- This ensures `voiceChangedSinceAudio` is accurate after page reload
- Only show "voice changed" banner when current voice differs from the voice used at last audio generation
- The banner message should be more specific: "Voice changed from [old name] to [new name]" where possible

## Acceptance Criteria
1. `generatedWithVoiceRef.current` is restored from saved editor state on mount
2. `voiceChangedSinceAudio` correctly reflects voice changes after page reload
3. Banner shows specific voice name change when possible
4. No flash of "voice changed" on initial page load when voice matches
5. Mid-generation voice changes are ignored (snapshot taken at generation start)
