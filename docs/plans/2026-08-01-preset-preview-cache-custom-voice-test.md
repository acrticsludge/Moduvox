# Preset Preview R2 Cache + Custom Voice Test Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cache preset voice previews in R2 so only the first play generates TTS and all later plays (any user) are served from R2; add a non-cached "Test voice" button to custom voice creation; make the `gender` field actually shape generated audio.

**Architecture:** The existing `POST /api/generate/preset-preview` route gains an R2 cache layer with a deterministic key (`preset-previews/{presetId}.wav`) — cache-hit returns a signed R2 URL with zero TTS calls, cache-miss generates, uploads, and returns a signed URL. A new `POST /api/generate/custom-preview` route generates a one-time audition (no storage) for custom voices. A shared `buildVoiceDescription(instruction, gender)` helper folds gender into the tone prompt everywhere preset-style generation happens.

**Tech Stack:** Next.js App Router, TypeScript strict, Supabase, Cloudflare R2 (AWS SDK), VoxCPM2 TTS (Gradio), Zod, Node's built-in test runner (`node:test` via `tsx`).

**Spec:** `docs/specs/2026-08-01-preset-preview-cache-custom-voice-test-design.md`

---

## Notes for the executor

- All commands run from `frontend/` unless stated otherwise.
- **Tests use Node's built-in runner**, not vitest/jest. Run: `npx tsx --test lib/__tests__/<file>.test.ts`
- **Verification** is `npm run type-check` (tsc --noEmit) and `npm run build` for UI/route changes.
- There is a **pre-existing uncommitted change** in `frontend/components/dashboard/SlideEditor.tsx` (an unrelated audio-player refactor). Do NOT commit, revert, or "fix" it. If type-check surfaces errors, confirm they are only in that file; errors elsewhere are this feature's fault.
- The R2 helper functions (`fileExists`, `createDownloadUrl`, `uploadFile`) are already in `frontend/lib/r2.ts`. Reuse them — do not add new R2 code.
- Middleware already protects `/api/generate/:path*` — no middleware change is needed for the new route.

---

## Task 1: Add `buildVoiceDescription` helper (TDD)

**Files:**
- Modify: `frontend/lib/presets.ts`
- Test: `frontend/lib/__tests__/voice-description.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `frontend/lib/__tests__/voice-description.test.ts`:

```ts
/**
 * Unit tests for buildVoiceDescription in lib/presets.ts.
 *
 * Run: npx tsx --test lib/__tests__/voice-description.test.ts
 */

import { describe, it } from "node:test"
import assert from "node:assert"
import { buildVoiceDescription } from "../presets"

