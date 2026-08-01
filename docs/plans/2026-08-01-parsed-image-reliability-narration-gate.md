# Parsed Image Reliability & Narration Gate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make image parsing fire automatically on upload, persist reliably across refresh, and hard-block narration for slides whose images aren't fully parsed (with failed-only retry + auto-re-narration).

**Architecture:** Client-side parsing orchestration. New pure helpers + chunked describe in `lib/image-analysis.ts` (≤20 images/request, ≥6s spacing). `SlideEditor` owns an effect-driven parser (replacing the broken `BatchImageFetcher`), a per-slide narration gate, and a retry flow. Persistence stays in R2 + `editor_state` JSONB but the R2 save is awaited and a flush-save is added to the page so keys+descriptions persist immediately. `SlideParsedData` gains a recovery parse on Images-tab open and failed-only retries.

**Tech Stack:** Next.js App Router, TypeScript strict, React 18, node:test + tsx (unit tests), R2, Supabase, Tailwind/shadcn.

**Spec:** `docs/specs/2026-08-01-parsed-image-reliability-narration-gate-design.md`

---

### Task 0: Prepare workspace (controller only — not a subagent task)

The working tree has a pre-existing uncommitted change in `frontend/components/dashboard/SlideEditor.tsx` (an audio-player refactor). It MUST NOT be committed or reverted. Since Tasks 2-5 modify that file, the controller must stash it before dispatching any SlideEditor implementer and pop it after all tasks are committed:

```bash
git stash push -- frontend/components/dashboard/SlideEditor.tsx
# verify clean:
git status --short
```

After the final review, restore:

```bash
git stash pop
# verify ONLY the audio-player change is back as uncommitted:
git diff --stat frontend/components/dashboard/SlideEditor.tsx   # expect ~11 insertions / ~19 deletions
```

**Run every command from repo root `C:\Anubhav\Web Dev Projects\Moduvox`. Use `frontend` as workdir for npm commands.**

---

### Task 1: Pure helpers + chunked describe in `lib/image-analysis.ts` (TDD)

**Files:**
- Modify: `frontend/lib/image-analysis.ts`
- Test: `frontend/lib/__tests__/image-analysis.test.ts` (new)

- [ ] **Step 1: Write the failing tests**

Create `frontend/lib/__tests__/image-analysis.test.ts`:

