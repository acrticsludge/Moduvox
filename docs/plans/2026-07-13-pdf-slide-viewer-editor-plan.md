# PDF Slide Viewer for Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Microsoft Office Online iframe in the editor with per-slide PDFs rendered via react-pdf, removing iframe reload delays and reusing existing PDF conversion infrastructure.

**Architecture:** The Railway worker already converts PPTX→PDF via LibreOffice and uploads per-slide PDFs to R2. The view route already uses react-pdf to display them. We:
1. Create a shared `SlidePdfViewer` component
2. Add an API endpoint for the editor to fetch per-slide PDF URLs
3. Make the editor wait for PDF conversion (with loading state) then render via react-pdf
4. Remove all iframe-related code

**Tech Stack:** react-pdf, pdfjs-dist, R2 presigned URLs, LibreOffice (worker)

---

### Task 1: Create shared `SlidePdfViewer` component

**Files:**
- Create: `frontend/components/shared/SlidePdfViewer.tsx`
- Reference: `frontend/components/view/ViewSlide.tsx` (existing component to base this on)

- [ ] **Step 1: Create the shared SlidePdfViewer component**

```tsx
"use client"

import { useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"

// Set up pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString()

export type SlidePdfViewerProps = {
  pdfUrl: string | null
  slideWidth?: number
  aspectRatio?: number // default 4:3 (0.75)
  onLoadError?: () => void
}

export function SlidePdfViewer({
  pdfUrl,
  slideWidth: externalWidth,
  aspectRatio = 0.75,
  onLoadError,
}: SlidePdfViewerProps) {
  const [loadError, setLoadError] = useState(false)

  const slideWidth = externalWidth ?? (typeof window !== "undefined"
    ? Math.min(window.innerWidth * 0.5, 880)
    : 800)
  const slideHeight = Math.round(slideWidth * aspectRatio)

  if (!pdfUrl) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-zinc-100"
        style={{ width: slideWidth, height: slideHeight }}
      >
        <p className="text-sm text-zinc-500">Slide not available</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-zinc-100"
        style={{ width: slideWidth, height: slideHeight }}
      >
        <p className="text-sm text-red-500">Failed to load slide</p>
      </div>
    )
  }

  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded-lg shrink-0"
      style={{ width: slideWidth, height: slideHeight }}
    >
      <Document
        file={pdfUrl}
        onLoadError={() => {
          setLoadError(true)
          onLoadError?.()
        }}
        loading={
          <div
            className="flex flex-col items-center justify-center gap-4 animate-pulse bg-zinc-100 rounded-lg"
            style={{ width: slideWidth, height: slideHeight }}
          >
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
            <div className="text-xs text-zinc-400">Loading slide…</div>
          </div>
        }
      >
        <Page
          pageNumber={1}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="shadow-sm"
          width={slideWidth}
        />
      </Document>
    </div>
  )
}
```

- [ ] **Step 2: Verify the component builds**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -50
```

Expected: No type errors related to SlidePdfViewer.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/shared/SlidePdfViewer.tsx
git commit -m "feat: create shared SlidePdfViewer component"
```

---

### Task 2: Update ViewSlide to use shared component

**Files:**
- Modify: `frontend/components/view/ViewSlide.tsx`
- No longer creates its own Document/Page — delegates to SlidePdfViewer

- [ ] **Step 1: Rewrite ViewSlide.tsx as a thin wrapper**

Read the full file first, then replace its content:

```tsx
"use client"

import { SlidePdfViewer } from "@/components/shared/SlidePdfViewer"

type ViewSlideProps = {
  pdfUrl: string | null
  slideNumber: number
  totalSlides: number
}

export function ViewSlide({ pdfUrl, slideNumber, totalSlides }: ViewSlideProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <SlidePdfViewer
        pdfUrl={pdfUrl}
        onLoadError={() => {
          console.error(`[ViewSlide] Failed to load slide ${slideNumber}/${totalSlides}`)
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify it builds**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -50
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/view/ViewSlide.tsx
git commit -m "refactor: ViewSlide uses shared SlidePdfViewer"
```

---

### Task 3: Create `GET /api/presentations/[id]/slides` endpoint

**Files:**
- Create: `frontend/app/api/presentations/[id]/slides/route.ts`
- This returns per-slide PDF signed URLs for the authenticated editor (same logic as view slides endpoint but uses user session instead of share token)

- [ ] **Step 1: Create the API route**

```ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createDownloadUrl, listFiles } from "@/lib/r2"
import { withApiHandler } from "@/lib/api-handler"

export const GET = withApiHandler(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const supabase = await createClient()
  const { id: presentationId } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify ownership
  const { data: presentation } = await supabase
    .from("presentations")
    .select("id, user_id, slide_count")
    .eq("id", presentationId)
    .single()

  if (!presentation) {
    return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
  }

  if (presentation.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const slideCount = presentation.slide_count || 0

  // List all PDFs for this presentation
  const pdfPrefix = `${user.id}/pdf/${presentationId}/`
  const existingFiles = await listFiles(pdfPrefix)
  const existingKeys = new Set(
    (existingFiles.success ? existingFiles.data.map((f: any) => f.Key) : []) as string[],
  )

  const slides: { slideNumber: number; pdfUrl: string | null }[] = []
  let completedCount = 0

  for (let i = 1; i <= slideCount; i++) {
    const key = `${pdfPrefix}slide-${i}.pdf`
    if (existingKeys.has(key)) {
      const pdfUrl = await createDownloadUrl(key, 3600) // 1 hour
      slides.push({ slideNumber: i, pdfUrl })
      completedCount++
    } else {
      slides.push({ slideNumber: i, pdfUrl: null })
    }
  }

  return NextResponse.json({
    data: {
      slideCount,
      slides,
      completed: completedCount === slideCount,
      convertedCount: completedCount,
    },
  })
})
```

- [ ] **Step 2: Verify it builds**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -50
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/presentations/[id]/slides/route.ts
git commit -m "feat: add GET /api/presentations/[id]/slides endpoint"
```

---

### Task 4: Update confirm route — remove skipConversion, always fire

**Files:**
- Modify: `frontend/app/api/presentations/[id]/upload/confirm/route.ts`

- [ ] **Step 1: Remove the `skipConversion` parameter and related logic**

Read the full file first. Changes:
1. Remove `const skipConversion = body.skipConversion === true` (line 21)
2. Remove the `if (skipConversion)` early return block (lines 72-73)
3. Always fire the worker — remove the `else if` condition, just keep the conversion block
4. Remove `skipConversion: !file` from the caller (but that's in SlideEditor.tsx — will handle in Task 5)

Edit the confirm route to remove the `skipConversion` branch:

```typescript
// Remove line 21:
// const skipConversion = body.skipConversion === true

// Remove lines 72-73:
// if (skipConversion) {
//   console.log("[upload] skipConversion=true — not firing PDF worker (page restore)")
// } else 
```

The conversion block (currently lines 74-110) becomes unconditional when `workerUrl` and `apiKey` are present.

- [ ] **Step 2: Verify it builds**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -50
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/presentations/[id]/upload/confirm/route.ts
git commit -m "fix: always fire PDF conversion on upload confirm"
```

---

### Task 5: Update SlideEditor — iframe removal, loading state, polling, PDF viewer

**Files:**
- Modify: `frontend/components/dashboard/SlideEditor.tsx`
- This is the biggest task. Remove iframe, add conversion loading state with 3-step progress, add polling, replace iframe with SlidePdfViewer.

- [ ] **Step 1: Read full SlideEditor.tsx** to have complete context

Read the file twice to understand all state, effects, and JSX sections.

- [ ] **Step 2: Add new states and imports**

Add to the imports section at the top:
```tsx
import { SlidePdfViewer } from "@/components/shared/SlidePdfViewer"
import { Check } from "lucide-react"
```

Add new state variables alongside existing ones (around line 67-99):
```tsx
const [pdfUrls, setPdfUrls] = useState<(string | null)[]>([])
const [conversionStatus, setConversionStatus] = useState<"uploading" | "converting" | "ready" | "error">("uploading")
const [conversionError, setConversionError] = useState("")
const [pollAttempts, setPollAttempts] = useState(0)
```

- [ ] **Step 3: Remove iframe-related state declarations**

Remove these lines:
```tsx
const [viewerUrl, setViewerUrl] = useState<string | null>(null)       // line 73
const [baseViewerUrl, setBaseViewerUrl] = useState<string>("")         // line 74
const [viewerLoading, setViewerLoading] = useState(false)              // line 85
const [iframeError, setIframeError] = useState(false)                  // line 86
```

- [ ] **Step 4: Remove the `skipConversion` argument from the confirm call**

In the `processFile` function (around line 189), change:
```tsx
body: JSON.stringify({ path, slideCount, skipConversion: !file }),
```
to:
```tsx
body: JSON.stringify({ path, slideCount }),
```

- [ ] **Step 5: Replace iframe setup with polling logic**

In `processFile()`, after the confirm call succeeds and returns (around line 195-206), replace the viewer URL setup block:

Current code (lines 195-206):
```tsx
if (confirmJson.data?.viewerUrl) {
  signedViewerUrl = confirmJson.data.viewerUrl
  const encodedUrl = encodeURIComponent(signedViewerUrl)
  setBaseViewerUrl(encodedUrl)
  if (!cancelled) {
    const slideIdx = (externalCurrentSlide ?? 0) + 1
    setViewerUrl(`https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}&wdSlideIndex=${slideIdx}`)
  }
}
```

