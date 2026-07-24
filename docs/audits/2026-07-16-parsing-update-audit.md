# Parsing Update — Audit & Status

> **Branch:** `update/parsing-update`
> **Date:** 2026-07-16
> **Scope:** Full parsing pipeline overhaul (parser, image analysis, UI, integration)
> **Method:** 4 parallel agents + super agent compilation

---

## 1. What Was Built

### Phase 1 — Parser (`lib/pptx-renderer.ts`)
| Feature | Status |
|---------|--------|
| DOMParser replaces regex XML parsing | ✅ Done |
| `ParsedSlide` type extended with notes, comments, images, rawText | ✅ Done |
| Slide notes extraction from `notesSlideN.xml` | ✅ Done |
| Comments extraction from `commentN.xml` | ❌ **Broken** — wrong XML element names |
| Image extraction from `rels` + `media/`, resize via canvas | ✅ Done |
| All edge cases handled (corrupt XML, missing files, >30 slides) | ✅ Done |
| `compareSlides` / `slideHash` unchanged and compatible | ✅ Done |

### Phase 2 — Image Analysis (new files)
| Feature | Status |
|---------|--------|
| `lib/image-analysis.ts` client helper | ✅ Done |
| `POST /api/generate/image-descriptions` | ✅ Done |
| Gemini 2.5 Flash Vision integration | ✅ Done |
| Per-image error isolation | ✅ Done |
| Auth + ownership verification | ✅ Done |
| Rate limiting (10 req/min/user) | ✅ Done |
| 20-image cap per request | ✅ Done |
| **Input validation (Zod)** | ❌ **Missing** |
| **Timeout handling for long batches** | ❌ **Missing** — sequential calls risk Vercel timeout |
| **Batched Gemini calls (multiple images per call)** | ❌ **Missing** — one API call per image |

### Phase 3 — Pill-Tab UI (`SlideParsedData.tsx`)
| Feature | Status |
|---------|--------|
| Three pill tabs: Text, Notes, Images | ✅ Done |
| Status dots (green/red/gray) per tab | ✅ Done |
| Text tab: title + bullets + empty state | ✅ Done |
| Notes tab: notes + comments + author/timestamps + empty state | ✅ Done |
| Images tab: thumbnails + descriptions + loading skeleton | ✅ Done |
| Per-image error + retry | ✅ Done |
| Global retry for partial failures | ✅ Done |
| **Cache consumption from parent batch** | ❌ **Broken** — ignores async cache updates |
| **Mobile touch targets (48px)** | ❌ **Missing** — close button 36px, tabs 24px |

### Phase 4 — Integration
| Feature | Status |
|---------|--------|
| Inline SlideInfo modal replaced with `SlideParsedData` | ✅ Done |
| BatchImageFetcher (all slides in 1 API call) | ✅ Done |
| `imageDescriptions` in `editor_state` | ✅ Done |
| Persistence across page reloads | ✅ Done |
| Auto-save on description fetch | ✅ Done |
| **BatchImageFetcher unstable `onResult` callback** | ❌ **Rerenders on every parent render** |
| **BatchImageFetcher infinite retry loop on API failure** | ❌ **Mount/unmount cycle** |
| **BatchImageFetcher silent error swallowing** | ❌ **No user feedback on failure** |

---

## 2. Critical Issues

### C1. Comments Extraction Broken (`pptx-renderer.ts`)

**What:** `parseCommentsXml` looks for `<mc:Comment>`, `<mc:author>`, `<mc:commentText>`, `<mc:dt>` — none of which exist in standard PPTX comment files.

**Actual PPTX structure:**
```xml
<p:cmLst>
  <p:cm authorId="0" dt="2024-01-15T10:30:00Z" idx="1">
    <p:text>This is a comment</p:text>
  </p:cm>
</p:cmLst>
```

**Impact:** Comments are silently never extracted. The Notes tab always shows empty comments regardless of what's in the PPTX. Users see nothing.

**Fix:** Rewrite `parseCommentsXml` to look for `<p:cm>` elements, read `authorId`/`dt` as attributes, read `<p:text>` for content. Also load `ppt/commentAuthors.xml` for author name resolution.

---

## 3. High-Priority Issues

### H1. SlideParsedData Caching Broken

**What:** The `useState` initializer for `imageDescriptions` and `imageStatus` only runs on first mount. When `cachedImageDescriptions` arrives from the `BatchImageFetcher` after mount (the common async case), the component ignores it and makes a redundant per-slide API call.

**Impact:** Every time the user opens the Images tab while the modal is already showing, an unnecessary API call is made. The batch cache is wasted.

**Fix:** Add a `useEffect` that watches `cachedImageDescriptions` and `imageDescLoading` and syncs them into local state.

### H2. API Route — Sequential Calls Risk Timeout

**What:** Images are processed sequentially in nested loops. 20 images × 1-3s each = 20-60s total. Vercel Hobby plan timeout is 10s, Pro is 60s/300s.

**Impact:** On Hobby plan, even 5 images will likely time out. On Pro, 20 slow images may time out. No partial results are saved on timeout (whole request dies).

**Fix:** Batch multiple images into a single Gemini call (supports multiple `inlineData` parts). Or use `Promise.allSettled` with concurrency limiting.

### H3. API Route — Missing Input Validation

**What:** No Zod schema. Request body fields (`presentationId`, `mimeType`, `data`) are not validated. Malformed input passes through to Gemini and causes confusing errors.

**Fix:** Add Zod schema matching the existing codebase pattern.

### H4. BatchImageFetcher Unstable Callback

**What:** `onResult` is an inline arrow function at `SlideEditor.tsx:1531` — creates a new reference on every render. This causes `BatchImageFetcher`'s `useEffect` to fire on every `SlideEditor` re-render, re-fetching descriptions.

