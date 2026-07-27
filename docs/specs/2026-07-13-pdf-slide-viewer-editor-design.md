# PDF-Based Slide Viewer for Editor

**Date:** 2026-07-13
**Status:** Approved
**Tags:** editor, pdf, slides, iframe-removal

## Problem

The editor currently uses a Microsoft Office Online iframe to display slides. Every slide navigation (arrow keys, buttons, jump input) reloads the entire iframe with a new `wdSlideIndex` parameter, causing significant load time (~2-5s per slide). The Office viewer is also unreliable — it occasionally fails to load, has CORS issues, and depends on an external Microsoft service.

## Solution

Replace the iframe with per-slide PDFs rendered via `react-pdf`. The PDF conversion infrastructure already exists: the Railway worker converts PPTX→PDF via LibreOffice, splits into per-slide PDFs, and uploads them to R2. The view (share) route already uses this system. The editor will wait for conversion to finish, then render slides via PDF.

## Architecture

### Flow

```
User uploads .pptx
  → Upload progress bar (existing)
  → POST /api/presentations/[id]/upload/confirm (fires PDF worker)
  → Poll GET /api/presentations/[id]/slides every 2s until slide-1.pdf exists
  → Show editor with PDF-based slide viewer
  → Arrow key navigation = swap PDF URL = instant
```

### New API Endpoint

**`GET /api/presentations/[id]/slides`** — authenticated (session-based, not share-token)

- Verifies auth + ownership of the presentation
- Lists PDF files in R2 under `{userId}/pdf/{presentationId}/`
- Returns signed URLs for each existing per-slide PDF
- Returns `{ data: { slides: [{ slideNumber, pdfUrl }], completed: boolean } }`
- `completed: true` when all slides have PDFs (or slide_count is met)

### Conversion Loading State

Full-screen overlay shown during upload → conversion, visible in `SlideEditor.tsx`:

```
┌─────────────────────────────────────┐
│          Preparing your slides       │
│                                      │
│   ✅ Uploading to storage            │
│   ⏳ Converting to PDF (spinner)     │
│   ⬜ Ready                           │
│                                      │
│   [linear progress bar]              │
│   ~15-30 seconds                     │
└─────────────────────────────────────┘
```

- Step 1: Upload progress bar (existing XHR upload)
- Step 2: Polling spinner with elapsed time counter
- Step 3: Transition to editor (fade out overlay)

### Shared Component: `SlidePdfViewer`

Extracted from the existing `ViewSlide.tsx`, shared between editor and view routes.

**Location:** `components/shared/SlidePdfViewer.tsx`

```tsx
type SlidePdfViewerProps = {
  pdfUrl: string | null
  slideWidth?: number
  aspectRatio?: number  // 4:3 default
  onLoadError?: () => void
}
```

- Uses `react-pdf`'s `<Document>` + `<Page>` (same as current ViewSlide)
- 4:3 aspect ratio by default
- Loading, error, and empty states inherited from ViewSlide
- The view route's `ViewSlide.tsx` becomes a thin wrapper that passes dimensions + PDF URL

### Editor Changes (`SlideEditor.tsx`)

**States removed:**
- `viewerUrl`, `baseViewerUrl` — iframe-related
- `viewerLoading` — no longer needed (PDF loads independently)
- `iframeError` — replaced by PDF load error

**States added:**
- `pdfUrls: (string | null)[]` — pre-fetched per-slide PDF signed URLs
- `conversionStatus: "uploading" | "converting" | "ready" | "error"` — loading state
- `conversionError: string` — error message if conversion fails

**Behavior changes:**
- `processFile()` no longer sets up iframe URL
- After confirm returns, polls `/api/presentations/[id]/slides` until `completed: true`
- `jumpToSlide()` just changes the current PDF index — no reload
- Pre-fetches adjacent slide PDF data for instant navigation
- Re-upload triggers the same flow with a fresh conversion
- Page restore with existing PDFs skips conversion

**Conversion error handling:**
- If polling exceeds 5 minutes or returns error, show "Conversion failed" with retry button
- Retry re-fires the worker via POST to `/api/presentations/[id]/convert`

### Arrow Key Navigation

**Before:** Reload iframe → 2-5s load time with loading spinner

**After:** Instant — just swap the PDF URL in the `<Document>` component:
```typescript
function jumpToSlide(slideNumber: number) {
  const idx = Math.max(0, Math.min(slideNumber - 1, total - 1))
  setInternalIndex(idx)
  setCurrentPdfIndex(idx)
}
```

### Files to Modify

| File | Change |
|---|---|
| `components/dashboard/SlideEditor.tsx` | Remove iframe, add conversion loading state, render PDFs via SlidePdfViewer |
| `components/view/ViewSlide.tsx` | Thin wrapper around SlidePdfViewer (or just use it directly) |
| `components/shared/SlidePdfViewer.tsx` | **New** — shared react-pdf component |
| `app/api/presentations/[id]/slides/route.ts` | **New** — endpoint to list per-slide PDF URLs for authenticated editor |
| `app/api/presentations/[id]/upload/confirm/route.ts` | Remove `skipConversion` param, always fire conversion |
| `components/dashboard/CreatePageSidebar.tsx` | No changes needed (sidebar is independent) |
| `app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx` | No changes needed (passes state through) |

### Edge Cases

- **No PDFs after reload:** If page is restored and PDFs don't exist (e.g., TTL expired or conversion failed), re-trigger conversion via the convert endpoint
- **Conversion timeout:** Show retry UI after 5 minutes
- **Partial conversion:** Some slides converted, some not — show available slides with "Converting..." badge on missing ones
- **Re-upload with different slide count:** Wipe old PDFs, re-convert, update state
- **Zero slides:** Keep existing error handling for empty presentations

## Success Criteria

1. Arrow key navigation is instant (no loading spinner between slides)
2. Upload → loading state → editor flow is smooth and communicates progress
3. Conversion failure shows retry UI
4. Re-upload triggers fresh conversion with loading state
5. Page restore with existing PDFs loads directly (no re-conversion)
6. View route still works (SlidePdfViewer maintains backward compatibility)
