# PPT → PDF Slide Display on View Page

> **Status:** Spec — approved for implementation planning
> **Date:** 2026-07-09
> **Branch:** `feat/ppt-display-update`

## Goal

Replace the empty slide area on the public view page with rendered PDF slides. Each slide is a single-page PDF generated from the uploaded PPTX via LibreOffice on a free Render.com Docker worker.

## Architecture

```
Edit page: PPTX upload
  → R2 bucket: {userId}/{presentationId}.pptx
  → Frontend generates presigned URLs
  → POST to Render.com LibreOffice worker
    → Download PPTX via presigned GET URL
    → soffice --headless --convert-to pdf
    → pdf-lib splits into single-page PDFs
    → Upload each page via presigned PUT URL
  → R2 bucket: {userId}/pdf/{presentationId}/slide-{N}.pdf

View page: Load presentation
  → GET /api/view/[shareToken] (existing)
  → GET /api/view/[shareToken]/slides (new) → signed PDF URLs
  → react-pdf renders current slide
  → Auto-advance synced with audio
  → Manual prev/next navigation
```

## Components

### 1. Render.com Docker Worker (`worker/`)

A simple Node.js HTTP server running LibreOffice in Docker on Render.com free tier.

**Tech:** Node.js 20, Express, LibreOffice Impress, pdf-lib

**Endpoint:** `POST /convert`

**Security:**
- `Authorization: Bearer <SHARED_API_KEY>` header validated with constant-time comparison (`crypto.timingSafeEqual`)
- Zod validation on request body
- Temp files in `/tmp/convert/` cleaned up in `finally` block (download, intermediate PDF, per-page PDFs)
- No R2 credentials stored on worker — uses presigned URLs exclusively
- No secrets logged
- CORS restricted to known origins (Vercel deployment URL + custom domain)
- 5-minute timeout

**Request body (Zod schema):**
```typescript
z.object({
  pptxUrl: z.string().url(),
  slidePutUrls: z.record(z.string(), z.string().url()),
  slideCount: z.number().int().min(1).max(200),
})
```

**Conversion flow (pseudocode):**
```
1. Validate API key + Zod input
2. Create /tmp/convert directory
3. Download pptxUrl → /tmp/convert/input.pptx (stream, with timeout)
4. soffice --headless --convert-to pdf --outdir /tmp/convert /tmp/convert/input.pptx
5. Read /tmp/convert/input.pdf with pdf-lib
6. For each page i in 1..slideCount:
   a. Create new PDFDocument
   b. Copy page i from source
   c. Save as buffer
   d. PUT buffer to slidePutUrls[i] (with timeout)
7. Return { success: true, slideCount }
8. finally: rm -rf /tmp/convert
```

**Dockerfile:**
```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y libreoffice-impress && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
```

**Render.com setup:**
- Service type: Web Service
- Plan: Free
- Region: Choose closest
- Build command: (Docker automatically)
- Start command: `node server.js`
- Env vars:
  - `API_KEY` — shared secret (same as Vercel)
  - `PORT` — 8080
  - `NODE_ENV` — production
  - `CORS_ORIGIN` — comma-separated allowed origins

### 2. Frontend — Upload Confirmation (`api/presentations/[id]/upload/confirm`)

**Modification:** After confirming the PPTX upload, fire a background request to the Render worker.

```typescript
// After existing upload/confirm logic succeeds:

// Generate presigned URLs
const pptxGetUrl = await createDownloadUrl(
  `${userId}/${presentationId}.pptx`,
  3600 // 1 hour
);

const slidePutUrls: Record<string, string> = {};
for (let i = 1; i <= slideCount; i++) {
  slidePutUrls[String(i)] = await createUploadUrl(
    `${userId}/pdf/${presentationId}/slide-${i}.pdf`,
    "application/pdf",
    3600
  );
}

// Fire-and-forget to worker (don't await — background)
fetch(RENDER_WORKER_URL + "/convert", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${RENDER_WORKER_API_KEY}`,
  },
  body: JSON.stringify({ pptxUrl, slidePutUrls, slideCount }),
}).catch((err) => console.error("PDF conversion trigger failed:", err));
```

**Security considerations:**
- Resource ownership check: verify `req.user.id === presentation.user_id` (existing pattern)
- Presigned URLs scoped to 1 hour
- Worker API key from env var, never in logs

### 3. Frontend — New API Route (`api/view/[shareToken]/slides`)

**Purpose:** Return presigned GET URLs for all slide PDFs.

**Method:** GET
**Auth:** Valid viewer session (existing pattern from view page)

**Response:**
```json
{
  "data": {
    "slideCount": 10,
    "slides": [
      { "slideNumber": 1, "pdfUrl": "https://r2...signed..." },
      { "slideNumber": 2, "pdfUrl": "https://r2...signed..." }
    ]
  }
}
```

**Logic:**
1. Look up presentation by share_token (existing)
2. Verify viewer has valid session token (existing)
3. For each slide, generate presigned GET URL (7-day expiry, matching audio URL pattern)
4. Return array of { slideNumber, pdfUrl }
5. Handle missing PDFs gracefully — return null for unavailable slides

**Error handling:**
- If no PDFs exist (conversion not run yet): return `{ data: { slideCount, slides: [] } }` — view page shows "Slides not available" message with optional "Retry conversion" button
- If some PDFs missing: return null for those, view page shows placeholder

### 4. Frontend — View Page (`view/[shareToken]/page.tsx`)

**Install:** `react-pdf` from npm

**New component: `ViewSlide`**

```typescript
// components/view/ViewSlide.tsx
interface ViewSlideProps {
  pdfUrl: string | null;
  slideNumber: number;
  totalSlides: number;
  isActive: boolean;
}
```

- Uses `react-pdf` `Document` + `Page` components
- `Document` wraps `pdfjs-dist` worker from `node_modules`
- Page renders at full width, maintaining aspect ratio
- Loading state: skeleton placeholder
- Error state: "Failed to load slide" with retry
- Null URL: "Slide not available"

**View page modifications in `page.tsx`:**

```
Verified state (existing):
  - Audio bar at bottom (existing)
  - Sidebar with metadata (existing)
  → Replace empty <main> with:
    <main>
      <div className="slide-viewer">
        <ViewSlide pdfUrl={slides[currentSlide].pdfUrl} ... />
        <SlideControls prev/next onNavigate />
        <SlideCounter "3 / 10" />
      </div>
    </main>
