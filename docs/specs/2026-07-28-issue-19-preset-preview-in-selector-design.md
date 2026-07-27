# Issue #19: Preview Audio for All Preset Voices in Voice Selector

## Status
Not started — planning phase

## Root Cause
The `CreatePageSidebar` component has a voice selector dropdown and a single "Preview voice" button that tests only the currently selected voice. There's no way to audition different voices before selecting one. Users must:
1. Select a voice
2. Click "Preview"
3. Wait for generation
4. Listen
5. If they don't like it, select another voice and repeat

## Expected Behavior
- When the voice selector is opened, show a play button next to each voice option
- Clicking play generates/previews audio for that specific voice
- Preview audio is cached so subsequent plays are instant
- All 5-6 preset voices are presented with audible previews

## Actual Behavior
- Only one preview button for the currently selected voice
- Must select → preview → deselect → select another → preview
- No cached previews visible in the dropdown

## Files Affected
- `frontend/components/dashboard/CreatePageSidebar.tsx` — redesign voice selector dropdown with play buttons
- `frontend/app/api/generate/test/route.ts` — already supports caching (preview_audio_path), may need batch endpoint
- `frontend/lib/validations/voice.ts` — no changes needed

## Edge Cases
1. Voice has no cached preview → generate on first play, cache for next
2. Preview generation takes 3-10 seconds → show loading spinner per voice
3. User rapidly clicks play on multiple voices → queue generation, don't spam API
4. Voice is cloned (not preset) → preview of cloned voice should also be available
5. 5+ voices all need previews → generate on demand, not all at once
6. Voice was deleted while cached preview exists → handle 404 gracefully

## Design Decision
**Lazy generation with caching:**
- On dropdown open, check if each voice has a cached `preview_audio_path` in the DB
- If cached, show play button immediately (fetch signed URL)
- If not cached, show a muted/greyed play button with "Generate preview" tooltip
- On click, call `/api/generate/test` for that voice, cache the result
- Once generated, enable the play button
- Show a "generating..." spinner while in-progress

**Dropdown UI change:**
- Replace the native `<Select>` with a custom dropdown that supports inline actions
- Each voice row shows: name, type badge, play button (with loading/generated/ready states)
- After preview generation, inline audio player appears temporarily

## Acceptance Criteria
1. Voice selector shows play button next to each voice
2. Clicking play generates/caches and plays preview audio for that specific voice
3. Previously generated previews play instantly (from cache)
4. Loading state per voice during generation
5. Works for both preset and cloned voices
6. Preview generation doesn't block the UI
7. Voice selector remains keyboard-accessible
