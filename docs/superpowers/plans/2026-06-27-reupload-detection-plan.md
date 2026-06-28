# Re-Upload & Smart Change Detection — Implementation Plan

**Goal:** Add re-upload button, slide diff detection, and contextual confirmation modals.

---

### Task 1: Add slideHash utility to pptx-renderer

Modify `lib/pptx-renderer.ts` — export a `slideHash` function and a `compareSlides` function.

```typescript
export function slideHash(title: string, bullets: string[]): string {
  const content = title + "|" + bullets.join("|")
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return String(hash)
}

export type SlideDiff = {
  type: "identical" | "changed" | "replacement"
  added: number
  removed: number
  changed: number
  unchanged: number
  message: string
}

export function compareSlides(
  oldSlides: { title: string; bullets: string[] }[],
  newSlides: { title: string; bullets: string[] }[],
): SlideDiff {
  const oldHashes = oldSlides.map((s) => slideHash(s.title, s.bullets))
  const newHashes = newSlides.map((s) => slideHash(s.title, s.bullets))

  // Check if completely different (count differs by >30% or very few matching hashes)
  const matchCount = newHashes.filter((h) => oldHashes.includes(h)).length
  const maxLen = Math.max(oldHashes.length, newHashes.length)
  const matchRatio = maxLen > 0 ? matchCount / maxLen : 1

  if (matchRatio === 1 && oldHashes.length === newHashes.length) {
    return { type: "identical", added: 0, removed: 0, changed: 0, unchanged: oldHashes.length, message: "No changes detected." }
  }

  if (matchRatio < 0.3 || Math.abs(oldHashes.length - newHashes.length) > Math.max(3, oldHashes.length * 0.3)) {
    return {
      type: "replacement",
      added: newHashes.length,
      removed: oldHashes.length,
      changed: 0,
      unchanged: matchCount,
      message: "This appears to be a completely different presentation.",
    }
  }

  const added = newHashes.length - newHashes.filter((h) => oldHashes.includes(h)).length
  const removed = oldHashes.length - oldHashes.filter((h) => newHashes.includes(h)).length
  const changed = maxLen - matchCount - Math.min(added, removed)

  return { type: "changed", added, removed, changed, unchanged: matchCount, message: `${changed} slide(s) changed, ${added} added, ${removed} removed.` }
}
```

---

### Task 2: Create ReUploadModal component

Create `components/dashboard/ReUploadModal.tsx` — handles all 3 modal variants.

```tsx
"use client"

import { AlertTriangle, FileText, Info, ArrowRight } from "lucide-react"
import type { SlideDiff } from "@/lib/pptx-renderer"

export function ReUploadModal({
  diff,
  onApply,
  onCancel,
  parsing,
}: {
  diff: SlideDiff
  onApply: () => void
  onCancel: () => void
  parsing: boolean
}) {
  const isReplacement = diff.type === "replacement"
  const isIdentical = diff.type === "identical"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40">
      <div className="mx-4 w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
        {/* Icon */}
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
          isReplacement ? "bg-red-50" : isIdentical ? "bg-zinc-50" : "bg-amber-50"
        }`}>
          {isReplacement ? (
            <AlertTriangle className="h-6 w-6 text-red-500" />
          ) : isIdentical ? (
            <Info className="h-6 w-6 text-zinc-500" />
          ) : (
            <FileText className="h-6 w-6 text-amber-500" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-center text-base font-semibold text-[#18181B]">
          {isReplacement ? "Replace all slides?" : isIdentical ? "No changes detected" : "Slides updated"}
        </h2>

        {/* Body */}
        <p className="mt-2 text-center text-sm text-[#71717A]">
          {isReplacement
            ? "This appears to be a completely different presentation. All existing slides, narration, and voice settings will be replaced."
            : isIdentical
              ? "This file is identical to the current version. No changes needed."
              : diff.message}
        </p>

        {/* Detail list for changes */}
        {!isReplacement && !isIdentical && (
          <div className="mt-4 space-y-1.5 text-sm">
            {diff.added > 0 && <p className="text-green-600">+ {diff.added} slide(s) added</p>}
            {diff.removed > 0 && <p className="text-red-600">- {diff.removed} slide(s) removed</p>}
            {diff.changed > 0 && <p className="text-amber-600">~ {diff.changed} slide(s) changed</p>}
            {diff.unchanged > 0 && <p className="text-zinc-500">{diff.unchanged} slide(s) unchanged</p>}
          </div>
        )}

        {/* Replacement warning checkbox */}
        {isReplacement && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs text-red-700">
              This action cannot be undone. All narration text and voice settings will be lost.
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={parsing}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-[#71717A] hover:text-[#18181B] disabled:opacity-50"
          >
            {isIdentical ? "OK" : "Cancel"}
          </button>
          {!isIdentical && (
            <button
              type="button"
              onClick={onApply}
              disabled={parsing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#18181B]/70 bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#27272A] disabled:opacity-50"
            >
              {parsing ? "Processing..." : isReplacement ? "Replace All" : "Apply Changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

### Task 3: Integrate into SlideEditor

Add to `components/dashboard/SlideEditor.tsx`:

1. Import the modal and compare function
2. Add re-upload button in the top bar section (when viewer is loaded)
3. When new file is selected, parse it, compare with current slides, show modal
4. On apply: replace slides, handle overflow, navigate to slide 1
5. On cancel: discard changes

Add state:
```typescript
const [showReUpload, setShowReUpload] = useState(false)
const [pendingDiff, setPendingDiff] = useState<SlideDiff | null>(null)
const [pendingSlides, setPendingSlides] = useState<ParsedSlide[]>([])
```

Add re-upload handler:
```typescript
function handleReUpload(file: File) {
  parsePptxText(file).then((newSlides) => {
    const diff = compareSlides(
      slides.map((s) => ({ title: s.title, bullets: s.bullets })),
      newSlides.map((s) => ({ title: s.title, bullets: s.bullets })),
    )
    setPendingSlides(newSlides)
    setPendingDiff(diff)
    setShowReUpload(true)
  })
}
```

Add apply handler:
```typescript
function applyReUpload() {
  if (!pendingSlides.length) return
  setSlides(pendingSlides)
  onSlideDataChange?.(pendingSlides)
  const overflow = currentIndex >= pendingSlides.length
  if (overflow) {
    setInternalIndex(pendingSlides.length - 1)
    onCurrentSlideChange?.(pendingSlides.length - 1)
  }
  setShowReUpload(false)
  setPendingDiff(null)
  setPendingSlides([])
  // Re-upload the file to storage
  // (simplified: the user can use the upload zone for now)
}
```

---

### Task 4: Integrate re-upload button

In the top bar of the SlideEditor, add a re-upload button that opens a file picker.

```tsx
{viewerUrl && (
  <div className="absolute top-3 right-3">
    <label className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-[#71717A] shadow-sm transition-colors hover:text-[#18181B]">
      Re-upload
      <input
        type="file"
        accept=".pptx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleReUpload(f)
        }}
      />
    </label>
  </div>
)}
```
