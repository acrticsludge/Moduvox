# Parsed Image Reliability & Narration Gate — Design Spec

**Date:** 2026-08-01
**Status:** Approved via user-mimic Q&A (no further user verification per instruction)
**Author:** Build agent + user-mimic subagent

---

## 1. Problem Statement

Three interrelated bugs in the slide-parsing → narration pipeline:

1. **Auto image parsing never fires.** `SlideEditor.tsx:2058` renders `BatchImageFetcher` only when `!externalImageDescriptions` — but the parent initializes `imageDescriptions` to `{}` (truthy), so the predicate is always `false`. Introduced by commit `f7a7fbe` (previously `6d5cdd0` keyed per-slide). Result: on a fresh upload, **no image is ever described automatically**; the only working path is the per-slide manual retry in the Slide-info modal. This directly explains "only the first image is parsed, the rest fail until I click retry."

2. **Parsed image data is not persistent across refresh.** Two failure modes:
   - Image binaries are saved to R2 via `saveParsedImagesToR2` **fire-and-forget** (`SlideEditor.tsx:339, 449-477`). If the R2 save fails or the tab closes before the 2s-debounced `editor_state` PATCH captures the returned keys, `parsedImageKeys` is never persisted → restore path (`page.tsx:261`) is skipped → images gone.
   - Descriptions (`imageDescriptions`) only exist if parsing ran (it doesn't) and are only persisted via the 2s debounced `saveState`. Additionally, `loadImagesFromParsedKeys` (`SlideEditor.tsx:480-515`) iterates `slide.images` which is **empty on restore** (slideData strips images; `page.tsx:258` restores it without images), so even when keys exist, images are never rehydrated.
   - The `editor_state` JSONB PATCH replaces the whole column; a stale save can permanently wipe newer fields (comment at `page.tsx:285-287`).

3. **No narration gate.** `/api/generate/narration` accepts optional `imageDescriptions`; slides without them are narrated from text only, silently. The user wants: **if image parsing fails (or any parsing fails), narration must fail with retry buttons.**

---

## 2. Design Decisions (from user-mimic Q&A)

| # | Question | Decision |
|---|----------|----------|
| Q1 | Gate strictness | **Hard per-slide gate.** A slide WITH images requires every image to have a successful description before its narration is allowed. Slides with zero images proceed from text only. |
| Q2 | "No significant visual content." | **SUCCESS.** It's a valid description — narration proceeds. |
| Q3 | Retry granularity | **Failed-only.** Retry re-runs ONLY images with `error` (or missing descriptions), never whole slides. |
| Q4 | Auto-retry | **One auto-retry with short backoff**, then surface a manual retry button. |
| Q5 | Persistence mechanism | **Keep R2 + `editor_state` JSONB** (Option A). Fix the save reliability: await the R2 write, persist keys+descriptions immediately (flush), kill the fire-and-forget race. No new table, no meta.json. |
| Q6 | Batch strategy | **One request per chunk, chunked ≤20 images**, spaced to respect the 10 req/min/user rate limit. |
| Q7 | Narration retry UX | Show **exactly which slides are blocked**, retry failed images, then **auto-fire narration** once parsing succeeds. |
| Q8 | Legacy decks | **Don't auto-parse on load.** Trigger a recovery parse once, explicitly, when the user opens the Images tab. |

---

## 3. Architecture / Data Flow

### 3.1 Fresh upload flow (file truthy)

```
processFile() → parsePptxText → slides
  ├─ onSlideDataChange(slideData without images)        [existing]
  ├─ saveParsedImagesToR2 (AWAITED, not fire-and-forget) → keys → setParsedImageKeys + flush save
  └─ setSlides(parsedSlides with images)

[Effect] slides have images + file truthy + parsing not already done
  → runImageParsing(): describe ALL image-bearing slides
      ├─ chunk images ≤20 per request, space ≥6s between chunks (10/min limit)
      ├─ per chunk: describeSlideImages → merge per-slide results into imageDescriptions
      ├─ ONE auto-retry (3s backoff) for failed images only
      └─ if still failing → set blockedSlides + show retry button
      └─ always: flush save after merge (descriptions persisted immediately)

[Auto-narration effect] gated: wait until image parsing settles for slides with images
  → generateNarrations(slides)
      ├─ compute blockedSlides (image slides without complete descriptions)
      ├─ if any blocked → return { blockedSlides }, set state, DO NOT call API
      └─ else → POST /api/generate/narration with imageDescriptions
```

### 3.2 Restore flow (file null, storagePath exists)

```
page.tsx loads editor_state → setSlideData, setImageDescriptions, setParsedImageKeys
SlideEditor.processFile → restore slides from slideData (images empty)
  → loadImagesFromParsedKeys (FIXED: reconstruct images from parsedImageKeys R2 keys,
     not from empty slide.images)
Legacy decks: NO auto-parse (Q8). Images tab open → SlideParsedData triggers
  recovery parse once for that slide.
```

### 3.3 Narration gate (both flows)

`generateNarrations` computes per-slide readiness:
- Slide has zero images → READY
- Slide has images and every image has `description` (successful, no error) → READY
- Otherwise → BLOCKED

If any target slide is BLOCKED → return blocked list, surface UI: "Image analysis incomplete for slides X, Y — retry to continue." A "Retry" button re-runs `runImageParsing()` on failed images only, then auto-calls `generateNarrations` again.

---

## 4. Detailed Changes

### 4.1 `frontend/lib/image-analysis.ts`

**Add pure helpers (unit-testable):**

```ts
export type ImageDesc = { index: number; description: string; error?: string }

/** True when the slide has no images, or every image has a non-error description. */
export function isSlideParsingComplete(
  slideImages: { index: number }[],
  descriptions?: ImageDesc[] | null,
): boolean
// - slideImages empty → true
// - descriptions missing → false
// - every image index has a desc with description (non-empty) and no error → true
// - "No significant visual content." counts as a valid description

/** Images that still need parsing: missing desc, empty description, or error. */
export function imagesNeedingAnalysis(
  slideImages: { index: number; mimeType: string; dataUrl: string }[],
  descriptions?: ImageDesc[] | null,
): { index: number; mimeType: string; dataUrl: string }[]

/** Chunk (slideNumber, image) pairs so each chunk has ≤ maxImagesPerRequest images. */
export function chunkImageRequests(
  slidesWithImages: { number: number; images: { index: number; mimeType: string; dataUrl: string }[] }[],
  maxImagesPerRequest = 20,
): { number: number; images: { index: number; mimeType: string; dataUrl: string }[] }[][]
```

**Add `describeSlideImagesChunked`:**

```ts
export async function describeSlideImagesChunked(
  presentationId: string,
  slidesWithImages: { number: number; images: { index: number; mimeType: string; dataUrl: string }[] }[],
  opts?: { maxImagesPerRequest?: number; chunkDelayMs?: number; onProgress?: (done: number, total: number) => void },
): Promise<{ slides: { number: number; images: ImageResult[] }[] }>
// 1. chunkImageRequests
// 2. for each chunk (sequential): describeSlideImages(chunk); merge results keyed by slide.number
// 3. delay chunkDelayMs (default 6000) between chunks when >1 chunk (10/min limit)
// 4. images never returned (e.g. request threw) are marked { index, description: "", error: "Analysis failed" }
```

### 4.2 `frontend/components/dashboard/SlideEditor.tsx`

1. **Fix auto-parse trigger** (replace `BatchImageFetcher` render predicate, lines 2057-2065, and component 2156-2200):
   - Remove `BatchImageFetcher` component.
   - Add state: `imageDescLoading` (exists), `imageDescStatus: "idle" | "loading" | "complete" | "error"`, `blockedSlides: number[]`, `retryableError: string | null`.
   - Add effect (deps `[slides, file, externalImageDescriptions, imageDescStatus]`):
     ```
     if (!file) return                                  // fresh uploads only (Q8)
     if (imageDescStatus === "loading") return
     if (slides.every(s => isSlideParsingComplete(s.images, externalImageDescriptions?.[s.number]))) return
     runImageParsing()
     ```
     Guard with a ref so it doesn't loop: after runImageParsing completes, status becomes "complete"/"error".
   - `runImageParsing()`: calls `describeSlideImagesChunked` with all image-bearing slides; merges into `imageDescriptions` via `onImageDescriptionsChange`; one auto-retry of failed images (Q4) with 3s backoff; sets status; persists immediately (flush save).

2. **Await the R2 image save** (`saveParsedImagesToR2`, lines 449-477): make it return the keys and have `processFile` await it (line 339) before proceeding. On failure, log + continue (images still usable in-session) but do NOT silently swallow — surface a non-blocking toast. After keys are set, trigger flush save.

3. **Fix `loadImagesFromParsedKeys`** (lines 480-515) to reconstruct images from `parsedImageKeys`:
   - Build the R2 keys list (all values), POST to `/parsed-images/load`, get signed URLs.
   - For each slide, rebuild `images` from the parsedImageKeys composite keys `${slideNum}-${imgIndex}` (extract mimeType from extension png/jpg/webp/bin).
   - Do NOT iterate `slide.images` (empty on restore) — derive from keys.

4. **Narration gate** (`generateNarrations`, lines 614-700):
   - Before the fetch, compute `blockedSlides` = target slides where `!isSlideParsingComplete(...)`.
   - If `blockedSlides.length > 0`: set state, `setGenerationFailed(true)`, `setGeneratingNarrations(false)`, return `null`. Do not call the API (Q1/Q7).
   - Keep existing quota/rate-limit handling otherwise.

5. **Auto-narration effect** (lines 518-532): add gate — if any slide has images and `imageDescStatus` is `"loading"`, skip (wait for parsing). When parsing settles, if blocked, set generationFailed with the blocked message.

6. **Retry UI** in the narration failure overlay (both desktop + mobile copies, lines 1723-1745 / 1938-1960):
   - When `blockedSlides.length > 0`: message "Image analysis incomplete for slide(s) N, M. Retry to analyze and continue." + button "Retry Image Analysis" → `retryFailedImages()` → then auto-call `generateNarrations`.
   - When `blockedSlides.length === 0` (generic failure): existing "Try Again".

7. **`retryFailedImages()`**: collects failed/missing images across all slides, calls `describeSlideImagesChunked` (failed-only), merges, auto-regen narration if complete (Q7).

### 4.3 `frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx`

1. **Reliable persistence flush.** Add a `flushSave` that clears the debounce timer and PATCHes immediately, exposed to SlideEditor via a new optional prop `onRequestPersist` (or reuse pattern). Call it right after `parsedImageKeys`/`imageDescriptions` land from parsing so refresh never loses them (Q5). Implementation: extract the PATCH body from `saveState` into `persistState()`, call `persistState()` immediately for flush.

2. Pass `onRequestPersist` down to `SlideEditor`.

### 4.4 `frontend/components/dashboard/SlideParsedData.tsx`

1. **Recovery parse on Images tab open (Q8, fixes dead "Analyzing..." L5):** the effect at lines 159-163 only fires when `imageStatus === "loading"`. Change to also fire when the Images tab opens with no cached descriptions and not loading:
   ```
   if (activeTab === "images" && slide.images.length > 0
       && !imageDescLoading && !hasCached) loadImageDescriptions()
   ```
   Guard against loops with a `fetchedRef` per slide number.

2. **Failed-only retry (Q3):** `loadImageDescriptions` should send only `imagesNeedingAnalysis(slide.images, cached)` instead of all images when a cached partial result exists. First parse (no cache) still sends all.

3. **"Analyzing..." dead state fix:** when `imageStatus === "loaded"` but some images lack both description and error, show "Retry failed" affordance (L5). Ensure `imageStatus` reflects partial failure (some error) not just all-failed.

### 4.5 API route (`image-descriptions/route.ts`)

- **No functional change required** — it already returns per-image `{ index, description, error? }` and handles concurrency (3) + retries. The chunking/rate-limit/spacing is handled client-side (Q6).

---

## 5. Error Handling

- **Per-image isolation** (existing): one image failure doesn't cascade.
- **Batch-level failure**: chunk throws → remaining images in chunk marked `error: "Analysis failed"` → user gets retry button.
- **Narration gate**: blocked slides never hit the AI API — no wasted spend, clear user message.
- **Persistence**: await R2 save + immediate flush reduces data-loss window to near zero; failures logged + non-blocking toast.
- **RLS/ownership**: all existing auth + ownership checks retained (routes untouched).

---

## 6. Testing

- Unit tests (node:test + tsx, matching `voice-description.test.ts` pattern):
  - `isSlideParsingComplete`: empty slides / missing descs / all described / "No significant visual content." / partial error
  - `imagesNeedingAnalysis`: returns failed + missing only
  - `chunkImageRequests`: ≤20 per chunk, preserves slide numbering, edge of exactly 20 / 21 / 40 / 0
  - `describeSlideImagesChunked`: mocked fetch — merges, marks missing as error, applies delay between chunks (inject delay via opts for speed)
- Manual verification checklist (in plan Task 8).

---

## 7. Out of Scope

- No new DB table, no meta.json.
- No changes to `/api/generate/narration` route semantics (client-side gate only).
- No changes to `/api/generate/image-descriptions` route (client-side chunking only).
- Comments XML parsing fix (C1 from audit) — unrelated to this task.