```ts
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  isSlideParsingComplete,
  imagesNeedingAnalysis,
  chunkImageRequests,
  describeSlideImagesChunked,
} from "@/lib/image-analysis"
import type { ImageDescription } from "@/lib/pptx-renderer"

const slideImages = [
  { index: 0, mimeType: "image/png", dataUrl: "data:image/png;base64,AAAA" },
  { index: 1, mimeType: "image/png", dataUrl: "data:image/png;base64,BBBB" },
  { index: 2, mimeType: "image/jpeg", dataUrl: "data:image/jpeg;base64,CCCC" },
]

function desc(index: number, description = "Chart: growth", error?: string): ImageDescription {
  return { index, description, error }
}

describe("isSlideParsingComplete", () => {
  it("returns true when the slide has no images", () => {
    assert.equal(isSlideParsingComplete([], []), true)
    assert.equal(isSlideParsingComplete([], undefined), true)
  })
  it("returns false when descriptions are missing", () => {
    assert.equal(isSlideParsingComplete(slideImages, undefined), false)
  })
  it("returns true when every image has a non-error description", () => {
    const descs = [desc(0), desc(1), desc(2)]
    assert.equal(isSlideParsingComplete(slideImages, descs), true)
  })
  it('treats "No significant visual content." as a valid description', () => {
    const descs = [desc(0), desc(1, "No significant visual content."), desc(2)]
    assert.equal(isSlideParsingComplete(slideImages, descs), true)
  })
  it("returns false when an image has an error", () => {
    const descs = [desc(0), desc(1, "", "Analysis failed"), desc(2)]
    assert.equal(isSlideParsingComplete(slideImages, descs), false)
  })
  it("returns false when an image description is empty", () => {
    const descs = [desc(0), desc(1, ""), desc(2)]
    assert.equal(isSlideParsingComplete(slideImages, descs), false)
  })
  it("returns false when an image is missing from the descriptions", () => {
    const descs = [desc(0), desc(2)]
    assert.equal(isSlideParsingComplete(slideImages, descs), false)
  })
})

describe("imagesNeedingAnalysis", () => {
  it("returns all images when descriptions are missing", () => {
    assert.deepEqual(imagesNeedingAnalysis(slideImages, undefined), slideImages)
  })
  it("returns only failed and missing images", () => {
    const descs = [desc(0), desc(1, "", "Analysis failed")]
    const result = imagesNeedingAnalysis(slideImages, descs)
    assert.deepEqual(result.map((i) => i.index), [1, 2])
  })
  it("returns empty when everything is described", () => {
    const descs = [desc(0), desc(1), desc(2)]
    assert.deepEqual(imagesNeedingAnalysis(slideImages, descs), [])
  })
})

describe("chunkImageRequests", () => {
  const slides = [
    { number: 1, images: [slideImages[0]] },
    { number: 2, images: [slideImages[1], slideImages[2]] },
  ]
  it("keeps everything in one chunk when under the limit", () => {
    const chunks = chunkImageRequests(slides, 20)
    assert.equal(chunks.length, 1)
    assert.equal(chunks[0].length, 2)
  })
  it("splits into multiple chunks respecting the image cap", () => {
    const many = Array.from({ length: 5 }, (_, n) => ({
      number: n + 1,
      images: Array.from({ length: 5 }, (_, i) => ({ index: i, mimeType: "image/png", dataUrl: "data:image/png;base64,X" })),
    }))
    const chunks = chunkImageRequests(many, 12)
    const perChunk = chunks.map((c) => c.reduce((n, s) => n + s.images.length, 0))
    assert.ok(perChunk.every((n) => n <= 12))
    assert.equal(perChunk.reduce((a, b) => a + b, 0), 25)
  })
  it("returns empty for empty input", () => {
    assert.deepEqual(chunkImageRequests([], 20), [])
  })
})

describe("describeSlideImagesChunked", () => {
  it("merges results across chunks and marks unreturned images as failed", async () => {
    const requests: string[] = []
    const origFetch = global.fetch
    global.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String((init as RequestInit)?.body))
      requests.push(JSON.stringify(body))
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            slides: (body as { slides: { number: number; images: { index: number }[] }[] }).slides.map((s: { number: number; images: { index: number }[] }) => ({
              number: s.number,
              images: s.images.map((img) => ({ index: img.index, description: `desc ${img.index}`, error: undefined })),
            })),
          },
        }),
      } as Response
    }) as typeof fetch

    try {
      const slides = [
        { number: 1, images: [slideImages[0], slideImages[1]] },
        { number: 2, images: [slideImages[2]] },
      ]
      const result = await describeSlideImagesChunked("pres-id", slides, { maxImagesPerRequest: 2, chunkDelayMs: 0 })
      assert.equal(result.slides.length, 2)
      const slide1 = result.slides.find((s) => s.number === 1)!
      assert.deepEqual(slide1.images.map((i) => i.index), [0, 1])
      assert.ok(slide1.images.every((i) => !i.error && i.description === `desc ${i.index}`))
      assert.equal(requests.length, 2) // 3 images / 2 per chunk = 2 chunks
    } finally {
      global.fetch = origFetch
    }
  })

  it("marks all images in a chunk as failed when the request throws", async () => {
    const origFetch = global.fetch
    global.fetch = (async () => {
      throw new Error("network down")
    }) as typeof fetch
    try {
      const slides = [{ number: 1, images: [slideImages[0], slideImages[1]] }]
      const result = await describeSlideImagesChunked("pres-id", slides, { chunkDelayMs: 0 })
      assert.equal(result.slides.length, 1)
      assert.ok(result.slides[0].images.every((i) => i.error === "Analysis failed"))
    } finally {
      global.fetch = origFetch
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `frontend/`: `npx tsx --test lib/__tests__/image-analysis.test.ts`
Expected: FAIL — module does not export the new functions.

- [ ] **Step 3: Implement the helpers + chunked describe**

Add to `frontend/lib/image-analysis.ts` (top: `import type { ImageDescription } from "@/lib/pptx-renderer"`):

```ts
// ── Parsing completeness helpers ─────────────────────────────────

type SlideWithImages = { number: number; images: { index: number; mimeType: string; dataUrl: string }[] }
type SlideImageResult = { number: number; images: ImageDescription[] }

/** True when the slide has no images, or every image has a non-error description. */
export function isSlideParsingComplete(
  slideImages: { index: number }[],
  descriptions?: ImageDescription[] | null,
): boolean {
  if (slideImages.length === 0) return true
  if (!descriptions) return false
  return slideImages.every((img) => {
    const d = descriptions.find((x) => x.index === img.index)
    return Boolean(d && d.description && !d.error)
  })
}

/** Images that still need parsing: missing description, empty description, or error. */
export function imagesNeedingAnalysis(
  slideImages: { index: number; mimeType: string; dataUrl: string }[],
  descriptions?: ImageDescription[] | null,
): { index: number; mimeType: string; dataUrl: string }[] {
  if (slideImages.length === 0) return []
  if (!descriptions) return [...slideImages]
  return slideImages.filter((img) => {
    const d = descriptions.find((x) => x.index === img.index)
    return !d || !d.description || Boolean(d.error)
  })
}