Replace with:
```tsx
// Start polling for PDF conversion
if (!cancelled) {
  setConversionStatus("converting")
  pollForPdfs(presentationId, parsedSlides?.length ?? 1)
}
```

- [ ] **Step 6: Add the polling function**

Add this function inside the component, before `processFile`:

```tsx
const POLL_INTERVAL = 2000
const MAX_POLL_ATTEMPTS = 150 // 5 minutes max

const pollForPdfs = useCallback(async (presId: string, slideCount: number) => {
  let attempts = 0
  const poll = async () => {
    if (attempts >= MAX_POLL_ATTEMPTS) {
      setConversionStatus("error")
      setConversionError("Conversion timed out. Please try again.")
      return
    }
    attempts++
    setPollAttempts(attempts)

    try {
      const res = await fetch(`/api/presentations/${presId}/slides`)
      const json = await res.json()
      if (json.data?.completed) {
        const urls: (string | null)[] = []
        for (const slide of json.data.slides) {
          urls[slide.slideNumber - 1] = slide.pdfUrl
        }
        setPdfUrls(urls)
        setConversionStatus("ready")
        setLoading(false)
        return // done
      }
    } catch {
      // Silently retry on network errors
    }
    setTimeout(poll, POLL_INTERVAL)
  }
  poll()
}, [])
```

- [ ] **Step 7: Update `jumpToSlide` to remove iframe logic**