```

**Audio sync:**
- View page already has `currentSlide` state (tracked by audio playback events — see existing `ViewAudioBar` and viewer event tracking)
- `ViewSlide` uses the same `currentSlide` state to know which PDF to display
- When audio finishes one slide and advances to the next, the `currentSlide` index updates → PDF auto-advances
- Manual prev/next buttons also update `currentSlide` state (visual-only for now; audio position sync is a future enhancement)

**Slide fetching:**
- On mount and after successful conversion, call `GET /api/view/[shareToken]/slides`
- Store `slides: Array<{ slideNumber, pdfUrl } | null>` in state
- Show loading skeleton while fetching
- If all slides are null, show "Slides not available" with retry CTA

**State loading:**
- On mount: fetch `GET /api/view/[shareToken]/slides`
- Show loading spinner while fetching
- Track current slide index (default 0 or from audio)
- Prefetch adjacent slides for smooth navigation

### 5. PDF Conversion Status

Track whether PDF conversion has been run:

**Option (simplest):** Store a `pdf_generated_at` timestamp or `pdf_status` field on the `presentations` table.

- `pdf_status`: `none` (default) | `pending` | `ready` | `failed`
- Set to `pending` when worker is called
- Worker calls back to a webhook on completion (or frontend polls)
- View page checks `pdf_status` to decide whether to show slides

**Simpler alternative (no DB changes):** View page calls `/slides` endpoint. If all PDFs return null, show "Slides not available" with retry button. No DB schema change needed.

**Decision:** Use the simple approach — no DB schema changes. Check PDF existence via the slides endpoint. Retry button triggers a new conversion request.

### Retry from View Page

If slides are unavailable, the view page shows a "Generate slides" button. This calls:

**New endpoint:** `POST /api/view/[shareToken]/convert`
- Requires valid viewer session (same auth as view page)
- Looks up the presentation by share_token
- Generates presigned PPTX download URL + per-slide PUT URLs
- Fires the Render worker (same logic as upload confirm)
- Returns `{ success: true }` immediately (fire-and-forget)
- View page polls `GET /api/view/[shareToken]/slides` every 5s until PDFs appear, then renders them

## Error Handling

| Scenario | Handling |
|---|---|
| Worker unreachable | Log error, return "ready" status to user. PDFs generated later via retry. |
| PPTX download fails | Worker returns 500. Frontend retry. |
| LibreOffice conversion fails | Worker returns 500 with error detail. Frontend shows "Conversion failed". |
| PDF split fails | Worker returns 500. Partial uploads cleaned up. |
| Missing PDF on view | View page shows placeholder for that slide. |
| All PDFs missing on view | "Slides not available" message + retry button. |
| react-pdf fails to load | Error state with retry on individual slide. |

## Performance

- LibreOffice on 0.1 CPU / 512 MB RAM will be slow (~10-30s for a 10-slide deck)
- Cold start on Render free tier: ~30s for first request after idle
- Pre-fetching adjacent slides on view page ensures smooth navigation
- PDFs served from R2 (CDN-cached via Cloudflare)
- react-pdf renders in canvas — GPU accelerated

## Security Checklist

- [x] Worker validates API key with constant-time comparison
- [x] Zod validation on all worker inputs
- [x] No R2 credentials on worker (signed URLs only)
- [x] Presigned URLs expire (1hr for upload, 7 days for view)
- [x] Temp files cleaned up in finally block
- [x] Resource ownership check on upload confirm
- [x] Viewer session check on slides endpoint
- [x] CORS restricted on worker
- [x] No secrets logged
- [x] HTTPS only (Render + Vercel default)

## Files to Create

| File | Purpose |
|---|---|
| `worker/package.json` | Worker dependencies (express, pdf-lib, zod, node-fetch) |
| `worker/server.js` | Express server with /convert endpoint |
| `worker/Dockerfile` | Node 20 slim + LibreOffice Impress |
| `worker/.gitignore` | node_modules, temp |
| `frontend/components/view/ViewSlide.tsx` | react-pdf slide component |
| `frontend/app/api/view/[shareToken]/slides/route.ts` | GET — returns signed PDF URLs |
| `frontend/app/api/view/[shareToken]/convert/route.ts` | POST — triggers PPTX→PDF conversion |

## Files to Modify

| File | Change |
|---|---|
| `frontend/app/view/[shareToken]/page.tsx` | Replace empty `<main>` with slide viewer, fetch slides, audio sync |
| `frontend/app/api/presentations/[id]/upload/confirm/route.ts` | Fire worker conversion after upload confirm |
| `frontend/app/api/view/[shareToken]/convert/route.ts` | Triggers conversion from view page (retry) |
| `frontend/.env.example` | Add RENDER_WORKER_URL and RENDER_WORKER_API_KEY |

## Out of Scope (for this iteration)

- Editing slides on the view page
- Downloading PDFs
- PDF annotations or highlighting
- Thumbnail preview strip
- Full-screen mode
- Mobile pinch-to-zoom on slides
