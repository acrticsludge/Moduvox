# Plan: Auto-Generate Preview on Voice Create, Clean Up on Delete

## Implementation Order

### Step 1: Backend — add preview generation after voice creation
**File:** `frontend/app/api/voices/route.ts`
- After successful voice insert, fire a background async task that:
  1. Calls the test generation logic (internal, not via HTTP)
  2. Downloads the generated audio
  3. Uploads to R2 at pattern `{userId}/previews/{voiceId}.wav`
  4. Updates the voice record's `preview_audio_path`

**File:** `frontend/app/api/voices/upload/confirm/route.ts`
- Same logic for cloned voices

### Step 2: Backend — clean up preview on delete
**File:** `frontend/app/api/voices/[id]/route.ts`
- Before deleting the voice record, read `preview_audio_path`
- If not null, call `deleteFile` on the R2 path
- Don't fail the delete if the file doesn't exist

### Step 3: Extract shared preview gen function
**File:** `frontend/lib/generate-preview.ts` (new)
- Extract the preview generation logic from `api/generate/test/route.ts` into a shared function
- Parameters: `voiceId`, `userId`, `supabase` client
- Handles: voice resolution, test generation, download, upload, DB update
- The POST handler calls this and the background tasks call it

## Verification
1. Create a preset voice → wait 5-10s → check DB for `preview_audio_path` being set
2. Open the voice in the list → play button works instantly (from cache)
3. Delete the voice → check R2 that preview file is removed
4. Create a cloned voice → same auto-preview behavior
5. Preview gen fails (e.g., HF Space busy) → voice still created, no crash
