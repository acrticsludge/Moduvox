# Plan: Fix Image Parsing Failures

## Implementation Order

### Step 1: Add image validation in the API route
**File:** `frontend/app/api/generate/image-descriptions/route.ts`
- Before sending to Nemotron, validate each image:
  1. `mimeType` check — must be in `image/png,image/jpeg,image/webp`
  2. Base64 decode size check — max 5MB per image after decoding
  3. If invalid, return error result instead of sending to AI
- Add validation functions:
  - `validateImageData(data: string, mimeType: string): boolean`
  - `getImageByteSize(data: string): number`

### Step 2: Improve error reporting
**File:** `frontend/components/dashboard/SlideParsedData.tsx`
- Show per-image status indicators in the images tab:
  - Green: description available
  - Yellow: skipped (unsupported format)
  - Red: error
  - Grey: analyzing
- Allow retry on individual failed images

### Step 3: Increase extraction robustness
**File:** `frontend/lib/pptx-renderer` (find the image extraction logic)
- Add try-catch around individual image extraction
- If one image fails, skip it and log the error, don't fail the entire slide
- Add filtering for known problematic image types (OLE objects, EMF/WMF)

### Step 4: Add client-side validation
**File:** `frontend/components/dashboard/SlideEditor.tsx` (BatchImageFetcher)
- Filter out images with unsupported mimeTypes before sending to API
- Cap images per slide to 5 (if more, send first 5)

## Verification
1. Upload a PPTX with various image types → only valid ones get processed
2. PPTX with no images → no API call, no error
3. PPTX with one corrupt image → other images still work
4. SlideParsedData shows per-image status correctly
5. Retry on individual failed images works
