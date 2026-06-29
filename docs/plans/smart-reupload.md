# Smart Re-upload with Modified Slide Tracking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-slide change tracking, visual indicators, narration merging, and selective audio regeneration to the re-upload flow.

**Architecture:** Extend `compareSlides()` to return per-slide change info, store `changedSlides` set in editor state, show badges in UI, merge narrations on apply, add conditional regenerate button.

**Tech Stack:** TypeScript, React, Next.js App Router, Tailwind CSS

---

### Task 1: Extend `compareSlides` to return per-slide changes

**Files:**
- Modify: `frontend/lib/pptx-renderer.ts:71-126`

- [ ] **Step 1: Add `SlideChangeInfo` type and `changes` field to `SlideDiff`**

Add before `SlideDiff` type:

```typescript
export type SlideChangeInfo = {
  number: number
  oldNumber: number | null
  status: "unchanged" | "modified" | "added"
}
```

Add `changes: SlideChangeInfo[]` to `SlideDiff`:

```typescript
export type SlideDiff = {
  type: "identical" | "changed" | "replacement"
  added: number
  removed: number
  changed: number
  unchanged: number
  message: string
  changes: SlideChangeInfo[]
}
```

- [ ] **Step 2: Update `compareSlides` to compute per-slide info**

Replace the entire function with a position-aware version:

```typescript
export function compareSlides(
  oldSlides: { title: string; bullets: string[] }[],
  newSlides: { title: string; bullets: string[] }[],
): SlideDiff {
  const oldHashes = oldSlides.map((s) => slideHash(s.title, s.bullets))
  const newHashes = newSlides.map((s) => slideHash(s.title, s.bullets))

  const matchCount = newHashes.filter((h) => oldHashes.includes(h)).length
  const maxLen = Math.max(oldHashes.length, newHashes.length)
  const matchRatio = maxLen > 0 ? matchCount / maxLen : 1

  // Identical
  if (matchRatio === 1 && oldHashes.length === newHashes.length) {
    const changes: SlideChangeInfo[] = newSlides.map((_, i) => ({
      number: i + 1,
      oldNumber: i + 1,
      status: "unchanged" as const,
    }))
    return { type: "identical", added: 0, removed: 0, changed: 0, unchanged: oldHashes.length, message: "No changes detected.", changes }
  }

  // Replacement
  if (matchRatio < 0.3 || Math.abs(oldHashes.length - newHashes.length) > Math.max(3, oldHashes.length * 0.3)) {
    return { type: "replacement", added: newHashes.length, removed: oldHashes.length, changed: 0, unchanged: matchCount, message: "This appears to be a completely different presentation.", changes: [] }
  }

  // Changed — compute per-slide
  const changes: SlideChangeInfo[] = []
  let changedCount = 0
  let addedCount = 0
  let removedCount = 0
  let unchangedCount = 0

  const maxPos = Math.max(oldHashes.length, newHashes.length)
  for (let i = 0; i < maxPos; i++) {
    if (i >= newHashes.length) {
      // Old slide with no new counterpart → removed (won't appear in new deck)
      removedCount++
    } else if (i >= oldHashes.length) {
      // New slide with no old counterpart → added
      changes.push({ number: i + 1, oldNumber: null, status: "added" })
      addedCount++
    } else if (newHashes[i] === oldHashes[i]) {
      // Same position, same content → unchanged
      changes.push({ number: i + 1, oldNumber: i + 1, status: "unchanged" })
      unchangedCount++
    } else if (oldHashes.includes(newHashes[i])) {
      // Different position, but content exists elsewhere → also unchanged from content perspective
      // But slide moved — show as modified for clarity
      changes.push({ number: i + 1, oldNumber: i + 1, status: "modified" })
      changedCount++
    } else {
      // Different content
      changes.push({ number: i + 1, oldNumber: i + 1, status: "modified" })
      changedCount++
    }
  }

  return { type: "changed", added: addedCount, removed: removedCount, changed: changedCount, unchanged: unchangedCount, message: `${changedCount} slide(s) changed, ${addedCount} added, ${removedCount} removed.`, changes }
```

- [ ] **Step 3: Verify compile**

