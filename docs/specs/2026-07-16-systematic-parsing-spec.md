# Systematic PPTX Parsing

> Version: 1.0.0 | Date: 2026-07-16
> Status: Draft

## Overview

Overhaul the PPTX parsing pipeline to be systematic, extracting not just slide text but also inline notes, comments, and images (with AI descriptions). Display results in a pill-tab modal with proper error states per section.

---

## Architecture

### Current Flow

```
File → JSZip → Regex XML parsing → ParsedSlide { title, bullets, rawText }
                                                      ↓
                                          EditorState → SlideInfo modal
```

### New Flow

```
File → JSZip → DOMParser XML parsing → ParsedSlide { title, bullets, notes, comments, images, rawText }
                                                                   ↓
                                                     ┌─────────────┴─────────────┐
                                                     ↓                           ↓
                                           EditorState (text)        Image extraction via canvas
                                                                           ↓
                                                                POST /api/generate/image-descriptions
                                                                           ↓
                                                                Gemini Vision → image descriptions
                                                                           ↓
                                                                EditorState (descriptions)
                                                     ↓
                                           SlideParsedData component
                                           ┌─────┬──────┬──────┐
                                           │Text │Notes │Images│ (pill tabs)
                                           └─────┴──────┴──────┘
```

---

## Data Types

### ParsedSlide (updated)

```typescript
export type ParsedSlide = {
  number: number
  title: string
  bullets: string[]
  notes: string | null          // Slide notes content, null if none
  comments: SlideComment[]      // Comments/annotations on this slide
  images: SlideImage[]          // Extracted image data
  rawText: string               // All paragraphs joined
}

export type SlideComment = {
  author: string
  text: string
  createdAt: string
}

export type SlideImage = {
  index: number                 // 0-based per slide
  mimeType: string              // "image/png" | "image/jpeg"
  dataUrl: string               // base64 data URL (resized to 400px)
}

export type ImageDescription = {
  index: number                 // matches SlideImage.index
  description: string
  error?: string                // present if analysis failed
}
```

---

## Phase 1 — Core Parser (pptx-renderer.ts)

### XML Parsing

Replace regex-based extraction with **`DOMParser`** (native browser API). PPTX slide XML structure:

```xml
<p:sp>
  <p:txBody>
    <a:p>
      <a:r>
        <a:t>Text content</a:t>
      </a:r>
    </a:p>
  </p:txBody>
</p:sp>
```

Parse all `<a:p>` elements within each slide XML, extract `<a:t>` text runs.

### Notes Extraction

- Source file: `ppt/notesSlides/notesSlideN.xml`
- Same `<a:p>` / `<a:t>` structure as slides
- Extract all paragraph text, join with newlines
- Store as `notes` field (null if no notes file exists for that slide)

### Comments Extraction

- Source file: `ppt/comments/commentN.xml`
- Structure per comment:
  ```xml
  <mc:Comment>
    <mc:author>Author Name</mc:author>
    <mc:commentText>Comment content</mc:commentText>
    <mc:dt>2026-01-15T10:30:00</mc:dt>
  </mc:Comment>
  ```
- Parse author, text, and timestamp
- Map comments to slides using comment position reference (if available) or infer from slide number
- Store as `comments: SlideComment[]`

### Image Extraction

- Parse `ppt/slides/_rels/slideN.xml.rels` for image relationships
  ```xml
  <Relationship Id="rId2" Type="http://.../image" Target="../media/image5.png"/>
  ```
- Extract target path, resolve to `ppt/media/image5.png`
- Read from JSZip as base64
- **Resize** client-side via `<canvas>` to max 400px on longest edge to keep payload small
- Store as `images: SlideImage[]`

### Edge Cases
- Slide with no notes file → `notes: null`
- Slide with no comments file → `comments: []`
- Slide with no images → `images: []`
- Corrupt XML in a slide → error for that slide, other slides unaffected
- Binary image extraction fails → skip that image, other images unaffected
- Image resize fails (canvas taint, large dimensions) → use original size

---

## Phase 2 — Image Descriptions (API)

### Client: `lib/image-analysis.ts`

- After parsing, iterate all slides with images
- Resize each image to 400px max dimension using canvas
- Collect into `{ slideNumber, images: SlideImage[] }` structure
- POST to `/api/generate/image-descriptions`

### API Route: `POST /api/generate/image-descriptions`

**Request:**
```json
{
  "presentationId": "uuid",
  "slides": [
    {
      "number": 1,
      "images": [
        { "index": 0, "mimeType": "image/png", "data": "<base64>" }
      ]
    }
  ]
}
```

