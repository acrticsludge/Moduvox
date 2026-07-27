# Plan: Fix Voice Change UI Consistency

## Implementation Order

### Step 1: Restore voice snapshot from saved state
**File:** `frontend/components/dashboard/SlideEditor.tsx`
- In the initial mount/setup effect (where editor state is restored), also check if `selectedVoiceId` is provided and `audioGenerated` is true
- If so, populate `generatedWithVoiceRef.current` with the current voice settings
- This ensures the voice-change detection works correctly on page reload

### Step 2: Improve voice changed banner
**File:** `frontend/components/dashboard/SlideEditor.tsx`
- When `voiceChangedSinceAudio` is true, fetch the names of old and new voices
- Display: "Voice changed from [old name] to [new name]. Regenerate audio to apply."
- Use the `voices` state array (already fetched) for name resolution

### Step 3: Add voice name tracking to snapshot
**File:** `frontend/components/dashboard/SlideEditor.tsx`
- Extend `generatedWithVoiceRef.current` to include `voiceName`
- In `generatedWithVoiceRef.current`, store the voice name (resolve from voices array)
- When comparing, show the name change

## Verification
1. Generate audio with voice A
2. Switch to voice B → banner shows "Voice changed from [A] to [B]"
3. Reload page → banner still shows correctly (snapshot restored)
4. Regenerate audio with B → banner disappears
5. Switch back to A → banner shows again
6. No banner flash on initial page load when voice matches