/** Chunk (slideNumber, image) pairs so each request has at most maxImagesPerRequest images. */
export function chunkImageRequests(
  slidesWithImages: SlideWithImages[],
  maxImagesPerRequest = 20,
): SlideWithImages[][] {
  const chunks: SlideWithImages[][] = []
  let current: SlideWithImages[] = []
  let count = 0

  for (const slide of slidesWithImages) {
    for (const img of slide.images) {
      if (count >= maxImagesPerRequest) {
        chunks.push(current)
        current = []
        count = 0
      }
      const last = current[current.length - 1]
      if (last && last.number === slide.number) {
        last.images.push(img)
      } else {
        current.push({ number: slide.number, images: [img] })
      }
      count++
    }
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}

/** Convert a data URI or signed R2 URL to a base64 data URI for the API. */
async function toBase64DataUrl(dataUrl: string): Promise<string> {
  if (dataUrl.startsWith("data:")) return dataUrl
  const res = await fetch(dataUrl)
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("Failed to read image"))
    reader.readAsDataURL(blob)
  })
}

/** Describe all images across slides, chunking to respect the API's 20-image cap and 10/min rate limit. */
export async function describeSlideImagesChunked(
  presentationId: string,
  slidesWithImages: SlideWithImages[],
  opts?: { maxImagesPerRequest?: number; chunkDelayMs?: number; onProgress?: (done: number, total: number) => void },
): Promise<{ slides: SlideImageResult[] }> {
  const maxImagesPerRequest = opts?.maxImagesPerRequest ?? 20
  const chunkDelayMs = opts?.chunkDelayMs ?? 6000
  const chunks = chunkImageRequests(slidesWithImages, maxImagesPerRequest)
  const bySlide = new Map<number, ImageDescription[]>()
  let processed = 0
  const total = slidesWithImages.reduce((n, s) => n + s.images.length, 0)

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0 && chunkDelayMs > 0) {
      await new Promise((r) => setTimeout(r, chunkDelayMs))
    }
    let result: { slides: SlideImageResult[] }
    try {
      result = await describeSlideImages(presentationId, chunks[i])
    } catch {
      // Mark every image in this chunk as failed so the caller can surface retry.
      result = {
        slides: chunks[i].map((s) => ({
          number: s.number,
          images: s.images.map((img) => ({ index: img.index, description: "", error: "Analysis failed" })),
        })),
      }
    }
    for (const slide of result.slides) {
      const existing = bySlide.get(slide.number)
      if (existing) existing.push(...slide.images)
      else bySlide.set(slide.number, [...slide.images])
      processed += slide.images.length
      opts?.onProgress?.(Math.min(processed, total), total)
    }
  }

  return { slides: Array.from(bySlide.entries()).map(([number, images]) => ({ number, images })) }
}
```

- [ ] **Step 4: Update `describeSlideImages` to normalize data URLs (base64 or signed R2 URL)**

Replace the existing `describeSlideImages` body's payload construction so it resolves URLs to base64 data URIs first (restored images come from R2 as signed URLs):

```ts
export async function describeSlideImages(
  presentationId: string,
  slidesWithImages: {
    number: number
    images: { index: number; mimeType: string; dataUrl: string }[]
  }[],
): Promise<ImageDescriptionResponse> {
  // Resolve data URIs OR signed R2 URLs to base64 data URIs before sending.
  const normalized = await Promise.all(
    slidesWithImages.map(async (slide) => ({
      number: slide.number,
      images: await Promise.all(
        slide.images.map(async (img) => ({
          index: img.index,
          mimeType: img.mimeType,
          dataUrl: await toBase64DataUrl(img.dataUrl),
        })),
      ),
    })),
  )

  const payload: ImageDescriptionRequest = {
    presentationId,
    slides: normalized.map((slide) => ({
      number: slide.number,
      images: slide.images.map((img) => ({
        index: img.index,
        mimeType: img.mimeType,
        data: img.dataUrl.replace(/^data:image\/\w+;base64,/, ""),
      })),
    })),
  }

  const res = await fetch("/api/generate/image-descriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error("Image description request failed")
  }

  const json = await res.json()
  return json.data as ImageDescriptionResponse
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run from `frontend/`: `npx tsx --test lib/__tests__/image-analysis.test.ts`
Expected: PASS (all suites).

- [ ] **Step 6: Type-check**

Run from `frontend/`: `npm run type-check`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/lib/image-analysis.ts frontend/lib/__tests__/image-analysis.test.ts
git commit -m "feat: add parsing completeness helpers and chunked image description"
```

---

### Task 2: Fix auto-parse trigger in SlideEditor (replace BatchImageFetcher)

**Files:**
- Modify: `frontend/components/dashboard/SlideEditor.tsx`
- Modify: `frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx` (pass `onRequestPersist` — done in Task 3; only add the prop if Task 3 not yet landed; otherwise coordinate)

> **NOTE:** If Task 0 stashed the file, it is now clean. Commit ONLY your own hunks. Never stage the audio-player refactor (it should be stashed — verify `git status` shows SlideEditor.tsx as clean/absent before starting).

- [ ] **Step 1: Import helpers + add parsing state**

At the top of `SlideEditor.tsx`, add to the `@/lib/image-analysis` import (do NOT import `describeSlideImages` here — it is unused in SlideEditor):

```ts
import {
  describeSlideImagesChunked,
  isSlideParsingComplete,
  imagesNeedingAnalysis,
} from "@/lib/image-analysis"
```

Add state after `imageDescLoading` (line ~122):

```ts
const [imageDescStatus, setImageDescStatus] = useState<"idle" | "loading" | "complete" | "error">("idle")
const [blockedSlides, setBlockedSlides] = useState<number[]>([])
const [retryableError, setRetryableError] = useState<string | null>(null)
const imageParsingRef = useRef(false)
```

Remove `handleBatchResult` (lines 123-125) — BatchImageFetcher is being deleted.

**Add the `onRequestPersist` and `onResetImageDescriptions` props** to the destructured props + prop type (so `runImageParsing`/`retryFailedImages` can call them; `page.tsx` wires them in Task 3):

```ts
  onRequestPersist,
  onResetImageDescriptions,
}: {
  ...
  onRequestPersist?: () => void
  /** Fully clear cached image descriptions (fresh upload of a new deck). */
  onResetImageDescriptions?: () => void
})
```

- [ ] **Step 2: Add helper functions (module scope, above the component or at bottom)**

```ts
/** Merge per-slide image results into a Record<slideNumber, desc[]> (later results win per index). */
function mergeImageResults(
  slideResults: { number: number; images: ImageDesc[] }[],
): Record<number, ImageDesc[]> {
  const out: Record<number, ImageDesc[]> = {}
  for (const slide of slideResults) {
    const existing = out[slide.number] ?? []
    for (const img of slide.images) {
      const idx = existing.findIndex((x) => x.index === img.index)
      if (idx >= 0) existing[idx] = img
      else existing.push(img)
    }
    out[slide.number] = existing
  }
  return out
}