**Processing:**
1. Authenticate user via Supabase
2. Verify user owns the presentation
3. For each slide, send images to Gemini 2.5 Flash Vision
4. Prompt: *"Describe this image from a business presentation slide. What is shown? Include text visible in the image, data trends, and the purpose of the visual."*
5. Return descriptions per image

**Response:**
```json
{
  "data": {
    "slides": [
      {
        "number": 1,
        "images": [
          { "index": 0, "description": "A bar chart showing revenue growth from Q1 to Q4..." }
        ]
      }
    ]
  }
}
```

**Error handling:**
- Per-image: if Gemini fails, return `{ index: 0, error: "Analysis failed", description: "" }`
- Per-slide: if all images on a slide fail, the slide still appears with error indicators
- Timeout: 30s per slide batch
- Rate limit: same 5 req/min shared key limit as narration
- Empty: if no images in entire presentation, return empty slides array

**Prompt design:**
- Instruct Gemini to describe what's visible, read any text, identify chart types
- Instruct Gemini to say "No significant visual content" rather than hallucinate
- Keep descriptions concise (2-3 sentences max)

---

## Phase 3 — Pill-Tab UI (`SlideParsedData.tsx`)

### Component Interface

```typescript
type SlideParsedDataProps = {
  slide: ParsedSlide
  imageDescriptions?: Record<number, ImageDescription>  // index → description
  imageErrors?: Record<number, string>                  // index → error message
  onClose: () => void
}
```

### Tab Structure

Three pill-style tabs at the top:

```
[ ● Text ]  [ ● Notes ]  [ ● Images ]
```

Each tab has a small dot indicator:
- **Green dot** → content loaded successfully
- **Red dot** → error/failure for that section
- **Gray dot** → empty (no content to show)
- **No dot** → content loading

### Text Tab

- Shows existing content: title (h2) + bullet list
- If no title and no bullets: "No text content extracted"
- No error state unless parser itself failed (per-slide catch)

### Notes Tab

- If `notes` is non-null: show notes text in a styled block
- If `comments.length > 0`: show each comment with author avatar/initial, text, relative timestamp
- If both notes and comments exist: separate sections with sub-headings
- If neither: "No notes or comments on this slide" (gray dot indicator)
- Error state only if parser threw on notes/comments extraction

### Images Tab

- If `images.length > 0`: show each image as:
  ```
  ┌──────────────┐
  │   Thumbnail  │  Description text
  │   (small)    │  or error message w/ retry
  └──────────────┘
  ```
- If `imageDescriptions` has matching entry: show description
- If `imageErrors` has matching entry: show error with "Retry" button
- If images still loading: show skeleton placeholder
- If no images: "No images found on this slide" (gray dot indicator)

### Error State Behavior

- Each tab operates independently — one tab's error doesn't affect others
- Retry buttons only appear on the Images tab (API-callable)
- Text and Notes tabs never show retry (their data comes from the file, deterministic)
- If the entire parsing failed for a slide (corrupt XML), all tabs show appropriate errors

---

## Phase 4 — Integration

### SlideEditor.tsx Changes

- Remove both inline SlideInfo modal instances (desktop panel + mobile drawer)
- Import and use `SlideParsedData` component
- Pass parsed slide data + image descriptions
- Image descriptions stored in component state (or editor_state if persistence desired)

### State Persistence

Image descriptions are generated on-demand when the user opens the modal. They are NOT persisted in the database initially (avoids complex schema changes). A simple in-memory cache (`Map<number, ImageDescription[]>`) prevents re-fetching if the user closes/reopens the modal.

---

## Limitations & Future Work

- Image descriptions are ephemeral (not persisted in DB) — tuning to avoid hallucinations
- 30-slide hard limit unchanged
- Image extraction limited to embedded raster images (PNG/JPEG) — vector shapes, SmartArt, charts rendered as PowerPoint objects (not embedded images) are not extracted
- Batch size: max 5 images per slide processed

---

## Implementation Plan

### Phase 1 — Parser
1. Update `ParsedSlide` type with notes, comments, images
2. Replace regex extraction with DOMParser
3. Add notes extraction from `notesSlideN.xml`
4. Add comments extraction from `commentN.xml`
5. Add image extraction from `rels` + `media/`
6. Update `compareSlides` and `slideHash` to work with new type

### Phase 2 — Image API
7. Create `lib/image-analysis.ts` with resize + batch logic
8. Create `POST /api/generate/image-descriptions` route
9. Wire Gemini Vision prompts

### Phase 3 — UI
10. Create `SlideParsedData.tsx` with pill tabs
11. Error states per tab + empty states + loading states
12. Wire into `SlideEditor.tsx`, remove old modals

### Phase 4 — Polish
13. Type-check across all dependencies
14. Update specs and audit doc
