# Issue #6: Generate Preview on Voice Creation, Delete When Deleted

## Status
Not started — planning phase

## Root Cause
When a voice is created (preset or cloned), no preview audio is automatically generated. The `preview_audio_path` column in the DB remains null. The user must manually visit the voices page and click "Test" or "Generate preview" to cache a preview. Similarly, when a voice is deleted, the cached preview audio file stays in R2 (orphaned).

## Expected Behavior
- When a voice is created, automatically trigger a background test generation and cache the preview
- When a voice is deleted, automatically clean up the preview file from R2

## Actual Behavior
- Preview is only generated on explicit user action
- Deleted voices leave orphaned preview files in R2

## Files Affected
- `frontend/app/api/voices/route.ts` — POST handler (trigger preview after creation)
- `frontend/app/api/voices/[id]/route.ts` — DELETE handler (clean up preview from R2)
- `frontend/app/api/generate/test/route.ts` — already handles caching, may need minor refactor
- `frontend/lib/r2.ts` — ensure deleteFile works with preview paths

## Edge Cases
1. Preview generation fails → voice is still created, retry on next view
2. Voice created but preview gen is slow → non-blocking (fire-and-forget)
3. Multiple rapid creations → don't start preview for previous if next is already created
4. Delete voice while preview is still generating → race condition, handle gracefully
5. Preview file doesn't exist on R2 but DB has path → delete handles non-existent gracefully

## Acceptance Criteria
1. After POST `/api/voices` (preset) and `/api/voices/upload/confirm` (clone), spawn background preview generation
2. Background gen calls `/api/generate/test` internally or reuses its logic
3. On DELETE `/api/voices/[id]`, delete the file at `preview_audio_path` from R2
4. Orphan cleanup doesn't fail the delete if the file doesn't exist
5. User sees "Preview generating..." briefly if they view the voice immediately