/** Collect slides with images that still need analysis, given the current descriptions. */
function collectFailedImages(
  slides: ParsedSlide[],
  descriptions: Record<number, ImageDesc[]>,
): { number: number; images: { index: number; mimeType: string; dataUrl: string }[] }[] {
  return slides
    .filter((s) => s.images.length > 0)
    .map((s) => ({
      number: s.number,
      images: imagesNeedingAnalysis(s.images, descriptions[s.number]),
    }))
    .filter((s) => s.images.length > 0)
}
```

- [ ] **Step 3: Add `runImageParsing` + `retryFailedImages` useCallbacks inside the component**

After `handleBatchResult` is removed (place near other useCallbacks, e.g. after `pollForPdfs`):

```ts
/** Describe ALL image-bearing slides in chunks, merge results, one auto-retry, then persist. */
const runImageParsing = useCallback(async () => {
  if (imageParsingRef.current) return
  imageParsingRef.current = true
  setImageDescStatus("loading")
  setImageDescLoading(true)
  setBlockedSlides([])
  setRetryableError(null)

  const slidesWithImages = slides.filter((s) => s.images.length > 0)
  try {
    let result = await describeSlideImagesChunked(presentationId, slidesWithImages)
    let merged = mergeImageResults(result.slides)

    // Q4: one auto-retry (3s backoff) for failed images only.
    const failed = collectFailedImages(slides, merged)
    if (failed.length > 0) {
      await new Promise((r) => setTimeout(r, 3000))
      const retryResult = await describeSlideImagesChunked(presentationId, failed)
      merged = mergeImageResults([...result.slides, ...retryResult.slides])
    }

    onImageDescriptionsChange?.(merged)
    onRequestPersist?.()

    const stillBlocked = slides.filter(
      (s) => s.images.length > 0 && !isSlideParsingComplete(s.images, merged[s.number]),
    )
    setBlockedSlides(stillBlocked.map((s) => s.number))
    setImageDescStatus(stillBlocked.length > 0 ? "error" : "complete")
  } catch (err) {
    console.error("[SlideEditor] Image parsing failed:", err)
    setImageDescStatus("error")
    setRetryableError(err instanceof Error ? err.message : "Image analysis failed")
  } finally {
    imageParsingRef.current = false
    setImageDescLoading(false)
  }
}, [slides, presentationId, onImageDescriptionsChange, onRequestPersist])

