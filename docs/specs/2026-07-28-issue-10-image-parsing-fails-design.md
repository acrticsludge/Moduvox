# Issue #10: Image Parsing Fails Sometimes

## Status
Not started — planning phase

## Root Cause
The `BatchImageFetcher` component in `SlideEditor.tsx` extracts images from parsed slides and sends them to the image-descriptions API. Image extraction relies on `parsePptxText()` from `pptx-renderer`, which may not handle all PPTX image formats correctly. Known problem areas:

1. **OLE objects** — charts or images embedded as OLE objects are not standard image formats
2. **EMF/WMF vector formats** — some PPTX files use vector formats that can't be easily serialized
3. **Corrupt image data** — base64 encoding may fail for binary-incompatible data
4. **Image size limits** — large images exceed the API payload limits and get silently dropped
5. **Infinite image references** — some slides reference images from master slides that may not be accessible

## Expected Behavior
- Invalid/unparseable images should be reported with a clear error, not silently dropped
- The UI should show which images failed and why
- Retry mechanism for transient failures

## Actual Behavior
- Images sometimes silently fail to parse
- The API may receive corrupt or empty image data
- No user-visible feedback about which images failed

## Files Affected
- `frontend/lib/pptx-renderer` — image extraction robustness
- `frontend/app/api/generate/image-descriptions/route.ts` — image data validation
- `frontend/components/dashboard/SlideEditor.tsx` — `BatchImageFetcher` error handling
- `frontend/lib/image-analysis.ts` — client-side error handling

## Edge Cases
1. Image is > 10MB after base64 encoding → skip with error message
2. Image mimeType is not in supported set → return unsupported format error
3. Image data is corrupt base64 → catch and error
4. PPTX has 0 images → skip gracefully, no API call
5. All images on a slide fail → show "No images could be analyzed"
6. Some images pass, some fail → partial results with per-image status

## Acceptance Criteria
1. Image validation before sending to API: mimeType check, max size check, base64 validity
2. Invalid images get error result `"Unsupported image format"` or `"Image too large"`
3. `BatchImageFetcher` shows per-image status (success/error/skipped)
4. Parsing errors in pptx-renderer are caught and logged with slide/image index
5. Failed images show individual retry buttons
6. Empty slides (no images) don't trigger API calls
