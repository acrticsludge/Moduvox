# Smart Re-upload with Modified Slide Tracking

**Feature:** When a user re-uploads a PPTX with changed slides, the system tracks per-slide change status, shows visual indicators, intelligently merges narrations, and offers selective audio regeneration for changed slides only.

**Status:** Approved for implementation

---

## Problem

Currently, re-uploading a PPTX with changes (diff type "changed") shows a summary in the diff dialog ("2 slides changed, 1 added") but:
- No per-slide indication of which slides changed after apply
- All narrations are silently kept (including for removed/overwritten slides)
- No way to regenerate audio selectively for only the changed slides
- Removed slides' narrations remain in state as orphans

## Solution

### 1. Per-Slide Change Tracking

Extend `compareSlides` to return a per-slide change map alongside the existing summary. New type:

```typescript
type SlideChangeInfo = {
  number: number    // 1-based slide number in the NEW deck
  oldNumber: number | null  // 1-based slide it came from in old deck (null if added)
  status: "unchanged" | "modified" | "added" | "removed"
}
```

Comparison strategy — position-based with content hash:
- Compare slides position-by-position (index i in old vs index i in new)
- If same position + same content hash → "unchanged"
- If same position + different content → "modified" (check if content existed at another position → reordered)
- New slides beyond old length → "added"
- Old slides beyond new length → "removed"

The `SlideDiff` type gets a new `changes: SlideChangeInfo[]` field. This field is empty for "identical" and "replacement" types.

**File changed:** `frontend/lib/pptx-renderer.ts`

### 2. Improved Diff Dialog

The `ReUploadModal` shows per-slide breakdown for "changed" type:
- Lists each slide number with its change type badge
- Added slides in green, modified in amber, removed in red, unchanged in gray

**File changed:** `frontend/components/dashboard/ReUploadModal.tsx`

### 3. Narration Merging on Apply

When `applyReUpload()` executes for a "changed" diff:

| Diff Type | Action |
|-----------|--------|
| Unchanged | Narration preserved as-is |
| Modified | Narration preserved (user's edits kept), marked as "modified" in state |
| Added | Narration auto-initialized from slide content (title + bullets joined as a paragraph) |
| Removed | No action needed (removed slides are gone) |

Replacement behavior stays the same: all narrations, audio state, and current slide reset.

**New state:** `changedSlides: Set<number>` (1-based slide numbers that were modified/added)
- Persisted in editor state via auto-save
- Cleared when user triggers regeneration or dismisses

### 4. Visual Indicators

In the SlideEditor control panel, a new indicator section appears when `changedSlides.size > 0`:
- Text: "2 slide(s) modified since re-upload" with an amber dot
- Each modified/added slide in the "View parsed information" list shows a badge
- On the slide itself (title area), a subtle "Modified" / "New" chip

### 5. Selective Audio Regeneration Button

Visible when BOTH conditions are true:
- `audioGenerated === true`
- `changedSlides.size > 0`

Button text: "Regenerate audio for N modified slide(s)"
On click: triggers the existing `handleGenerate` flow (1.2s stub), then clears `changedSlides`.

If narration text was auto-initialized for added slides, the user can edit it before regenerating.

---

## Out of Scope

- Actual AI narration generation from slide content (requires Gemini/OpenAI integration — separate feature)
- Actual per-slide audio generation (current `handleGenerate` is a stub — will be wired later)
- Drag-and-drop reorder detection in diff (hash-based position comparison is sufficient)

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/lib/pptx-renderer.ts` | Add `SlideChangeInfo` type, `changes` field to `SlideDiff`, update `compareSlides` |
| `frontend/components/dashboard/ReUploadModal.tsx` | Show per-slide change list in dialog |
| `frontend/components/dashboard/SlideEditor.tsx` | Add `changedSlides` state, visual indicators, narration merge logic, selective regenerate button |
| `frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx` | Pass through new props / state |

---

## Data Flow

```
Re-upload with changes:
  handleReUploadFile(file)
    → parsePptxText(file) → newSlides
    → compareSlides(oldSlides, newSlides)
      → returns { type: "changed", changes: [...] }
    → show modal with per-slide breakdown

  applyReUpload() [user clicks "Apply Changes"]
    → merge narrations (preserve unchanged, keep modified, init added)
    → set changedSlides = [modified + added slide numbers]
    → upload file to storage, refresh viewer

  Editor shows:
    → "3 slides modified since re-upload" banner
    → Badges on modified/added slides
    → "Regenerate audio for 3 modified slides" button

  User clicks regenerate:
    → handleGenerate() stub fires
    → on completion: clear changedSlides
    → banner/button disappear
```