Run: `cd frontend; npx tsc --noEmit --pretty`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/pptx-renderer.ts
git commit -m "feat: add per-slide change tracking to compareSlides"
```

---

### Task 2: Update `ReUploadModal` to show per-slide breakdown

**Files:**
- Modify: `frontend/components/dashboard/ReUploadModal.tsx`

- [ ] **Step 1: Add per-slide list to the diff dialog**

Replace the `{diff.added > 0 && ...}` count section with a per-slide list when `diff.type === "changed"`:

```typescript
{diff.changes.length > 0 && (
  <div className="mt-4 space-y-1.5 text-sm">
    {diff.changes.map((c) => (
      <div key={c.number} className="flex items-center gap-2">
        <span className="text-zinc-400">#{c.number}</span>
        {c.status === "unchanged" && <span className="text-zinc-500">— unchanged</span>}
        {c.status === "modified" && <span className="text-amber-600">~ modified</span>}
        {c.status === "added" && <span className="text-green-600">+ added</span>}
      </div>
    ))}
  </div>
)}
```

Remove the old count-only section (`diff.added > 0 && ...` block).

- [ ] **Step 2: Verify compile**

Run: `cd frontend; npx tsc --noEmit --pretty`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/dashboard/ReUploadModal.tsx
git commit -m "feat: show per-slide change list in re-upload dialog"
```

---

### Task 3: Add `changedSlides` state, narration merging, and visual indicators to SlideEditor

**Files:**
- Modify: `frontend/components/dashboard/SlideEditor.tsx`
- Modify: `frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx`

- [ ] **Step 1: Add `changedSlides` state and prop to SlideEditor**

Add new prop:
```typescript
changedSlides?: number[]
onChangedSlidesChange?: (v: number[]) => void
```

Add internal state:
```typescript
const [internalChangedSlides, setInternalChangedSlides] = useState<number[]>([])
```

Controlled/uncontrolled pattern:
```typescript
const changedSlides = externalChangedSlides ?? internalChangedSlides
```

- [ ] **Step 2: In `applyReUpload`, merge narrations and set changed slides for "changed" type**

After the slide data replacement, add narration merge logic:

```typescript
// Merge narrations for "changed" type
if (!isReplacement && pendingDiff?.changes) {
  const newNarrations = { ...narrations }
  const changed: number[] = []

  for (const change of pendingDiff.changes) {
    if (change.status === "unchanged") {
      // Keep existing narration (already in newNarrations)
    } else if (change.status === "modified") {
      // Keep existing narration, but mark as changed
      changed.push(change.number)
    } else if (change.status === "added") {
      // Initialize narration from slide content
      const slide = pendingSlides[change.number - 1]
      if (slide) {
        newNarrations[change.number] = slide.title + (slide.bullets.length > 0 ? "\n" + slide.bullets.join("\n") : "")
      }
      changed.push(change.number)
    }
  }

  // Clean up narrations for slides that no longer exist
  const validSlideNumbers = new Set(pendingSlides.map((_, i) => i + 1))
  for (const key of Object.keys(newNarrations)) {
    if (!validSlideNumbers.has(Number(key))) {
      delete newNarrations[Number(key)]
    }
  }

  setInternalNarrations(newNarrations)
  onNarrationsChange?.(newNarrations)
  setInternalChangedSlides(changed)
  onChangedSlidesChange?.(changed)
}
```

- [ ] **Step 3: Add the "N slides modified" banner below slide info**

After the "View parsed information" button (around line 432), add:

```typescript
{changedSlides.length > 0 && (
  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
    <span className="h-2 w-2 rounded-full bg-amber-500" />
    <span>{changedSlides.length} slide(s) modified since re-upload</span>
  </div>
)}
```

- [ ] **Step 4: Add modified/added badge to slide info title**

In the slide info modal, after "Slide N — Title", add:

```typescript
{changedSlides.includes(current.number) && (
  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
    Modified
  </span>
)}
```

- [ ] **Step 5: Add selective regeneration button (only when audioGenerated + changedSlides exist)**

After the audio generated success banner (around line 512), add:

```typescript
{audioGenerated && changedSlides.length > 0 && (
  <Button
    onClick={handleGenerate}
    disabled={generating}
    variant="outline"
    className="w-full"
  >
    {generating
      ? `Regenerating audio for ${changedSlides.length} slide(s)...`
      : `Regenerate audio for ${changedSlides.length} modified slide(s)`}
  </Button>
)}
```

- [ ] **Step 6: After regeneration completes, clear changed slides**

In `handleGenerate`, after the timeout:

```typescript
setInternalChangedSlides([])
onChangedSlidesChange?.([])
```

- [ ] **Step 7: Update parent page to pass through new props**

In `page.tsx`, add state and pass props:

```typescript
const [changedSlides, setChangedSlides] = useState<number[]>([])
```

Add to the auto-save state and pass to SlideEditor:

```typescript
// In the editor_state object:
changedSlides: changedSlides.length > 0 ? changedSlides : undefined,

// In SlideEditor props:
changedSlides={changedSlides}
onChangedSlidesChange={setChangedSlides}
```

- [ ] **Step 8: Verify compile**

Run: `cd frontend; npx tsc --noEmit --pretty`

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add frontend/components/dashboard/SlideEditor.tsx frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx
git commit -m "feat: add slide change tracking, narration merge, and selective regeneration button"
```