/** Re-analyze failed images only, then auto-fire narration if parsing completes (Q7). */
const retryFailedImages = useCallback(async () => {
  if (imageParsingRef.current) return
  imageParsingRef.current = true
  setImageDescLoading(true)
  try {
    const failed = collectFailedImages(slides, externalImageDescriptions ?? {})
    if (failed.length > 0) {
      const result = await describeSlideImagesChunked(presentationId, failed)
      const merged = mergeImageResults(result.slides)
      const combined: Record<number, ImageDesc[]> = { ...externalImageDescriptions }
      for (const [k, v] of Object.entries(merged)) combined[Number(k)] = v
      onImageDescriptionsChange?.(combined)
      onRequestPersist?.()
    }
    const stillBlocked = slides.filter(
      (s) => s.images.length > 0 && !isSlideParsingComplete(s.images, externalImageDescriptions?.[s.number]),
    )
    setBlockedSlides(stillBlocked.map((s) => s.number))
    if (stillBlocked.length === 0) {
      setImageDescStatus("complete")
      setRetryableError(null)
      setGenerationFailed(false)
      // Q7: auto-fire narration once parsing succeeds.
      const ok = await generateNarrations(slides, true)
      if (!ok) setGenerationFailed(true)
    } else {
      setImageDescStatus("error")
      setRetryableError(
        `Image analysis incomplete for slide${stillBlocked.length > 1 ? "s" : ""} ${stillBlocked.map((s) => s.number).join(", ")}. Retry to analyze and continue.`,
      )
    }
  } catch (err) {
    console.error("[SlideEditor] Retry image analysis failed:", err)
    setImageDescStatus("error")
    setRetryableError(err instanceof Error ? err.message : "Image analysis failed")
  } finally {
    imageParsingRef.current = false
    setImageDescLoading(false)
  }
}, [slides, presentationId, externalImageDescriptions, onImageDescriptionsChange, onRequestPersist])
```

- [ ] **Step 4: Add the auto-parse effect**

Place it after the auto-narration effect block (near line 556):

```ts
// Auto-parse image descriptions on fresh uploads (Q8: restored decks parse on Images-tab open instead).
useEffect(() => {
  if (!file) return
  if (imageDescStatus !== "idle") return
  if (imageParsingRef.current) return
  const needsParse = slides.some(
    (s) => s.images.length > 0 && !isSlideParsingComplete(s.images, externalImageDescriptions?.[s.number]),
  )
  if (!needsParse) return
  runImageParsing()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [slides, file, imageDescStatus, externalImageDescriptions])
```

- [ ] **Step 5: In `processFile`, reset parsing state for fresh uploads**

In the fresh-upload branch (`else if (file)` block, after `setSlides(parsedSlides)` at line 333):

```ts
setSlides(parsedSlides)

            // Reset parsing state for a new deck so the auto-parse effect fires.
            setImageDescStatus("idle")
            setBlockedSlides([])
            setRetryableError(null)
            // Clear stale descriptions from a previous deck (new upload = fresh state).
            onResetImageDescriptions?.()
```

- [ ] **Step 6: Delete BatchImageFetcher usage + component**

1. Remove the render block at lines 2057-2065:
```tsx
      {/* Batch-fetch image descriptions for ALL slides — fires immediately when slides with images load */}
      {!externalImageDescriptions && !imageDescLoading && slides.length > 0 && slides.some((s) => s.images.length > 0) && (
        <BatchImageFetcher
          slides={slides}
          presentationId={presentationId}
          onResult={handleBatchResult}
          onLoading={setImageDescLoading}
        />
      )}
```
2. Remove the entire `BatchImageFetcher` component (lines ~2152-2200).

- [ ] **Step 7: Type-check**

Run from `frontend/`: `npm run type-check`
Expected: no errors. (If `handleBatchResult` is referenced elsewhere, remove those references.)

- [ ] **Step 8: Commit**

```bash
git add frontend/components/dashboard/SlideEditor.tsx
git commit -m "feat: auto-parse slide images on upload with failed-only retry"
```

---

### Task 3: Reliable persistence (await R2 save + flush save + restore images from keys)

**Files:**
- Modify: `frontend/components/dashboard/SlideEditor.tsx`
- Modify: `frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx`

- [ ] **Step 1: page.tsx — extract PATCH body into `persistState`, add flush**

In `page.tsx`, replace the `saveState` useCallback (lines 272-305) with:

```ts
  const persistState = useCallback(() => {
    const state: EditorState = {
      selectedVoiceId,
      controlInstructions,
      ultimateMode,
      narrations,
      audioGenerated,
      audioStoragePath: audioStoragePath ?? undefined,
      storagePath,
      currentSlide,
      // Always include every field — never drop empty values to undefined.
      // The PATCH endpoint replaces the entire JSONB column, so dropping a
      // field permanently deletes it from the database.
      slideData,
      changedSlides,
      slideCount: slideData.length,
      imageDescriptions,
      parsedImageKeys,
    }
    return fetch(`/api/presentations/${params.presentationId}/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    })
      .then((res) => {
        if (res.ok) { setSaveStatus("saved"); setDirty(false); toastSuccess("Changes saved", { id: "editor-save" }) }
        else { setSaveStatus("error"); toastError("Failed to save changes", { id: "editor-save" }) }
      })
      .catch(() => { setSaveStatus("error"); toastError("Failed to save changes", { id: "editor-save" }) })
  }, [selectedVoiceId, controlInstructions, ultimateMode, narrations, audioGenerated, audioStoragePath, storagePath, currentSlide, slideData, changedSlides, imageDescriptions, parsedImageKeys, params.presentationId])

  // Debounced save (2s) for normal edits.
  const saveState = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus("saving")
    saveTimer.current = setTimeout(() => persistState(), 2000)
  }, [persistState])

  // Immediate save — used when parsed image keys/descriptions land so refresh never loses them.
  const handleRequestPersist = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    persistState()
  }, [persistState])
```

- [ ] **Step 2: page.tsx — pass `onRequestPersist` to SlideEditor**

Add a `handleResetImageDescriptions` handler after `handleImageDescriptionsChange` (line ~176):

```ts
  const handleResetImageDescriptions = useCallback(() => {
    setImageDescriptions({})
  }, [])
```

Add to the `<SlideEditor ...>` JSX (after `onImageDescriptionsChange={handleImageDescriptionsChange}`):

```tsx
              onRequestPersist={handleRequestPersist}
              onResetImageDescriptions={handleResetImageDescriptions}
```

- [ ] **Step 3: SlideEditor — accept the new prop**

Add to the destructured props + type:

```ts
  onRequestPersist,
}: {
  ...
  onRequestPersist?: () => void
})
```

- [ ] **Step 4: SlideEditor — await R2 save in processFile**

Replace the fire-and-forget call at line 339:

```ts
            // Save parsed images to R2 for cross-session persistence (await so keys persist reliably).
            const savedKeys = await saveParsedImagesToR2(presentationId, parsedSlides)
            if (!cancelled && savedKeys && Object.keys(savedKeys).length > 0) {
              onParsedImageKeysChange?.(savedKeys)
              onRequestPersist?.()
            }
```

- [ ] **Step 5: SlideEditor — make `saveParsedImagesToR2` return keys and surface failure**

Replace the existing function (lines 449-477) with:

```ts
  /** Save parsed slide images to R2 for cross-session persistence. Returns the R2 key map, or null on failure. */
  async function saveParsedImagesToR2(
    presId: string,
    slides: ParsedSlide[],
  ): Promise<Record<string, string> | null> {
    try {
      const payload = {
        slides: slides.map((s) => ({
          number: s.number,
          images: s.images.map((img) => ({
            index: img.index,
            mimeType: img.mimeType,
            data: img.dataUrl.replace(/^data:image\/\w+;base64,/, ""),
          })),
        })),
      }
      const res = await fetch(`/api/presentations/${presId}/parsed-images/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`)
      if (json.data?.keys) return json.data.keys as Record<string, string>
      return null
    } catch (err) {
      console.warn("[parsed-images] Save failed:", err)
      toastError("Failed to persist slide images — they may be lost after refresh.")
      return null
    }
  }
```

- [ ] **Step 6: SlideEditor — fix `loadImagesFromParsedKeys` to reconstruct images from R2 keys**

Replace the existing function (lines 480-515) with:

```ts
  /** Load parsed images from R2 using saved keys, reconstructing slide images from the key map. */
  async function loadImagesFromParsedKeys(
    presId: string,
    keys: Record<string, string>,
    currentSlides: ParsedSlide[],
  ): Promise<ParsedSlide[]> {
    try {
      const r2Keys = Object.values(keys)
      if (r2Keys.length === 0) return currentSlides

      const res = await fetch(`/api/presentations/${presId}/parsed-images/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: r2Keys }),
      })
      const json = await res.json()
      const imageUrls = json.data?.images as Record<string, string | null> | undefined
      if (!imageUrls) return currentSlides

      const extToMime = (key: string): string => {
        if (key.endsWith(".png")) return "image/png"
        if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg"
        if (key.endsWith(".webp")) return "image/webp"
        return "application/octet-stream"
      }

      return currentSlides.map((slide) => {
        // Reconstruct images for this slide from the persisted key map
        // (slideData strips images, so slide.images is empty on restore).
        const reconstructed: SlideImage[] = []
        for (const [composite, r2Key] of Object.entries(keys)) {
          const [slideNum, imgIndex] = composite.split("-").map(Number)
          if (slideNum !== slide.number) continue
          const signedUrl = imageUrls[r2Key]
          if (signedUrl) {
            reconstructed.push({ index: imgIndex, mimeType: extToMime(r2Key), dataUrl: signedUrl, r2Key })
          }
        }
        // Merge any images already present (fresh-parse path carries base64 data URIs).
        for (const img of slide.images) {
          if (!reconstructed.some((r) => r.index === img.index)) reconstructed.push(img)
        }
        reconstructed.sort((a, b) => a.index - b.index)
        return { ...slide, images: reconstructed }
      })
    } catch (err) {
      console.warn("[parsed-images] Load failed (non-critical):", err)
      return currentSlides
    }
  }
