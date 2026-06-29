# VoxCPM2 Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate VoxCPM2 via HuggingFace Gradio API so the system can generate narration audio from text + voice sample + tone instructions (Standard mode) or raw clone (Ultimate mode).

**Architecture:** A `lib/voxcpm.ts` service module wraps the `@gradio/client` calls to the public HF Space (`openbmb/VoxCPM-Demo`). An API route `/api/generate/audio` accepts generation requests and returns the synthesized audio. Voice samples are capped at 50 seconds (VoxCPM2 limit). Preset voices use VoxCPM2's Voice Design mode (description-based, no reference audio).

**Tech Stack:** `@gradio/client` (npm), VoxCPM2 HF Space, Supabase Storage (voice samples), Next.js API routes.

**Prerequisites:** Voice creation UI + API already built (`/dashboard/voices`, `/api/voices/upload`, `/api/voices`). Voice samples stored in `voice-samples` Storage bucket.

**VoxCPM2 API Reference (from HF Space config):**
- Endpoint: `openbmb/VoxCPM-Demo` via Gradio client
- API name: `generate`
- Inputs: `target_text`, `control_instruction`, `reference_audio` (File), `ultimate_cloning_mode` (bool), `prompt_text`, `cfg_value` (1-3), `normalize` (bool), `ref_denoise` (bool)
- Output: Generated audio file
- Reference audio max: 50 seconds
- Three modes: Voice Design (no ref audio, uses control instruction), Controllable Cloning (ref audio + optional control instruction), Ultimate Cloning (ref audio + transcript, disables control instruction)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `frontend/lib/voxcpm.ts` | Create | VoxCPM2 service module wrapping Gradio API calls |
| `frontend/app/api/generate/audio/route.ts` | Create | API route for single-slide audio generation |
| `frontend/.env.example` | Modify (if exists) | Add `VOXCPM2_SPACE_ID` env var |
| `frontend/package.json` | Modify | Add `@gradio/client` dependency |

---

### Task 1: Install `@gradio/client`

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install the package**

```bash
cd frontend
npm install @gradio/client
```

- [ ] **Step 2: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "deps: add @gradio/client for VoxCPM2 integration"
```

---

### Task 2: Create VoxCPM2 service module

**Files:**
- Create: `frontend/lib/voxcpm.ts`

This module wraps all three VoxCPM2 modes. It provides a single `generateAudio()` function and specialized helpers for each mode.

- [ ] **Step 1: Write the service module**

```typescript
// frontend/lib/voxcpm.ts
import { Client } from "@gradio/client"
import type { FileData } from "@gradio/client"

const DEFAULT_SPACE_ID = process.env.VOXCPM2_SPACE_ID || "openbmb/VoxCPM-Demo"

export type VoxCPMInput = {
  /** The narration text to synthesize */
  targetText: string
  /** Reference audio file data (null for preset/voice-design mode) */
  referenceAudio?: File | null
  /** For Standard mode: tone/style instructions passed as control_instruction */
  toneInstructions?: string
  /** Ultimate cloning mode — preserves every nuance, disables toneInstructions */
  ultimateMode?: boolean
  /** Transcript of reference audio (auto-filled by ASR in ultimate mode, optional) */
  promptText?: string
  /** CFG guidance scale 1.0–3.0 (default 2.0). Higher = closer to reference. */
  cfgValue?: number
  /** Apply text normalization (default true) */
  normalize?: boolean
  /** Denoise reference audio before cloning (default false) */
  refDenoise?: boolean
}

export type VoxCPMResult = {
  /** URL to the generated audio file (hosted on HF Space, temporary) */
  audioUrl: string
  /** The raw FileData from Gradio response */
  fileData: FileData
}

