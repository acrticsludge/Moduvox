# PPTX Parsing & Real Slide Display — Implementation Plan

**Goal:** Parse uploaded PPTX files client-side and display real slide content in the editor.

**Architecture:** Install `jszip`, create a `parsePptx` utility that extracts slide text from PPTX XML, lift parsed slide data to the page, render real slides in `SlideEditor`.

**Spec:** `docs/superpowers/specs/2026-06-25-pptx-parsing-design.md`

---

## File Map

| File | Action |
|------|--------|
| `package.json` | Modify (add `jszip` + `@types/jszip`) |
| `lib/pptx-parser.ts` | Create |
| `components/dashboard/PptxUploadZone.tsx` | Modify — pass file up via onFileAccepted |
| `app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx` | Modify — manage parsed slides state, pass to editor |
| `components/dashboard/SlideEditor.tsx` | Modify — accept real slides, remove mock data |

---

### Task 1: Install JSZip

- [ ] **Step 1: Install package**

Run from `frontend/`:
```bash
npm install jszip
```

- [ ] **Step 2: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: install jszip for PPTX parsing"
```

---

### Task 2: Create PPTX parser utility

- [ ] **Step 1: Create `lib/pptx-parser.ts`**

```typescript
import JSZip from "jszip"

export type ParsedSlide = {
  number: number
  title: string
  bullets: string[]
  rawText: string
}

/**
 * Parse a .pptx file and extract text content from each slide.
 * Uses JSZip to read the ZIP archive and parse the slide XML files.
 */
export async function parsePptx(file: File): Promise<ParsedSlide[]> {
  const arrayBuffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)
  const slides: ParsedSlide[] = []

  // Find all slide files (ppt/slides/slideN.xml)
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || "0", 10)
      const numB = parseInt(b.match(/\d+/)?.[0] || "0", 10)
      return numA - numB
    })

  let index = 0
  for (const slidePath of slideFiles) {
    index++
    const xmlContent = await zip.files[slidePath].async("string")

    // Extract all text from <a:t> elements
    const textRuns = extractATextElements(xmlContent)

    // Group into paragraphs (each <a:p> produces one text block)
    const paragraphs = extractParagraphs(xmlContent)

    const rawText = paragraphs.join("\n")
    const title = paragraphs[0] || `Slide ${index}`
    const bullets = paragraphs.slice(1).filter((p) => p.trim().length > 0)

    slides.push({
      number: index,
      title,
      bullets: bullets.length > 0 ? bullets : ["(No content)"],
      rawText,
    })
  }

  return slides
}

/** Extract text from all <a:t> elements in the XML */
function extractATextElements(xml: string): string[] {
  const texts: string[] = []
  // Match <a:t>text content</a:t>
  const regex = /<a:t[^>]*>([^<]*)<\/a:t>/g
  let match
  while ((match = regex.exec(xml)) !== null) {
    const text = match[1].trim()
    if (text) texts.push(text)
  }
  return texts
}

/** Group <a:t> text into paragraphs based on <a:p> structure */
function extractParagraphs(xml: string): string[] {
  const paragraphs: string[] = []
  // Match each <a:p>...</a:p> block
  const pRegex = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g
  let pMatch
  while ((pMatch = pRegex.exec(xml)) !== null) {
    const pContent = pMatch[1]
    // Extract all <a:t> text within this paragraph
    const tRegex = /<a:t[^>]*>([^<]*)<\/a:t>/g
    let tMatch
    let text = ""
    while ((tMatch = tRegex.exec(pContent)) !== null) {
      text += tMatch[1]
    }
    const trimmed = text.trim()
    if (trimmed) paragraphs.push(trimmed)
  }
  return paragraphs
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1`  
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/pptx-parser.ts
git commit -m "feat: add PPTX parser utility using JSZip"
```

---

### Task 3: Update data flow — page manages parsed slides

- [ ] **Step 1: Update `PptxUploadZone` to pass file in onFileAccepted**

The component already accepts `onFileAccepted?: (file: File) => void`. No change needed to the interface — just verify it passes the file object correctly.

- [ ] **Step 2: Update page to manage parsed slides state**

Edit `frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx`:

Add import:
```typescript
import { useState } from "react"
import type { ParsedSlide } from "@/lib/pptx-parser"
```

Add state after `selectedVoiceId`:
```typescript
const [parsedSlides, setParsedSlides] = useState<ParsedSlide[]>([])
const [uploadedFile, setUploadedFile] = useState<File | null>(null)
```

Update the mode switch to also set the file and trigger parsing:
```typescript
function handleFileAccepted(file: File) {
  setUploadedFile(file)
  setMode("editor")
  // The SlideEditor will parse the file
}
```

Change the PptxUploadZone call:
```typescript
<PptxUploadZone onFileAccepted={handleFileAccepted} />
```

Change the SlideEditor call:
```typescript
<SlideEditor voiceSelected={!!selectedVoiceId} file={uploadedFile} />
```

- [ ] **Step 3: Update SlideEditor to accept file prop and parse it**

Edit `frontend/components/dashboard/SlideEditor.tsx`:

Change function signature:
```typescript
export function SlideEditor({ voiceSelected, file }: { voiceSelected: boolean; file: File | null }) {
```

Add import:
```typescript
import { useEffect } from "react"
import { parsePptx, type ParsedSlide } from "@/lib/pptx-parser"
```

Add state:
```typescript
const [slides, setSlides] = useState<ParsedSlide[]>([])
const [parsing, setParsing] = useState(true)
```

Add useEffect to parse the file:
```typescript
useEffect(() => {
  if (!file) {
    setParsing(false)
    return
  }
  setParsing(true)
  parsePptx(file)
    .then((parsed) => {
      setSlides(parsed)
      setParsing(false)
    })
    .catch(() => {
      setParsing(false)
    })
}, [file])
```

Update the initial state and current slide accessor to use `slides` state instead of mock data.

Remove `MOCK_SLIDES` constant and `SlideData` local type (replace with `ParsedSlide` import).

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1`  
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/app/dashboard/projects/\[id\]/presentations/\[presentationId\]/page.tsx frontend/components/dashboard/SlideEditor.tsx
git commit -m "feat: wire up real PPTX parsing to SlideEditor"
```

---

## Self-Review

1. **Spec coverage:**
   - Client-side PPTX parsing via JSZip ✅
   - Slide text extraction from XML ✅
   - Real slide display in editor ✅
   - File passes from upload zone through page to editor ✅
   - Parsing happens after file accepted ✅

2. **Placeholder scan:** No TBDs or TODOs.

3. **Type consistency:** `ParsedSlide` type used in parser, page, and editor consistently. `SlideData` replaced by `ParsedSlide`.