```

- [ ] **Step 7: Type-check + build**

Run from `frontend/`: `npm run type-check` then `npm run build`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/components/dashboard/SlideEditor.tsx "frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx"
git commit -m "feat: persist parsed images reliably and restore images from R2 keys"
```

---

### Task 4: Narration gate + retry UI

**Files:**
- Modify: `frontend/components/dashboard/SlideEditor.tsx`

- [ ] **Step 1: Gate `generateNarrations`**

In `generateNarrations` (line 614), after the `if (targetSlides.length === 0) return null` line, insert:

```ts
    // Gate: a slide with images must have every image parsed before narration (Q1).
    // Slides with no images are always ready. "No significant visual content." is a valid description.
    const blocked = targetSlides.filter((s) => {
      if (s.images.length === 0) return false
      return !isSlideParsingComplete(s.images, externalImageDescriptions?.[s.number])
    })
    if (blocked.length > 0) {
      setBlockedSlides(blocked.map((s) => s.number))
      setGenerationFailed(true)
      setRetryableError(
        `Image analysis incomplete for slide${blocked.length > 1 ? "s" : ""} ${blocked.map((s) => s.number).join(", ")}. Retry image analysis to continue.`,
      )
      return null
    }
```

- [ ] **Step 2: Gate the auto-narration effect**