/**
 * Generate audio using VoxCPM2 via the HuggingFace Gradio Space.
 *
 * Three modes based on inputs:
 * 1. Voice Design (preset) — no referenceAudio, uses toneInstructions as voice description
 * 2. Controllable Cloning (Standard) — referenceAudio + optional toneInstructions
 * 3. Ultimate Cloning — referenceAudio + ultimateMode=true (toneInstructions ignored)
 */
export async function generateAudio(input: VoxCPMInput): Promise<VoxCPMResult> {
  const {
    targetText,
    referenceAudio = null,
    toneInstructions = "",
    ultimateMode = false,
    promptText = "",
    cfgValue = 2.0,
    normalize = true,
    refDenoise = false,
  } = input

  const client = await Client.connect(DEFAULT_SPACE_ID)

  const result = await client.predict("/generate", {
    target_text: targetText,
    control_instruction: ultimateMode ? "" : toneInstructions,
    reference_audio: referenceAudio,
    ultimate_cloning_mode: ultimateMode,
    prompt_text: promptText,
    cfg_value: cfgValue,
    normalize: normalize,
    ref_denoise: refDenoise,
  })

  const fileData = result.data[0] as FileData

  return {
    audioUrl: fileData.url,
    fileData,
  }
}

/**
 * Generate audio using a preset voice description (Voice Design mode).
 * No reference audio needed — VoxCPM2 creates a voice from the description.
 */
export async function generateWithPreset(
  targetText: string,
  voiceDescription: string,
  cfgValue = 2.0,
): Promise<VoxCPMResult> {
  return generateAudio({
    targetText,
    toneInstructions: voiceDescription,
    cfgValue,
  })
}

/**
 * Generate audio with a cloned voice + optional tone instructions (Standard mode).
 */
export async function generateWithClone(
  targetText: string,
  referenceAudio: File,
  toneInstructions = "",
  cfgValue = 2.0,
): Promise<VoxCPMResult> {
  return generateAudio({
    targetText,
    referenceAudio,
    toneInstructions,
    cfgValue,
    ultimateMode: false,
  })
}

/**
 * Generate audio in Ultimate Cloning mode.
 * Preserves every nuance of the reference. toneInstructions are ignored by VoxCPM2.
 */
export async function generateUltimateClone(
  targetText: string,
  referenceAudio: File,
  promptText = "",
  cfgValue = 2.0,
): Promise<VoxCPMResult> {
  return generateAudio({
    targetText,
    referenceAudio,
    ultimateMode: true,
    promptText,
    cfgValue,
  })
}
```

- [ ] **Step 2: Add env var reference**

If `.env.example` exists, add:
```
VOXCPM2_SPACE_ID=openbmb/VoxCPM-Demo
```

If it doesn't exist, skip this step (the default is used in code).

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/voxcpm.ts
git commit -m "feat: add VoxCPM2 service module with generateAudio"
```

---

### Task 3: Create `/api/generate/audio` API route

**Files:**
- Create: `frontend/app/api/generate/audio/route.ts`

This route accepts a POST with JSON body (for preset mode) or FormData (for clone mode with file upload). It calls the VoxCPM2 service and returns the generated audio.

