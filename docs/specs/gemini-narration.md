# Gemini AI Narration Generation

**Feature:** Auto-generate natural, conversational narration scripts from slide content using Google's Gemini 2.0 Flash model.

**Status:** Approved for implementation

---

## Problem

Currently the narration textarea shows placeholder text `"AI-generated narration will appear here..."` but no AI narration is ever generated. Users must manually write narration scripts for every slide. The landing page markets this feature as existing.

## Solution

### 1. API Route: `POST /api/generate/narration`

**Request:**
```json
{
  "slides": [
    {
      "number": 1,
      "title": "Climate Change Overview",
      "bullets": ["Global temperatures risen 1.1°C", "Key contributors: CO2, methane"]
    }
  ],
  "instructions": "Keep it conversational, like a TED talk.",
  "slideInstructions": {
    "3": "This slide has an important chart — describe it carefully",
    "12": "Thank you slide — wrap up warmly"
  }
}
```

**Response:**
```json
{
  "data": {
    "narrations": {
      "1": "Let's start with the big picture. Global temperatures have risen 1.1 degrees Celsius...",
      "3": "Take a look at this chart — it shows the stark rise in emissions over the last decade..."
    }
  }
}
```

**Error:** Standard `{ error: string }` envelope.

### 2. Gemini Integration

- **Model:** `gemini-2.0-flash`
- **SDK:** `@google/generative-ai`
- **API key:** `GEMINI_API_KEY` (already configured in `.env`)
- **Server-side only:** called from a Next.js API route, not the client

**System prompt:**
```
You are a professional voice-over narrator. Convert each slide into natural, conversational narration as if presenting to a live audience.

Rules:
- Speak naturally — don't read bullet points verbatim
- Vary sentence rhythm and tone
- For slides with few words (likely image-heavy), describe what the slide likely conveys
- For thank-you/closing slides, use a warm wrap-up tone
- For data slides, explain the numbers conversationally
- Keep each narration to 2-4 sentences
- Never say "slide 1 says" — just speak the content
- Don't use markdown or bullet indicators in the output
- Respond with a JSON object mapping slide numbers to narration strings
```

### 3. Auto-Generation Flow (Frontend)

After `parsePptxText` completes in SlideEditor's `useEffect`:
1. Slides are set in state as before
2. Automatically call `POST /api/generate/narration` with all slides
3. Set `generatingNarrations = true` — shows shimmer/loading state in textareas
4. On success: populate `narrations` state with the result
5. On error: show a small toast "AI narration failed — you can write them manually"
6. The "Generate Narration" button (currently a stub) becomes the **"Regenerate All"** button

### 4. Per-Slide Instruction UX

Each narration textarea gets a small collapsible "Context" section:
- A small link/button: "+ Add context for AI"
- When expanded: a small textarea (2 lines) where user types what the AI should know
- E.g., "This slide has an image of a graph showing revenue growth"
- Stored in parent state as `Record<number, string>`, persisted via auto-save
- Sent as `slideInstructions` in the API call

### 5. Existing Button Transition

| Old behavior | New behavior |
|---|---|
| Stub `setTimeout` 1.2s | Calls `/api/generate/narration` |
| "Generate Narration" | "Regenerate All Narrations" |
| Simulated success | Real API call with error handling |
| Loading: generic spinner | Per-textarea shimmer |

---

## Out of Scope

- Streaming narration (slides populate one by one) — would require SSE, overengineering for now
- Per-slide selective regeneration — whole deck only, user can manually edit individual narrations
- Audio generation — this is narration TEXT only (audio is wired separately later)

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/package.json` | Add `@google/generative-ai` dependency |
| `frontend/app/api/generate/narration/route.ts` | **New** — Gemini narration API route |
| `frontend/components/dashboard/SlideEditor.tsx` | Auto-trigger on parse, loading state, real API call |
| `frontend/components/dashboard/CreatePageSidebar.tsx` | Add per-slide instruction fields (optional, deferred to second pass) |
| `frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx` | Pass through slideInstructions state |

---

## Data Flow

```
PPTX uploaded
  → parsePptxText(file) → slides[]
  → setSlides(slides)
  → POST /api/generate/narration { slides }
    → Gemini 2.0 Flash processes all slides
    → Returns { narrations: { 1: "...", 2: "..." } }
  → setNarrations(narrations)
  → Textareas populated with AI-generated narration
  → User can edit any textarea
  → Auto-save persists narration edits
```
