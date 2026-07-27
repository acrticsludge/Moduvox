# Issue #3: User Can Click Generate Without Selecting Voice

## Status
Not started — planning phase

## Root Cause
In `SlideEditor.tsx`, the `runAudioGeneration()` and `handleGenerate()` functions have no guard checking whether a voice is selected. The `voiceSelected` prop is passed from the parent `page.tsx` but is never read by the audio generation code. When `selectedVoiceId` is `undefined`, the `/api/generate/audio/slide` route still works but uses a default description ("Natural, clear, professional speaking voice") with no reference voice, producing inconsistent/unexpected output.

## Expected Behavior
- If no voice is selected, "Generate Audio" button should be disabled
- If user tries to regenerate without a voice, show a clear error

## Actual Behavior
- Button is enabled regardless of voice selection
- Audio gets generated with default voice parameters silently

## Files Affected
- `frontend/components/dashboard/SlideEditor.tsx` — add voice check guard
- `frontend/components/dashboard/CreatePageSidebar.tsx` — already passes voice state up

## Edge Cases
1. User has voices but none selected → block generation
2. User had a voice selected but it was deleted by another session → handle gracefully
3. User clicks Generate before voices finish loading → show loading, not generation
4. Voice selected then deselected → block until re-selected

## Acceptance Criteria
1. "Generate Audio" button is disabled when `!selectedVoiceId`
2. "Regenerate Audio" button is disabled or shows tooltip when no voice selected
3. Audio generation functions check `selectedVoiceId` and return early with error toast
4. Error message is clear: "Select a voice before generating audio"