**Impact:** Unnecessary API calls on every keystroke or state change. No abort controller means stale responses race with new ones.

**Fix:** Wrap `onResult` in `useCallback` or `useRef`.

### H5. BatchImageFetcher Infinite Retry on API Failure

**What:** The render predicate includes `!imageDescLoading`. On failure, `.finally()` sets `imageDescLoading = false`, which causes `BatchImageFetcher` to unmount → on next render the predicate is true → it remounts → re-fetches → loops forever.

**Impact:** On network error, infinite API retry loop with no user feedback.

**Fix:** Remove `!imageDescLoading` from the render predicate. Let `BatchImageFetcher` stay mounted as long as `showSlideInfo` is true.

### H6. BatchImageFetcher Silent Error Swallowing

**What:** `.catch(() => {})` with no user feedback. When the batch fails, the `SlideParsedData` shows an "Analyzing..." spinner forever.

**Impact:** Users see a permanent loading state with no way to recover.

**Fix:** Surface error state so `SlideParsedData` can show failure UI + retry.

---

## 4. Medium-Priority Issues

### M1. Mobile Touch Targets Below 48px

| Element | Current | Required |
|---------|---------|----------|
| Close button | `min-h-[36px]` | 48px |
| Tab pills | ~24px | 48px |
| Footer close button | ~24px | 48px |
| Retry button | ~24px | 48px |

### M2. SVG Images Silently Dropped

SVG images throw on canvas rendering and are silently skipped by the catch block. No log, no fallback, no user feedback.

### M3. Unused Imports

- `X` from `lucide-react` in `SlideEditor.tsx` (leftover from old modal removal)
- `MoreHorizontal` from `lucide-react` in `page.tsx` (pre-existing)

### M4. `audioStoragePath` Missing from `saveState` Deps

Pre-existing bug in `page.tsx`. The `saveState` `useCallback` captures `audioStoragePath` but doesn't list it in dependencies.

### M5. No `setDirty(true)` on `imageDescriptions` Change

If only image descriptions change, the beforeunload warning won't fire. Auto-save still works (2s debounce).

### M6. SSR Guard on `resizeImage`

Uses browser-only APIs (`new Image()`, canvas). Currently only called client-side, but no runtime guard if ever used in SSR context.

---

## 5. Low-Priority Issues

### L1. `cachedImageDescriptions!` Non-Null Assertion
Line 33: `cachedImageDescriptions!` — should use a proper guard instead.

### L2. Misleading Comment
Line 46: says "empty-styled if no cache" but actually shows per-image "Analyzing..." animations.

### L3. `TabPill` Defined Inside Component
Recreated on every render. Should be hoisted.

### L4. `slide.title.trim()` Could Crash on Corrupted Data
No optional chaining. `title` is typed as `string` (non-nullable) but restored data could be `null`.

### L5. Persistent "Analyzing..." Dead State
If `ImageDescription` has neither `description` nor `error`, user sees an infinite amber pulse dot with no recovery.

### L6. `slideHash` Delimiter Collision
Uses `|` as delimiter. A title containing `|` can collide with a different slide where `|` forms from the join.

---

## 6. What's Clean & Working

| Component | Verdict |
|-----------|---------|
| `extractParagraphsFromXml` (DOMParser) | ✅ Works for all standard PPTX |
| `extractNotes` | ✅ Handles missing/empty/corrupt |
| `parseImageIndex` (image extraction) | ✅ Correct MIME detection + resize |
| `compareSlides` / `slideHash` | ✅ Unchanged and compatible |
| API Auth + ownership | ✅ Correct 401/404 semantics |
| API Rate limiting | ✅ Properly scoped per-user |
| API Error isolation (per-image) | ✅ One failure doesn't cascade |
| SlideParsedData Text tab | ✅ Clean, handles overflow |
| SlideParsedData Notes tab (notes only) | ✅ Notes display + timestamps work |
| SlideParsedData Images loading states | ✅ Skeleton + empty + error all covered |
| Persistence data flow | ✅ Batch → parent state → editor_state → save |
| Restore from editor_state | ✅ Loads cached descriptions on page load |
| TypeScript compilation | ✅ Zero errors across all files |

---

## 7. Remediation Priority

### Must Fix Before Shipping
1. **C1** — Fix comments XML parsing (wrong element names)
2. **H1** — Fix SlideParsedData cache consumption (missing `useEffect` sync)
3. **H4/H5/H6** — Fix BatchImageFetcher stability (unstable callback, retry loop, silent errors)

### Should Fix
4. **H2/H3** — API route Zod validation + batched Gemini calls (prevent timeouts)
5. **M1** — Mobile touch targets to 48px
6. **M3** — Remove unused imports

### Nice to Have
7. **M2** — SVG image fallback
8. **M4/M5** — saveState deps + dirty tracking
9. **M6** — SSR guard on resizeImage
10. **L1-L6** — Cleanup low-priority items

---

## 8. Files Changed (This Branch)

```
frontend/lib/pptx-renderer.ts                         — Overhauled parser
frontend/lib/image-analysis.ts                         — NEW: client-side image API helper
frontend/app/api/generate/image-descriptions/route.ts  — NEW: Gemini Vision API
frontend/components/dashboard/SlideParsedData.tsx       — NEW: pill-tab modal
frontend/components/dashboard/SlideEditor.tsx           — Integrated + BatchImageFetcher
frontend/app/dashboard/.../presentations/[id]/page.tsx  — Image desc persistence
docs/specs/2026-07-16-systematic-parsing-spec.md        — NEW: design spec
```

*6 files, +1425 / −122 lines across 4 commits.*