Change from:
```tsx
function jumpToSlide(slideNumber: number) {
  const idx = Math.max(0, Math.min(slideNumber - 1, total - 1))
  setInternalIndex(idx)
  onCurrentSlideChange?.(idx)
  setSlideInput(String(idx + 1))
  // Reload Office viewer at the target slide
  if (baseViewerUrl) {
    setViewerLoading(true)
    setIframeError(false)
    setViewerUrl(
      `https://view.officeapps.live.com/op/embed.aspx?src=${baseViewerUrl}&wdSlideIndex=${idx + 1}`,
    )
  }
}
```

To:
```tsx
function jumpToSlide(slideNumber: number) {
  const idx = Math.max(0, Math.min(slideNumber - 1, total - 1))
  setInternalIndex(idx)
  onCurrentSlideChange?.(idx)
  setSlideInput(String(idx + 1))
}
```

- [ ] **Step 8: Update `handleRemovePpt` to reset PDF state**

Add to the state resets in `handleRemovePpt` (after line 611):
```tsx
setPdfUrls([])
setConversionStatus("uploading")
setConversionError("")
```

- [ ] **Step 9: Replace the iframe JSX block with conversion loading state + PDF viewer**

Find the JSX section that renders the left panel (around lines 864-955). Replace the entire block:

Current (lines 864-955):
```tsx
{/* Left — Office Online viewer showing the actual PPTX */}
<div className="relative flex flex-1 flex-col bg-zinc-100">
  {/* Processing overlay during re-upload */}
  {reUploading ? (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-[#71717A]" />
      <p className="text-sm text-[#71717A]">Processing PPTX...</p>
    </div>
  ) : viewerUrl && !iframeError ? (
    <>
      <div className="relative flex-1">
        <iframe ... />
        {viewerLoading && !reUploading && (...)}
      </div>
      <div className="absolute bottom-3 right-3 flex flex-wrap justify-end gap-1.5">
        {/* Re-upload, Remove PPT, Full screen buttons */}
      </div>
    </>
  ) : iframeError ? (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-2 p-8">
      <p className="text-sm text-amber-600">Failed to load presentation preview.</p>
      <p className="text-xs text-[#71717A]">Try refreshing or re-uploading the file.</p>
    </div>
  ) : (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <p className="text-sm text-[#71717A]">Upload processed. Slide preview unavailable.</p>
    </div>
  )}
</div>
```

Replace with:
```tsx
{/* Left — PDF-based slide viewer */}
<div className="relative flex flex-1 flex-col bg-zinc-100">
  {/* Processing overlay during re-upload */}
  {reUploading ? (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-[#71717A]" />
      <p className="text-sm text-[#71717A]">Processing PPTX...</p>
    </div>
  ) : conversionStatus === "uploading" || conversionStatus === "converting" ? (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-6">
      {/* Step 1: Uploading */}
      <div className="flex items-center gap-3">
        {conversionStatus === "uploading" ? (
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
            <Check className="h-3 w-3 text-white" />
          </div>
        )}
        <div>
          <p className={`text-sm font-medium ${conversionStatus === "uploading" ? "text-zinc-700" : "text-zinc-500"}`}>
            Uploading to storage
          </p>
          {conversionStatus === "uploading" && uploadProgress > 0 && (
            <p className="text-xs text-zinc-400">{uploadProgress}%</p>
          )}
        </div>
      </div>

      {/* Step 2: Converting */}
      <div className="flex items-center gap-3">
        {conversionStatus === "converting" ? (
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
            <Check className="h-3 w-3 text-white" />
          </div>
        )}
        <div>
          <p className={`text-sm font-medium ${conversionStatus === "converting" ? "text-zinc-700" : "text-zinc-500"}`}>
            Converting to PDF
          </p>
          {conversionStatus === "converting" && (
            <p className="text-xs text-zinc-400">
              ~{Math.min(Math.round(pollAttempts * 2), 60)} seconds elapsed
            </p>
          )}
        </div>
      </div>

      {/* Linear progress bar */}
      <div className="h-1.5 w-64 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-zinc-600 transition-all duration-500"
          style={{
            width: conversionStatus === "uploading"
              ? `${Math.max(uploadProgress, 10)}%`
              : "90%",
          }}
        />
      </div>

      <p className="text-xs text-zinc-400">This should take about 15–30 seconds</p>
    </div>
  ) : conversionStatus === "error" ? (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 p-8">
      <p className="text-sm text-amber-600">Failed to convert presentation.</p>
      <p className="text-xs text-zinc-400">{conversionError || "The conversion server may be unavailable."}</p>
      <button
        type="button"
        onClick={() => {
          setConversionStatus("converting")
          setConversionError("")
          pollForPdfs(presentationId, slides.length)
        }}
        className="mt-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
      >
        Retry
      </button>
    </div>
  ) : pdfUrls.length > 0 ? (
    <>
      <div className="relative flex flex-1 items-center justify-center p-4">
        <SlidePdfViewer
          pdfUrl={pdfUrls[currentIndex] ?? null}
          onLoadError={() => {
            console.error(`[Editor] Failed to load PDF for slide ${currentIndex + 1}`)
          }}
        />
      </div>
      <div className="absolute bottom-3 right-3 flex flex-wrap justify-end gap-1.5">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-[#71717A] shadow-sm transition-colors hover:text-[#18181B]">
          <FileText className="h-3 w-3" />
          Re-upload
          <input
            type="file"
            accept=".pptx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleReUploadFile(f)
              e.target.value = ""
              setRemoveConfirm(false)
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            if (removeConfirm) {
              setRemoveConfirm(false)
              handleRemovePpt()
            } else {
              setRemoveConfirm(true)
            }
          }}
          disabled={removingPpt}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
            removeConfirm
              ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
              : "border-zinc-200 bg-white text-[#71717A] hover:text-red-600"
          }`}
        >
          {removingPpt ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : removeConfirm ? (
            "Confirm?"
          ) : (
            "Remove PPT"
          )}
        </button>
        {pdfUrls[currentIndex] && (
          <a
            href={pdfUrls[currentIndex]!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-[#71717A] shadow-sm transition-colors hover:text-[#18181B]"
          >
            <ExternalLink className="h-3 w-3" />
            Full screen
          </a>
        )}
      </div>
    </>
  ) : (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <p className="text-sm text-[#71717A]">Presentation could not be loaded.</p>
    </div>
  )}
</div>
```

- [ ] **Step 10: Remove unused `ExternalLink` import** if no longer referenced elsewhere in the file. Actually it's still used in the "Full screen" button above, so keep it.

Let's verify: `Play, Loader2, ExternalLink, FileText, ChevronRight, X, Share2` — ExternalLink is still used in the Full screen button. Keep it.

- [ ] **Step 11: Verify the component builds**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -80
```

Expected: No type errors. If there are errors about `viewerUrl`, `baseViewerUrl`, `viewerLoading`, or `iframeError` being referenced elsewhere, fix those remaining references.

Search for remaining references to removed states:
```bash
cd frontend && grep -n "viewerUrl\|baseViewerUrl\|viewerLoading\|iframeError" components/dashboard/SlideEditor.tsx
```

Expected: No remaining references (all were in the replaced JSX block, jumpToSlide, handleRemovePpt, and processFile).

- [ ] **Step 12: Commit**

```bash
git add frontend/components/dashboard/SlideEditor.tsx
git commit -m "feat: replace iframe with PDF viewer in editor"
```

---

### Task 6: Verify build and fix any issues

- [ ] **Step 1: Full type check**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1
```

Expected: Clean build with no errors.

- [ ] **Step 2: Build check**

```bash
cd frontend && npm run build 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Step 3: Final commit** if any fixes were needed

```bash
git add -A
git commit -m "fix: address build issues from PDF viewer migration"
```
