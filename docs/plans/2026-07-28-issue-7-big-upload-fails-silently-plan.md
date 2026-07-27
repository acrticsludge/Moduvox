# Plan: Fix Silent Upload Failures

## Implementation Order

### Step 1: Add server-side file size validation
**File:** `frontend/app/api/presentations/[id]/upload/route.ts`
- Add a `maxSizeBytes` constant (50MB = 52,428,800 bytes)
- The route already returns a presigned URL; add the Content-Length header hint to R2

**File:** `frontend/app/api/presentations/[id]/upload/confirm/route.ts`
- After downloading the file for magic-byte validation, also check the file size
- The download URL already has a Range header for first 4 bytes; do a HEAD request for Content-Length
- If size > 50MB, reject with 413 "File too large. Maximum size is 50MB."
- If size > 100MB, reject with 413 "File exceeds storage limits."

### Step 2: Fix XHR error handling

**File:** `frontend/components/dashboard/SlideEditor.tsx`
- Replace `xhr.onerror = () => {}` with proper error handling:
  - `xhr.onerror` → show toast "Upload failed. Check your connection."
  - `xhr.ontimeout` → show toast "Upload timed out. Try again."
  - `xhr.onabort` → no toast (user canceled)
- Add `xhr.timeout = 120000` (2 min)
- Track upload error state and show it in the upload status UI

### Step 3: Improve user feedback
**File:** `frontend/components/dashboard/SlideEditor.tsx`
- The existing upload progress already shows percentage
- Add an error state UI in the upload flow section (alongside the conversion status render)
- Show retry button when upload fails

## Verification
1. Upload a file > 50MB → see error "File too large"
2. Simulate network failure (DevTools offline) → see error toast
3. Normal upload still works
4. Upload progress bar shows correctly for normal files
5. Error states clear when user retries
