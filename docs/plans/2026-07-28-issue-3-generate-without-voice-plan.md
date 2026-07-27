# Plan: Prevent Generate Audio Without Voice Selection

## Implementation Order

### Step 1: Add voice check in `SlideEditor.tsx`
**File:** `frontend/components/dashboard/SlideEditor.tsx`
- In `runAudioGeneration()` function — add early return if `!selectedVoiceId`
- Show toast: "Select a voice before generating audio"
- In the render section (line ~1246), check `!selectedVoiceId` as another disabled condition for the "Generate Audio" button
- Add disabled logic for "Regenerate Audio" button too
- Note: `selectedVoiceId` already comes as a prop and is used elsewhere

### Step 2: Add voice check in `handleGenerate()`
**File:** `frontend/components/dashboard/SlideEditor.tsx`
- Same early return check with toast
- Covers the RegenerateModal flow too

## Verification
1. Navigate to editor with a presentation
2. Without selecting a voice, click "Generate Audio" → button is disabled OR shows error toast
3. Select a voice → button is enabled
4. Deselect voice → button disables again
5. Click "Regenerate Audio" without voice → same behavior
