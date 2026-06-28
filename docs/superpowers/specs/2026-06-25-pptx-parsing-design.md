# PPTX Parsing & Real Slide Display — Design Spec

> **Date:** 2026-06-25

---

## 1. Goal

After user uploads a `.pptx` file, parse it client-side to extract real slide content and display it in the SlideEditor instead of mock data.

## 2. Approach

**Client-side parsing with JSZip.** PPTX is a ZIP of XML files. JSZip extracts the XML, we parse slide text content from the XML structure. No server-side processing needed for the initial preview.

**Flow:**
1. User drops/selects `.pptx` file in `PptxUploadZone`
2. File is validated (already works)
3. `PptxUploadZone` calls `onFileAccepted(file)` → page switches to editor mode
4. Page passes file to `SlideEditor`
5. `SlideEditor` calls `parsePptx(file)` from `lib/pptx-parser.ts`
6. Parser extracts slide content → returns `SlideData[]`
7. Editor renders real slides
8. File is also uploaded to API (stores in Supabase Storage, no DB persistence yet)

## 3. PPTX Parsing

### How PPTX works
- ZIP file containing XML files
- Slides are at `ppt/slides/slideN.xml`
- Text content in `<a:t>` elements within `<a:r>` (runs) within `<a:p>` (paragraphs)

### Parser logic
```typescript
async function parsePptx(file: File): Promise<ParsedSlide[]>
```

For each slide XML:
1. Parse XML string
2. Find all `<a:p>` (paragraph) elements
3. Extract text from all `<a:t>` children, concatenating `<a:r>` runs within each paragraph
4. First paragraph → title (if it looks like a title - short, bold, or largest font)
5. Remaining paragraphs → body text / bullet points
6. Filter out empty paragraphs

### Output
```typescript
type ParsedSlide = {
  number: number
  title: string
  bullets: string[]
  rawText: string  // All text concatenated for the narration field
}
```

## 4. File Changes

| File | Action |
|------|--------|
| `lib/pptx-parser.ts` | **Create** — JSZip-based PPTX text extractor |
| `package.json` | **Modify** — add `jszip` dependency |
| `components/dashboard/SlideEditor.tsx` | **Modify** — accept real slide data instead of generating mock |
| `components/dashboard/PptxUploadZone.tsx` | **Modify** — pass selected file up |
| `app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx` | **Modify** — manage parsed slide state, pass to editor |

## 5. Non-Goals
- No server-side persistence of slides
- No Supabase Storage upload (can be added later)
- No slide thumbnail/image extraction
- No real PPTX formatting (fonts, colors, layouts)