```typescript
// frontend/app/api/generate/audio/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateAudio, generateWithPreset } from "@/lib/voxcpm"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const contentType = request.headers.get("content-type") || ""

  if (contentType.includes("multipart/form-data")) {
    // ── Clone mode (with audio file) ─────────────────
    const formData = await request.formData()
    const targetText = formData.get("target_text") as string | null
    const audioFile = formData.get("audio") as File | null
    const toneInstructions = formData.get("tone_instructions") as string | null
    const ultimateMode = formData.get("ultimate_mode") === "true"
    const cfgValue = parseFloat(formData.get("cfg_value") as string) || 2.0

    if (!targetText?.trim()) {
      return NextResponse.json({ error: "target_text is required" }, { status: 400 })
    }
    if (!audioFile) {
      return NextResponse.json({ error: "audio file is required for clone mode" }, { status: 400 })
    }

    try {
      const result = await generateAudio({
        targetText: targetText.trim(),
        referenceAudio: audioFile,
        toneInstructions: toneInstructions?.trim() || "",
        ultimateMode,
        cfgValue,
      })
      return NextResponse.json({ data: result })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Audio generation failed"
      return NextResponse.json({ error: message }, { status: 502 })
    }
  } else {
    // ── Preset / voice-design mode (JSON body) ───────
    const body = await request.json()
    const { target_text, voice_description, cfg_value } = body

    if (!target_text?.trim()) {
      return NextResponse.json({ error: "target_text is required" }, { status: 400 })
    }
    if (!voice_description?.trim()) {
      return NextResponse.json({ error: "voice_description is required for preset mode" }, { status: 400 })
    }

    try {
      const result = await generateWithPreset(
        target_text.trim(),
        voice_description.trim(),
        parseFloat(cfg_value) || 2.0,
      )
      return NextResponse.json({ data: result })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Audio generation failed"
      return NextResponse.json({ error: message }, { status: 502 })
    }
  }
}
```

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p frontend/app/api/generate/audio
```

Then write the content above.

- [ ] **Step 2: Commit**

```bash
git add frontend/app/api/generate/audio/route.ts
git commit -m "feat: add POST /api/generate/audio for single-slide narration"
```

---

### Task 4: Update sample duration limit for VoxCPM2 compatibility

**Files:**
- Modify: `frontend/app/api/voices/upload/route.ts`
- Modify: `frontend/app/dashboard/voices/page.tsx`

VoxCPM2's Gradio Space accepts reference audio up to **50 seconds**. The PRD and current UI say 30s–3min. Update to 30–50 seconds.

- [ ] **Step 1: Update the upload API route comment (max file size is fine at 10MB)**

No code change needed for the file size. The 10MB limit is fine. The validation is in the frontend text only.

- [ ] **Step 2: Update the UI text in the clone step**

In `frontend/app/dashboard/voices/page.tsx`, find:
```
WAV, MP3, or M4A · 30 seconds to 3 minutes · Max 10MB
```
Replace with:
```
WAV, MP3, or M4A · 30 to 50 seconds · Max 10MB
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/dashboard/voices/page.tsx
git commit -m "fix: update voice sample limit to 50s for VoxCPM2 compatibility"
```

---

### Task 5: Full build check

- [ ] **Step 1: Build**

```bash
cd frontend
npm run build
```

Expected: "Compiled successfully" with no TypeScript errors. New routes: `ƒ /api/generate/audio`.

- [ ] **Step 2: Push**

```bash
git push origin main
```

---

## Self-Review

**Spec coverage:**
- `@gradio/client` installed ✓ (Task 1)
- VoxCPM2 service module with all three modes ✓ (Task 2)
- API route for single-slide audio generation ✓ (Task 3)
- Sample duration updated to 50s max ✓ (Task 4)

**Placeholder scan:** No TODOs, no TBDs. All error handling is present (auth check, validation, try/catch with 502 on API failure).

**Type consistency:** `VoxCPMInput` type is self-contained. The `generateAudio` function has sensible defaults. The three helper functions (`generateWithPreset`, `generateWithClone`, `generateUltimateClone`) match VoxCPM2's three documented modes.

**Future integration points:**
- The full generation pipeline (PPTX → Gemini → per-slide audio) will call this API route for each slide
- The slide editor's "Generate Audio" button will POST to `/api/generate/audio` with the narration text and selected voice
- Per-slide audio files returned by VoxCPM2 are temporary HF Space URLs — they need to be downloaded and stored in Supabase Storage for persistence. That step is part of the full pipeline, not this task.

**Edge cases covered:**
- Unauthenticated → 401
- Missing target_text → 400
- Clone mode without audio file → 400
- Preset mode without voice_description → 400
- VoxCPM2 API failure → 502 with error message