describe("buildVoiceDescription", () => {
  it("prepends a male prompt when gender is male and the instruction omits it", () => {
    assert.strictEqual(
      buildVoiceDescription("A calm, steady voice for training content.", "male"),
      "Speak with a male voice. A calm, steady voice for training content.",
    )
  })

  it("prepends a female prompt when gender is female and the instruction omits it", () => {
    assert.strictEqual(
      buildVoiceDescription("A calm, steady voice for training content.", "female"),
      "Speak with a female voice. A calm, steady voice for training content.",
    )
  })

  it("leaves the instruction unchanged when it already mentions the gender word", () => {
    const instruction = "A calm, professional male voice with clear enunciation."
    assert.strictEqual(buildVoiceDescription(instruction, "male"), instruction)
  })

  it("leaves the instruction unchanged for neutral gender", () => {
    const instruction = "A gentle, measured voice."
    assert.strictEqual(buildVoiceDescription(instruction, "neutral"), instruction)
  })

  it("leaves the instruction unchanged for null gender", () => {
    const instruction = "A gentle, measured voice."
    assert.strictEqual(buildVoiceDescription(instruction, null), instruction)
  })

  it("returns just the gender prompt when the instruction is empty", () => {
    assert.strictEqual(buildVoiceDescription("", "female"), "Speak with a female voice.")
  })

  it("returns the fallback when both instruction and gender are empty", () => {
    assert.strictEqual(
      buildVoiceDescription(null, null),
      "Natural, clear, professional speaking voice",
    )
  })

  it("uses the provided fallback when both instruction and gender are empty", () => {
    assert.strictEqual(
      buildVoiceDescription(null, null, "Custom fallback"),
      "Custom fallback",
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test lib/__tests__/voice-description.test.ts`
Expected: FAIL — `buildVoiceDescription` is not exported from `../presets` (ReferenceError / TypeError).

- [ ] **Step 3: Implement the helper**

In `frontend/lib/presets.ts`, append (after the existing `GENDER_LABELS` / `getPreset` exports):

```ts
const MALE_GENDER_RE = /\bmale\b/i
const FEMALE_GENDER_RE = /\bfemale\b/i

/**
 * Build the tone-instruction text for a voice from its control instruction and
 * gender. Prepends an explicit gender prompt only when the gender is male or
 * female AND the instruction does not already mention that gender word.
 * Neutral and already-specified cases use the instruction unchanged.
 */
export function buildVoiceDescription(
  controlInstruction: string | null | undefined,
  gender: string | null | undefined,
  fallback = "Natural, clear, professional speaking voice",
): string {
  const text = controlInstruction?.trim() ?? ""

  if (gender === "male" || gender === "female") {
    const alreadyMentioned =
      gender === "male" ? MALE_GENDER_RE.test(text) : FEMALE_GENDER_RE.test(text)

    if (!alreadyMentioned) {
      const prefix =
        gender === "male" ? "Speak with a male voice." : "Speak with a female voice."
      return text ? `${prefix} ${text}` : prefix
    }
  }

  return text || fallback
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test lib/__tests__/voice-description.test.ts`
Expected: PASS — 8/8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/presets.ts lib/__tests__/voice-description.test.ts
git commit -m "feat: add buildVoiceDescription helper for gender-aware voice prompts"
```

---

## Task 2: Cache preset previews in R2

**Files:**
- Modify: `frontend/app/api/generate/preset-preview/route.ts` (replace whole file body after imports)

- [ ] **Step 1: Replace the route with the cache layer**

Replace `frontend/app/api/generate/preset-preview/route.ts` with:

```ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { generateWithPreset } from "@/lib/voxcpm"
import { createDownloadUrl, fileExists, uploadFile } from "@/lib/r2"
import { PRESET_VOICE_MAP } from "@/lib/presets"
import { withApiHandler } from "@/lib/api-handler"

const previewSchema = z.object({
  presetId: z.enum(["calm-female", "energetic-male", "soft-narrator", "professional-tone", "warm-friendly"]),
}).strict()

const EXAMPLE_TEXT =
  "At Moduvox, we turn slides into narrated training videos using your own voice. This preview shows how this preset voice sounds."

// Shared R2 cache for preset previews. The key is deterministic per preset, so
// any user's first play seeds the cache and every later play (any user) is
// served from R2 without a TTS call. If EXAMPLE_TEXT ever changes, bump this
// prefix (e.g. "preset-previews/v2").
const PRESET_PREVIEW_PREFIX = "preset-previews"

function presetPreviewKey(presetId: string): string {
  return `${PRESET_PREVIEW_PREFIX}/${presetId}.wav`
}

export const POST = withApiHandler(async (request: Request) => {
  const body = await request.json()
  const parsed = previewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const { presetId } = parsed.data
  const description = PRESET_VOICE_MAP[presetId]
  if (!description) {
    return NextResponse.json({ error: "Invalid preset" }, { status: 400 })
  }

  const key = presetPreviewKey(presetId)

  // ── Cache hit: serve from R2 — no TTS call ─────────────
  const exists = await fileExists(key)
  if (exists.success && exists.data) {
    const cachedUrl = await createDownloadUrl(key, 3600)
    if (cachedUrl) {
      return NextResponse.json({ data: { audioUrl: cachedUrl } })
    }
  }

  // ── Cache miss: generate, cache, then serve ────────────
  try {
    const result = await generateWithPreset(EXAMPLE_TEXT, description)

    if (!result.audioUrl) {
      return NextResponse.json({ error: "Generated audio URL is empty" }, { status: 502 })
    }

    // Download the generated audio from VoxCPM2's temporary URL and cache it.
    // Any failure here (download timeout, empty buffer, R2 upload error) falls
    // back to the temp URL — the audio still plays this once.
    try {
      const audioRes = await Promise.race([
        fetch(result.audioUrl),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Download timed out after 30s")), 30_000),
        ),
      ])
      if (!audioRes.ok) throw new Error(`HTTP ${audioRes.status}`)

      const audioBuffer = Buffer.from(await audioRes.arrayBuffer())
      if (audioBuffer.length === 0) throw new Error("Empty audio buffer")

      const uploadResult = await uploadFile(key, audioBuffer, "audio/wav")
      if (uploadResult.success) {
        const audioUrl = await createDownloadUrl(key, 3600)
        if (audioUrl) {
          return NextResponse.json({ data: { audioUrl } })
        }
      }
    } catch (cacheErr) {
      console.warn(
        "[PresetPreview] Caching failed, using temp URL:",
        cacheErr instanceof Error ? cacheErr.message : String(cacheErr),
      )
    }

    return NextResponse.json({ data: { audioUrl: result.audioUrl } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate preview"
    console.error("[PresetPreview] ERROR:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
```

- [ ] **Step 2: Verify types**

Run: `npm run type-check`
Expected: PASS (no errors in `app/api/generate/preset-preview/route.ts`).

- [ ] **Step 3: Commit**

```bash
git add app/api/generate/preset-preview/route.ts
git commit -m "feat: cache preset previews in R2, serve replays from R2"
```

---

## Task 3: New `POST /api/generate/custom-preview` route

**Files:**
- Create: `frontend/app/api/generate/custom-preview/route.ts`

- [ ] **Step 1: Create the route**

Create `frontend/app/api/generate/custom-preview/route.ts`:

```ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { generateWithPreset } from "@/lib/voxcpm"
import { buildVoiceDescription } from "@/lib/presets"
import { withApiHandler } from "@/lib/api-handler"

const customPreviewSchema = z.object({
  controlInstruction: z.string().min(1, "Control instruction is required").max(500),
  gender: z.enum(["male", "female", "neutral"]).nullable().default(null),
}).strict()

const EXAMPLE_TEXT =
  "At Moduvox, we turn slides into narrated training videos using your own voice. This preview shows how your presentation will sound."

export const POST = withApiHandler(async (request: Request) => {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = customPreviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const { controlInstruction, gender } = parsed.data
  const description = buildVoiceDescription(controlInstruction, gender)

  try {
    const result = await generateWithPreset(EXAMPLE_TEXT, description)

    if (!result.audioUrl) {
      return NextResponse.json({ error: "Generated audio URL is empty" }, { status: 502 })
    }

    // Deliberately NOT cached or stored — this is a one-time audition before the
    // user creates the voice. Creating the voice caches a real preview via
    // generateVoicePreview.
    return NextResponse.json({ data: { audioUrl: result.audioUrl } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate preview"
    console.error("[CustomPreview] ERROR:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
```

- [ ] **Step 2: Verify types**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/api/generate/custom-preview/route.ts
git commit -m "feat: add custom voice preview route for one-time audition"
```

---

## Task 4: Apply gender in saved-voice preview caching

**Files:**
- Modify: `frontend/lib/generate-preview.ts`

- [ ] **Step 1: Add `gender` to the VoiceRecord type**

In `frontend/lib/generate-preview.ts`, extend the `VoiceRecord` type (around line 14):

```ts
type VoiceRecord = {
  id: string
  user_id: string
  type: "preset" | "cloned"
  preset_id: string | null
  control_instruction: string | null
  sample_path: string | null
  gender: string | null
}
```

- [ ] **Step 2: Import the helper**

Change the import on line 9 from:

```ts
import { PRESET_VOICE_MAP } from "@/lib/presets"
```

to:

```ts
import { PRESET_VOICE_MAP, buildVoiceDescription } from "@/lib/presets"
```

- [ ] **Step 3: Use the helper in the preset branch**

Replace lines 31-34 (the `if (voice.type === "preset")` block):

```ts
    if (voice.type === "preset") {
      const description = voice.control_instruction
        ?? (voice.preset_id ? PRESET_VOICE_MAP[voice.preset_id] : PRESET_VOICE_MAP["calm-female"])
        ?? PRESET_VOICE_MAP["calm-female"]

      result = await generateWithPreset(EXAMPLE_TEXT, description)
```

with:

```ts
    if (voice.type === "preset") {
      const description = buildVoiceDescription(
        voice.control_instruction
          ?? (voice.preset_id ? PRESET_VOICE_MAP[voice.preset_id] : PRESET_VOICE_MAP["calm-female"])
          ?? PRESET_VOICE_MAP["calm-female"],
        voice.gender,
      )

      result = await generateWithPreset(EXAMPLE_TEXT, description)
```

- [ ] **Step 4: Verify types**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/generate-preview.ts
git commit -m "feat: apply gender to saved-voice preview generation"
```

---

## Task 5: Apply gender in per-slide audio generation

**Files:**
- Modify: `frontend/app/api/generate/audio/slide/route.ts`

- [ ] **Step 1: Import the helper**

Add to the imports (after line 10):

```ts
import { buildVoiceDescription } from "@/lib/presets"
```

- [ ] **Step 2: Use the helper in the preset branch**

Replace line 68 (the `else` branch of the `voice?.type === "cloned"` check):

```ts
        voiceDesc = voice?.control_instruction || voice_description || "Natural, clear, professional speaking voice"
```

with:

```ts
        voiceDesc = buildVoiceDescription(voice?.control_instruction, voice?.gender, voice_description || "Natural, clear, professional speaking voice")
```

> The cloned branch (line 63) stays unchanged — the reference sample is authoritative for clones.

- [ ] **Step 3: Verify types**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/api/generate/audio/slide/route.ts
git commit -m "feat: apply gender to per-slide audio generation"
```

---

## Task 6: Apply gender in the test-voice route

**Files:**
- Modify: `frontend/app/api/generate/test/route.ts`

- [ ] **Step 1: Import the helper**

Change the import on line 7:

```ts
import { PRESET_VOICE_MAP } from "@/lib/presets"
```

to:

```ts
import { PRESET_VOICE_MAP, buildVoiceDescription } from "@/lib/presets"
```

- [ ] **Step 2: Use the helper in the preset branch**

Replace lines 76-79 (the `description` computation inside the `if (voice.type === "preset")` block):

```ts
      const description = voice.control_instruction
        ?? (voice.preset_id
          ? (PRESET_VOICE_MAP[voice.preset_id] ?? PRESET_VOICE_MAP["calm-female"])
          : PRESET_VOICE_MAP["calm-female"])

      console.log("[TestVoice] Generating with preset:", voice.preset_id, "→", description.slice(0, 60))
```

with:

```ts
      const description = buildVoiceDescription(
        voice.control_instruction
          ?? (voice.preset_id
            ? (PRESET_VOICE_MAP[voice.preset_id] ?? PRESET_VOICE_MAP["calm-female"])
            : PRESET_VOICE_MAP["calm-female"]),
        voice.gender,
      )

      console.log("[TestVoice] Generating with preset:", voice.preset_id, "→", description.slice(0, 60))
```

- [ ] **Step 3: Verify types**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/api/generate/test/route.ts
git commit -m "feat: apply gender to test-voice preview generation"
```

---

## Task 7: Add "Test voice" button to custom voice creation

**Files:**
- Modify: `frontend/app/dashboard/voices/page.tsx` (inside `AddVoiceModal`)

- [ ] **Step 1: Add state**

After line 229 (`const previewAudioRef = useRef<HTMLAudioElement | null>(null)`), add:

```ts
  const [customPreviewLoading, setCustomPreviewLoading] = useState(false)
  const [customPreviewUrl, setCustomPreviewUrl] = useState<string | null>(null)
```

- [ ] **Step 2: Add the handler**

After the closing of `handlePresetPreview` (after line 328, before `async function handleUploadClone`), add:

```ts
  async function handleCustomPreview() {
    setCustomPreviewLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/generate/custom-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          controlInstruction: controlInstruction.trim(),
          gender: voiceGender || null,
        }),
      })
      const json = await res.json()
      if (!json.data?.audioUrl) {
        throw new Error(typeof json.error === "string" ? json.error : "Failed to generate preview")
      }
      setCustomPreviewUrl(json.data.audioUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setCustomPreviewLoading(false)
    }
  }
```

- [ ] **Step 3: Add the button + player UI**

Inside the custom-voice block, after the hint `<p>` that reads `This instruction will be pre-filled and locked when you use this voice in the editor.` (the `<p>` right after the `<textarea>` inside the `!selectedPreset ? (...)` branch), add:

```tsx
                {/* Test voice — one-time audition, nothing cached */}
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCustomPreview}
                    disabled={
                      customPreviewLoading ||
                      !voiceName.trim() ||
                      !voiceGender ||
                      !controlInstruction.trim()
                    }
                    className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-[#18181B] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {customPreviewLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Volume2 className="h-4 w-4" strokeWidth={1.5} />
                    )}
                    {customPreviewLoading ? "Generating..." : "Test voice"}
                  </button>
                  {customPreviewUrl && (
                    <audio
                      key={customPreviewUrl}
                      controls
                      autoPlay
                      src={customPreviewUrl}
                      className="h-9 min-w-0 flex-1 rounded-lg"
                    >
                      Your browser does not support the audio element.
                    </audio>
                  )}
                </div>
```

> `Volume2` and `Loader2` are already imported (line 4). No import changes needed.

- [ ] **Step 4: Verify types and build**

Run: `npm run type-check`
Expected: PASS.

Run: `npm run build`
Expected: PASS (if the ONLY error is a pre-existing one in `SlideEditor.tsx`, that is unrelated to this task — leave it).

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/voices/page.tsx
git commit -m "feat: add test voice button to custom voice creation"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run the full unit test suite**

Run: `npx tsx --test lib/__tests__/voice-description.test.ts`
Expected: PASS — 8/8.

- [ ] **Step 2: Type-check the whole app**

Run: `npm run type-check`
Expected: PASS, or only pre-existing errors in `frontend/components/dashboard/SlideEditor.tsx` (an unrelated uncommitted change).

- [ ] **Step 3: Manual smoke test (requires dev server + env)**

Start: `npm run dev`

1. Open `/dashboard/voices` → Add Voice → Choose a Preset.
2. Click play on a built-in preset → audio generates and plays. Server log shows a generation (`[PresetPreview]` / `[VoxCPM] GRADIO` lines) and an R2 upload (`[R2] Uploaded: preset-previews/{presetId}.wav`).
3. Close modal, reopen, click the same preset's play → plays instantly; server log shows **no** `[VoxCPM]` call (cache hit, only `[R2]` signed URL lines).
4. Go to "or create your own" → leave name/gender/instruction empty → "Test voice" button is disabled. Fill all three → button enables.
5. Click "Test voice" → generates and auto-plays an inline player. No `[R2] Uploaded` log for it (not cached).
6. Create the custom voice with gender "female" and an instruction that does not mention gender → the saved voice's preview (Test modal) uses the "Speak with a female voice." prefix (server log shows the description).
7. Confirm the modal errors banner shows a friendly message if generation fails.

- [ ] **Step 4: Update LESSONS.md if anything non-obvious was learned**

If the execution surfaced a gotcha (e.g., R2 cache race, gender-helper edge case), prepend a `LESSONS.md` entry and commit it in the same commit as the fix.