Replace the auto-narration effect (lines 518-532) with:

```ts
  // Auto-generate narration when slides are first parsed. Wait for image parsing
  // to settle when the deck has images so narration includes visual context.
  useEffect(() => {
    if (slides.length === 0) return
    if (Object.keys(narrations).length > 0) return
    if (generatingNarrations) return
    if (!file) return // Only auto-generate for freshly uploaded files, not restored state
    const hasImages = slides.some((s) => s.images.length > 0)
    if (hasImages && (imageDescStatus === "loading" || imageDescStatus === "idle")) return
    // Reset the previous result before starting a new asynchronous generation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGenerationFailed(false)
    generateNarrations(slides, false).then((result) => {
      if (!result) setGenerationFailed(true)
    })
  // The guards above intentionally prevent duplicate generation while the async
  // request is in flight or narration data has already been restored.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides, file, imageDescStatus])
```

- [ ] **Step 3: Update BOTH narration failure overlays (desktop ~1723-1745, mobile ~1938-1960)**

Replace each overlay's inner content with the blocked-aware version:

```tsx
            {/* Narration failure overlay — centered inside blurred textarea */}
            {generationFailed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg">
                <RefreshCw className="h-5 w-5 text-red-400" />
                <p className="text-xs font-medium text-red-500">
                  {blockedSlides.length > 0 ? "Image analysis incomplete" : "Generation failed"}
                </p>
                {blockedSlides.length > 0 && (
                  <p className="max-w-[90%] text-center text-[10px] leading-relaxed text-zinc-500">
                    Slide{blockedSlides.length > 1 ? "s" : ""} {blockedSlides.join(", ")} need image analysis before narration. Retry to analyze and continue.
                  </p>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    setGenerationFailed(false)
                    if (blockedSlides.length > 0) {
                      await retryFailedImages()
                      return
                    }
                    const ok = await generateNarrations(slides, true)
                    if (!ok) setGenerationFailed(true)
                  }}
                  disabled={generating || generatingNarrations || imageDescLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  {generating || generatingNarrations || imageDescLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {generating || generatingNarrations || imageDescLoading
                    ? "Working…"
                    : blockedSlides.length > 0
                      ? "Retry Image Analysis"
                      : "Try Again"}
                </button>
              </div>
            )}
```

- [ ] **Step 4: Type-check**

Run from `frontend/`: `npm run type-check`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/dashboard/SlideEditor.tsx
git commit -m "feat: block narration until slide images are fully parsed"
```

---

### Task 5: SlideParsedData — recovery parse, failed-only retry, dead-state fix

**Files:**
- Modify: `frontend/components/dashboard/SlideParsedData.tsx`

- [ ] **Step 1: Import helpers**

Add to the `@/lib/image-analysis` import:

```ts
import { describeSlideImages, imagesNeedingAnalysis, isSlideParsingComplete } from "@/lib/image-analysis"
```

- [ ] **Step 2: Add a fetched-guard ref + recovery effect**

After `const [imageError, setImageError] = useState<string | null>(null)` (line 89), add:

```ts
  // Guards the recovery parse so it fires at most once per slide.
  const fetchedForSlideRef = useRef<number | null>(null)
```

Add `useRef` to the react import at the top (line 3):

```ts
import { useState, useEffect, useCallback, useRef } from "react"
```

Add the recovery effect after the existing sync effect (after line 156):

```ts
  // Q8 recovery: when the Images tab opens for a slide with images and no cached
  // descriptions (e.g. legacy decks), trigger a one-time parse for that slide.
  useEffect(() => {
    if (activeTab !== "images") return
    if (slide.images.length === 0) return
    if (imageDescLoading) return
    if (fetchedForSlideRef.current === slide.number) return
    const complete = isSlideParsingComplete(slide.images, cachedImageDescriptions)
    if (complete) {
      fetchedForSlideRef.current = slide.number
      return
    }
    fetchedForSlideRef.current = slide.number
    loadImageDescriptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, slide.number, imageDescLoading, cachedImageDescriptions])
