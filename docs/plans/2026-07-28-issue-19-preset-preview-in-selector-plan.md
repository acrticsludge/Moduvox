# Plan: Add Preview Audio for All Voices in Selector

## Implementation Order

### Step 1: Redesign voice selector to support inline actions
**File:** `frontend/components/dashboard/CreatePageSidebar.tsx`

Replace the native `<Select>` component with a custom dropdown that supports inline play buttons:

1. Create a custom dropdown component (or extend the shadcn Select with a custom trigger/content)
2. Each voice row shows:
   - Voice name
   - Type badge (Preset / Cloned)
   - Play button (circular, with loading/generated/ready states)
3. On hover/focus, show play button
4. On click of play button:
   - If cached → fetch signed URL and play immediately
   - If not cached → call `/api/generate/test`, show spinner, cache result, then play

### Step 2: Add preview state management
**File:** `frontend/components/dashboard/CreatePageSidebar.tsx`
- `previewStates: Record<string, { status: 'idle' | 'loading' | 'ready' | 'error', url?: string }>`
- On mount, fetch all cached preview paths for voices
- Pre-load signed URLs for voices that have cached previews

### Step 3: Add audio playback UI
**File:** `frontend/components/dashboard/CreatePageSidebar.tsx`
- After clicking play, show inline audio element (similar to current preview audio)
- Or use a short-lived toast-style player
- Auto-hide after playback completes or 5 seconds of inactivity

### Step 4: Add batch preview status endpoint
**File:** `frontend/app/api/voices/previews/route.ts` (new)
- GET endpoint returning `Record<voiceId, { hasPreview: boolean, previewUrl?: string }>`
- Returns signed URLs for all cached previews in one request
- Reduces N individual signed URL requests to 1

### Step 5: Handle dropdown interaction
- Clicking play on a voice in the dropdown should NOT select the voice (separate actions)
- Clicking the voice name/label selects the voice
- This allows previewing without committing to selection

## Verification
1. Open voice selector → each voice shows a play button
2. Click play on a voice → audio plays (generates first if uncached)
3. Click play on same voice again → instant play (cached)
4. Click play on multiple voices → each works independently
5. Loading spinner shows during generation
6. Clicking voice name selects it (existing behavior preserved)
7. Cloned voices also show preview buttons
8. Page reload → previously generated previews still play instantly
