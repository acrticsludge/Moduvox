# Gemini AI Narration — Implementation Plan

**Goal:** Auto-generate conversational narration scripts from slide content using Gemini 2.0 Flash.

**Architecture:** New API route calls Gemini SDK, returns narrations keyed by slide number. SlideEditor auto-triggers on parse and wires the real API to the generate button.

**Tech Stack:** `@google/generative-ai`, Next.js API route, React state

---

### Task 1: Install Gemini SDK

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install the package**

```bash
cd frontend; npm install @google/generative-ai
```

- [ ] **Step 2: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: install @google/generative-ai SDK"
```

---

### Task 2: Create `POST /api/generate/narration` route

**Files:**
- Create: `frontend/app/api/generate/narration/route.ts`

- [ ] **Step 1: Create the API route**

```typescript
import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

type SlideInput = {
  number: number
  title: string
  bullets: string[]
}

export async function POST(request: Request) {
  try {
    const { slides, instructions, slideInstructions } = await request.json()

    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return NextResponse.json({ error: "Slides array is required" }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    const slideBlocks = slides.map(
      (s: SlideInput) =>
        `Slide ${s.number}:
Title: ${s.title}
Bullets:
${s.bullets.map((b: string) => `- ${b}`).join("\n")}
${slideInstructions?.[s.number] ? `Context: ${slideInstructions[s.number]}` : ""}`
    )

    const prompt = `You are a professional voice-over narrator. Convert each slide into natural, conversational narration as if presenting to a live audience.

Rules:
- Speak naturally — don't read bullet points verbatim
- Vary sentence rhythm and tone between slides
- For slides with few words (likely image-heavy), describe what the slide conveys
- For thank-you/closing slides, use a warm wrap-up tone
- For data slides, explain the numbers conversationally
- Keep each narration to 2-4 sentences
- Never say "slide N says" — just speak the content
- Don't use markdown or bullet indicators

Respond with ONLY a valid JSON object where keys are slide numbers and values are narration strings. No other text.

${instructions ? `Global style guide: ${instructions}` : ""}

Slides:
${slideBlocks.join("\n\n")}`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Parse the JSON response
    const jsonStart = text.indexOf("{")
    const jsonEnd = text.lastIndexOf("}")
    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json({ error: "AI returned invalid format" }, { status: 502 })
    }
    const narrations = JSON.parse(text.slice(jsonStart, jsonEnd + 1))

    return NextResponse.json({ data: { narrations } })
  } catch (error) {
    console.error("Narration generation failed:", error)
    return NextResponse.json({ error: "Failed to generate narrations" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify compile**

Run: `cd frontend; npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/generate/narration/route.ts
git commit -m "feat: add POST /api/generate/narration with Gemini integration"
```

---

### Task 3: Wire auto-generation into SlideEditor

**Files:**
- Modify: `frontend/components/dashboard/SlideEditor.tsx`

**Changes needed:**
1. Add `generatingNarrations` state
2. After slides are parsed (in `useEffect`), auto-trigger narration generation
3. Show loading state in textarea
4. Replace the stub `handleGenerate` with a real API call
5. Update the generate button text

- [ ] **Step 1: Add state for narration generation**

Add after line 65 (existing states):

```typescript
const [generatingNarrations, setGeneratingNarrations] = useState(false)
```

- [ ] **Step 2: Add auto-trigger function + call it after parsing**

After the `useEffect` where slides are set, add a new effect that triggers narration generation when slides are first available and no narrations exist:

```typescript
// Auto-generate narration when slides are first parsed and no narrations exist
useEffect(() => {
  if (slides.length === 0) return
  if (Object.keys(narrations).length > 0) return
  if (generatingNarrations) return

  async function generate() {
    setGeneratingNarrations(true)
    try {
      const res = await fetch("/api/generate/narration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides: slides.map((s) => ({ number: s.number, title: s.title, bullets: s.bullets })) }),
      })
      const json = await res.json()
      if (json.data?.narrations) {
        setInternalNarrations(json.data.narrations)
        onNarrationsChange?.(json.data.narrations)
      }
    } catch { /* narration failed — user can generate manually */ }
    setGeneratingNarrations(false)
  }
  generate()
}, [slides])
```

- [ ] **Step 3: Replace stub handleGenerate with real API call**

Replace the existing `handleGenerate` function:

```typescript
async function handleGenerate(selectedSlides?: Set<number>) {
  setGenerating(true)
  setLastRegenCount(selectedSlides?.size ?? 0)

  // Determine which slides to regenerate
  const targetSlides = selectedSlides
    ? slides.filter((s) => selectedSlides.has(s.number))
    : slides

  try {
    const res = await fetch("/api/generate/narration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slides: targetSlides.map((s) => ({ number: s.number, title: s.title, bullets: s.bullets })) }),
    })
    const json = await res.json()
    if (json.data?.narrations) {
      const merged = { ...narrations, ...json.data.narrations }
      setInternalNarrations(merged)
      onNarrationsChange?.(merged)
      setInternalAudioGenerated(true)
      onAudioGeneratedChange?.(true)
    }
  } catch { /* generation failed */ }

  // Clear changed status for regenerated slides
  if (selectedSlides) {
    const remaining = changedSlides.filter((s) => !selectedSlides.has(s))
    setInternalChangedSlides(remaining)
    onChangedSlidesChange?.(remaining)
  } else {
    setInternalChangedSlides([])
    onChangedSlidesChange?.([])
  }

  setShowRegenModal(false)
  setGenerating(false)
}
```

- [ ] **Step 4: Update textarea placeholder to show generating state**

In the narration textarea section, update the placeholder:

```typescript
placeholder={
  generatingNarrations
    ? "Generating AI narration..."
    : "AI-generated narration will appear here..."
}
```

- [ ] **Step 5: Update generate button text**

Change the button label:
- `generatingNarrations ? "Generating narrations..." : generating ? "Regenerating..." : "Generate Narration"`

- [ ] **Step 6: Verify compile**

Run: `cd frontend; npx tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add frontend/components/dashboard/SlideEditor.tsx
git commit -m "feat: wire real Gemini narration generation into SlideEditor"
```