```

- [ ] **Step 3: `loadImageDescriptions` — failed-only retry (Q3) + merge with cache**

Replace `loadImageDescriptions` (lines 103-140) with:

```ts
  const loadImageDescriptions = useCallback(async () => {
    if (slide.images.length === 0) {
      setImageStatus("empty")
      return
    }

    // Q3: on retry, send ONLY the images that still need analysis.
    const toSend =
      cachedImageDescriptions && cachedImageDescriptions.length > 0
        ? imagesNeedingAnalysis(slide.images, cachedImageDescriptions)
        : slide.images

    if (toSend.length === 0) {
      setImageStatus("loaded")
      return
    }

    setImageStatus("loading")
    setImageError(null)

    try {
      const result = await describeSlideImages(presentationId, [
        { number: slide.number, images: toSend },
      ])

      // Merge new results over any cached descriptions.
      const descMap = new Map<number, ImageDescription>()
      if (cachedImageDescriptions) {
        for (const d of cachedImageDescriptions) descMap.set(d.index, d)
      }
      const slideResult = result.slides[0]
      if (slideResult) {
        for (const img of slideResult.images) {
          descMap.set(img.index, img)
        }
      }

      setImageDescriptions(descMap)

      // Propagate to parent for caching in editor_state
      if (onImageDescriptionsUpdate && slideResult?.images) {
        onImageDescriptionsUpdate(Array.from(descMap.values()))
      }

      const allFailed = descMap.size > 0 && Array.from(descMap.values()).every((img) => img.error)
      const someFailed = Array.from(descMap.values()).some((img) => img.error)
      setImageStatus(allFailed ? "error" : someFailed ? "loaded" : "loaded")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setImageError(msg)
      setImageStatus("error")
    }
  }, [slide, presentationId, cachedImageDescriptions, onImageDescriptionsUpdate])
```

- [ ] **Step 4: Fix the dead "Analyzing..." state in ImagesTab**

In `ImagesTab`, replace the "else" branch of the description rendering (lines 450-457) with a recoverable state:

```tsx
              ) : desc?.description ? (
                <p className="text-xs leading-relaxed text-zinc-600">{desc.description}</p>
              ) : imageStatus === "loading" ? (
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs text-zinc-400">Analyzing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-xs text-zinc-400">Not analyzed</span>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-700"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Retry
                  </button>
                </div>
              )}
```

- [ ] **Step 5: Type-check**

Run from `frontend/`: `npm run type-check`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/dashboard/SlideParsedData.tsx
git commit -m "feat: recovery image parse on images tab with failed-only retry"
```

---

### Task 6: Final verification + final code review

**Files:** none (verification only)

- [ ] **Step 1: Run all unit tests**

From `frontend/`: `npx tsx --test lib/__tests__/image-analysis.test.ts` and `npx tsx --test lib/__tests__/voice-description.test.ts`
Expected: PASS.

- [ ] **Step 2: Type-check + build**

From `frontend/`: `npm run type-check` and `npm run build`
Expected: clean.

- [ ] **Step 3: Verify commit hygiene**

- `git log --oneline -8` — feature commits present.
- `git status --short` — only `frontend/components/dashboard/SlideEditor.tsx` uncommitted (after controller pops the stash in Task 0). Confirm its diff is ONLY the audio-player refactor (~11 insertions / ~19 deletions).
- `git diff 6c9f598..HEAD --stat` — verify no unrelated files changed.

- [ ] **Step 4: Final code review (controller dispatches reviewer subagent)**

Review the full feature range with the reviewer agent:
- BASE: the commit before Task 1 (`6176d19` for the spec, or the parent of the Task 1 commit), HEAD: latest feature commit.
- Verify: end-to-end coherence (upload → parse → persist → gate → retry → auto-narrate), spec coverage, no `any`, type-check clean, working-tree hygiene.

- [ ] **Step 5: Pop the stash (controller)**

```bash
git stash pop
git status --short   # SlideEditor.tsx uncommitted audio-player refactor restored
```
Resolve any conflict manually (it should apply cleanly since hunks are disjoint).

- [ ] **Step 6: Manual smoke checklist (needs dev server + env; report if not runnable)**

1. Upload a PPTX with multiple images on multiple slides → all images get descriptions automatically (observe Images tab in Slide-info modal).
2. Kill network mid-parse or use a deck >20 images → verify chunking, blocked-slides message, "Retry Image Analysis" button.
3. After descriptions appear, refresh the page → images and descriptions restored from R2 + editor_state.
4. Edit narration → "Generate Audio" still works.
5. Slide with an image that fails parsing → narration for it is blocked with the retry UI; clicking retry re-parses only failed images and auto-generates narration.
