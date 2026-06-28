# Re-Upload & Smart Change Detection — Design Spec

**Date:** 2026-06-27  
**Priority:** P0 — Must have for editor usability

## Goals

1. **Re-upload button** in the editor top bar
2. **Smart change detection** — compare new PPTX slides against current slides
3. **Contextual confirmation modals** — different modal for identical / minor changes / major changes / different file
4. **Slide overflow handling** — if total slides decreases, snap current index
5. **Narration preservation** — keep existing narration text for unchanged slides

## Detection Algorithm

```typescript
// For each slide, compute a content hash from the extracted text
function slideHash(slide: { title: string; bullets: string[] }): string {
  return simpleHash(slide.title + "|" + slide.bullets.join("|"))
}

// Compare old and new slides
// If all hashes identical → "identical" (no-op modal)
// If same count but some hashes differ → "changed" (soft modal)
// If different count → "different" (detail modal with add/remove/change list)
// If completely different content + count → "replacement" (hard warning modal)
```

## Modals

### 1. Identical File
- Title: "No changes detected"
- Body: "This file is identical to the current version."
- Button: "OK" (no changes applied)

### 2. Same file, changes detected
- Title: "X slides updated"
- Body: Summary of added/removed/changed slides
- List: "Slide 3: Changed", "Slide 7: New", "Slide 5: Removed"
- Actions: "Apply Changes" / "Cancel"
- Narration preserved for unchanged slides

### 3. Completely different file
- Title: "Replace all slides?"
- Body: "This appears to be a completely different presentation. All existing slides, narration, and voice settings will be replaced."
- Actions: "Cancel" (default, destructive) / "Replace All"

### 4. Slide overflow
- Not a modal — toast notification:
- "Re-upload reduced slide count. Moved from slide X to slide Y."

## File Changes

| File | Action |
|------|--------|
| `components/dashboard/ReUploadModal.tsx` | Create — handles all modal variants |
| `components/dashboard/SlideEditor.tsx` | Modify — add re-upload button, integrate detection + modals |
| `lib/pptx-renderer.ts` | Modify — export a `slideHash` utility |
