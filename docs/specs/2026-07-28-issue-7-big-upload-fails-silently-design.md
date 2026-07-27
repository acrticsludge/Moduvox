# Issue #7: Big Slide Upload Fails Silently

## Status
Not started — planning phase

## Root Cause
In `SlideEditor.tsx`, the upload flow uses `XMLHttpRequest` to PUT the file to R2. The error handler is `xhr.onerror = () => {}` — completely silent on failure. No retry logic, no user-visible feedback. Additionally, `PptxUploadZone.tsx` mentions a "50MB limit" but this is only client-side validation; there's no server-side file size enforcement in `/api/presentations/[id]/upload/confirm/route.ts`.

The XHR upload also doesn't report errors back to the user. If the file exceeds R2 limits, the network fails, or the presigned URL expires, the upload silently continues in the background and the user ends up with a broken state.

## Expected Behavior
- Upload failures show a clear error message to the user
- Server-side size validation prevents unreasonably large files
- Retry mechanism allows user to re-attempt

## Actual Behavior
- Large file uploads fail silently
- User sees no error and wonders why the presentation won't load
- No server-side size enforcement

## Files Affected
- `frontend/components/dashboard/SlideEditor.tsx` — XHR error handling
- `frontend/app/api/presentations/[id]/upload/route.ts` — add server-side size check
- `frontend/app/api/presentations/[id]/upload/confirm/route.ts` — validate file size
- `frontend/components/dashboard/PptxUploadZone.tsx` — improve error messaging

## Edge Cases
1. File exceeds R2's 100MB max object size → reject early
2. Presigned URL expires before upload completes → catch and retry
3. Network drops mid-upload → show clear failure, allow retry
4. File is exactly 0 bytes → reject at validation
5. PPTX file with excessive slide count (30 limit but no enforcement on upload)
6. Upload progress shows 100% but server returns error → handle this race

## Acceptance Criteria
1. XHR error handler shows toast: "Upload failed. Check your connection and try again."
2. XHR timeout after 120s shows appropriate error
3. POST `/api/presentations/[id]/upload` validates file size client-side hint
4. POST `/api/presentations/[id]/upload/confirm` reads actual file size from R2 and rejects >100MB
5. Files >50MB show user warning: "Large file — may take longer to process"
6. All upload errors are user-visible, not silent
