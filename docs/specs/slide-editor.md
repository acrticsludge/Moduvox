# Slide Editor — Design Spec

> **Date:** 2026-06-25  
> **Status:** Draft  
> **Related PRD:** `docs/PRD.md` (§8 Proposed Workflow)  

---

## 1. Goal

Add a slide editor view to the presentation create page that appears after a PPTX file is selected. User can cycle through slides, view slide previews, edit narration text, and click "Generate Narration" to reveal an audio player per slide. No backend — pure frontend UI with mock data.

---

## 2. Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Breadcrumb: All Projects > Project > Presentation            │
├──────────┬───────────────────────────────────────────────────┤
│ SIDEBAR  │  EDITOR                                            │
│ (voice)  │                                                    │
│          │         ◀  Slide 1 of 3  ▶                         │
│          │   ┌───────────────────────────────────────────┐    │
│          │   │                                           │    │
│          │   │          SLIDE PREVIEW                    │    │
│          │   │    (placeholder card with slide number)    │    │
│          │   │                                           │    │
│          │   └───────────────────────────────────────────┘    │
│          │                                                    │
│          │   Narration Script                                 │
│          │   ┌───────────────────────────────────────────┐    │
│          │   │                                           │    │
│          │   │   Editable textarea (placeholder)          │    │
│          │   │                                           │    │
│          │   └───────────────────────────────────────────┘    │
│          │                                                    │
│          │   [ Generate Narration ]                           │
│          │                                                    │
│          │   ┌───────────────────────────────────────────┐    │
│          │   │  ▶  Audio Player (appears after gen)      │    │
│          │   │  0:00 ────────────────○────── 0:00        │    │
│          │   └───────────────────────────────────────────┘    │
│          │                                                    │
└──────────┴────────────────────────────────────────────────────┘
```

---

## 3. Flow

1. User is on presentation create page — upload zone visible, sidebar visible
2. User drops/clicks a valid `.pptx` file in the upload zone
3. Upload zone validates file → calls `onFileAccepted(file)` callback
4. Page switches mode from `'upload'` to `'editor'`
5. Upload zone is replaced by `SlideEditor` component
6. Editor shows Slide 1 with an empty narration textarea and a Generate button
7. User clicks ◀ / ▶ arrows to cycle through slides (3 mock slides)
8. User types/edits narration text (persisted per slide in state)
9. User clicks "Generate Narration" → audio player appears below for that slide
10. User can navigate to other slides — audio player persists (shown per slide after generate)

---

## 4. Component Design

### `SlideEditor` (new)
- **Props:** none (manages own state)
- **State:**
  - `slides: SlideData[]` — mock array of 3 slides with `{ id, number, narrationText, audioGenerated }`
  - `currentIndex: number` — which slide is visible
- **Children:**
  - Slide preview area (placeholder card with slide number)
  - Narration textarea (shadcn `<Textarea>`, editable, linked to current slide)
  - "Generate Narration" button (shadcn `<Button>`)
  - Audio player (shadcn `<div>` — visible only after generate clicked for current slide)
  - Navigation arrows (◀ / ▶) with "Slide X of Y" counter

### `PptxUploadZone` (modified)
- **New prop:** `onFileAccepted?: (file: File) => void`
- **Behavior:** After validation passes and file is set, calls `onFileAccepted(file)` so parent can switch modes

### Presentation create page (modified)
- **New state:** `mode: "upload" | "editor"`
- **Logic:** When `onFileAccepted` fires → set mode to `"editor"`
- **Render:** If mode is `"upload"` → render `PptxUploadZone`. If `"editor"` → render `SlideEditor`

---

## 5. Mock Data

```ts
const MOCK_SLIDES = [
  { id: "1", number: 1, narrationText: "", audioGenerated: false },
  { id: "2", number: 2, narrationText: "", audioGenerated: false },
  { id: "3", number: 3, narrationText: "", audioGenerated: false },
]
```

---

## 6. File Changes

| File | Action |
|------|--------|
| `components/dashboard/SlideEditor.tsx` | Create |
| `components/dashboard/PptxUploadZone.tsx` | Modify (add `onFileAccepted` prop) |
| `app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx` | Modify (add mode state, conditional render) |

---

## 7. Non-Goals

- No PPTX parsing or upload to Supabase Storage
- No Gemini narration generation
- No real audio generation via VoxCPM2
- No slide persistence in database
- No "go back to upload" flow
