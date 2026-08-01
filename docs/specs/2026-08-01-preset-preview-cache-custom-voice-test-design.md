# Design: Preset Preview Caching (R2) + Custom Voice Test Audio

**Date:** 2026-08-01
**Status:** Approved
**Area:** Voices (preset modal, custom voice creation)

## Problem

1. **Preset previews are regenerated every play.** `POST /api/generate/preset-preview` runs a fresh VoxCPM2 TTS inference each time a user clicks the play button beside a built-in preset in the "Choose a Preset" modal. Every user pays the full generation latency and TTS cost for the exact same audio.
2. **Custom voice creation has no audition step.** A user building a custom voice (name + gender + control instruction) must create the voice before hearing how it sounds. The control instruction is hard to get right blind.

## Goals

- Cache generated preset preview audio in R2 so the first play generates it and every subsequent play (by any user) is served from R2 — no new TTS call.
- Add a "Test voice" button in the custom-voice creation section. It generates a one-time audio preview the user can hear and iterate on. **Not cached or stored** — the saved voice already gets a cached preview at creation via `generateVoicePreview`.
- Make the `gender` field actually affect generation (currently stored as metadata only). Applied consistently so the test matches the saved voice.

## Non-Goals

- No pre-warming of preset previews at deploy time.
- No client-side audio caching.
- No changes to cloned-voice generation (reference sample is authoritative — gender prompt would conflict).

## Design

### 1. Shared voice-description helper

New function in `frontend/lib/presets.ts` (home of `GENDER_LABELS`):

```ts
/**
 * Build the tone-instruction text for a voice given its control instruction
 * and gender. Gender is prepended as an explicit prompt only when it is
 * male/female AND the instruction doesn't already mention that gender word.
 * Neutral and already-specified cases use the instruction unchanged.
 */
export function buildVoiceDescription(
  controlInstruction: string | null | undefined,
  gender: string | null | undefined,
): string {
  const text = controlInstruction?.trim() ?? ""
  if (gender === "male" || gender === "female") {
    const alreadyMentioned =
      gender === "male" ? /\bmale\b/i.test(text) : /\bfemale\b/i.test(text)
    if (!alreadyMentioned) {
      const prefix =
        gender === "male" ? "Speak with a male voice." : "Speak with a female voice."
      return text ? `${prefix} ${text}` : prefix
    }
  }
  return text || "Natural, clear, professional speaking voice"
}
```

**Applied only in preset-style generation (no reference sample):**
- New custom-preview route (below).
- `lib/generate-preview.ts` — preset branch (`voice.control_instruction` + `voice.gender`). `VoiceRecord` gains `gender`.
- `app/api/generate/audio/slide/route.ts` — preset branch (`voice.control_instruction` + `voice.gender`).
- `app/api/generate/test/route.ts` — preset branch.

**Not applied** to cloned voices in any path.

### 2. Preset preview caching (R2)

`POST /api/generate/preset-preview` gains a cache layer. Key scheme: `preset-previews/{presetId}.wav` (shared across users — no user prefix). The `EXAMPLE_TEXT` constant is fixed; if it ever changes, bump the key prefix (e.g. `preset-previews/v2/`).

```
1. zod-validate { presetId }  (unchanged schema)
2. fileExists("preset-previews/{presetId}.wav")
   ├─ hit → createDownloadUrl(key, 3600) → { data: { audioUrl } }     // no TTS
   └─ miss →
        generateWithPreset(EXAMPLE_TEXT, PRESET_VOICE_MAP[presetId])
        download audio buffer
        uploadFile(key, buffer, "audio/wav")
        createDownloadUrl(key, 3600) → { data: { audioUrl } }
        on R2 upload failure → fall back to temp Gradio URL (same as test route)
```

- Response shape unchanged (`{ data: { audioUrl } }`) — the modal needs zero changes.
- Concurrent first-play race: acceptable. Generation is deterministic (fixed seed), R2 is last-write-wins, content identical.
- Signed URLs already expire (3600s); clients re-request via the same route on replay.

### 3. New route: `POST /api/generate/custom-preview`

`frontend/app/api/generate/custom-preview/route.ts`:

```
zod: { controlInstruction: string (min 1, max 500), gender: "male" | "female" | "neutral" | null }
auth: explicit supabase auth check (consistent with /api/generate/test)
description = buildVoiceDescription(controlInstruction, gender)
result = generateWithPreset(EXAMPLE_TEXT, description)   // same text as test route
return { data: { audioUrl: result.audioUrl } }           // temp Gradio URL
```

- **No R2 upload, no DB write.** One-time audition only.
- Error handling mirrors preset-preview route (500 with generic message, 502 on empty URL).
- Protected by existing middleware matcher `/api/generate/:path*` — no middleware change.

### 4. UI: test button in AddVoiceModal

`frontend/app/dashboard/voices/page.tsx`, inside the custom-voice section (`!selectedPreset`), below the control-instruction textarea.

State: `customPreviewLoading: boolean`, `customPreviewUrl: string | null`.

- Button "Test voice" (Volume2 icon), enabled only when **all three** fields are filled: `voiceName.trim()`, `voiceGender`, `controlInstruction.trim()`.
- On click → POST custom-preview → on success store `customPreviewUrl` → render inline `<audio controls autoPlay src={customPreviewUrl}>`.
- Loading state on the button ("Generating..."), errors via existing `setError` banner.
- Re-testing after editing the instruction replaces the previous player. Modal close discards state (temp URL, nothing persisted).

## Data Flow

### Preset preview (first play)
```
user clicks ▶ on a built-in preset
  → POST /api/generate/preset-preview { presetId }
  → R2 miss → VoxCPM2 generate → buffer → upload preset-previews/{presetId}.wav
  → signed R2 URL → plays
```

### Preset preview (any later play, any user)
```
user clicks ▶ on the same preset
  → POST /api/generate/preset-preview { presetId }
  → R2 hit → signed R2 URL → plays (no TTS call)
```

### Custom voice test
```
user fills name + gender + control instruction
  → "Test voice" button → POST /api/generate/custom-preview { controlInstruction, gender }
  → buildVoiceDescription → VoxCPM2 generate → temp URL → inline player (nothing stored)
  → user edits instruction → test again → create when happy (creation caches a real preview)
```

## Files Touched

| File | Change |
|------|--------|
| `frontend/lib/presets.ts` | Add `buildVoiceDescription` |
| `frontend/app/api/generate/preset-preview/route.ts` | R2 cache layer (check → generate → upload → signed URL) |
| `frontend/app/api/generate/custom-preview/route.ts` | **New** route |
| `frontend/lib/generate-preview.ts` | Add `gender` to `VoiceRecord`; apply helper in preset branch |
| `frontend/app/api/generate/audio/slide/route.ts` | Apply helper in preset branch |
| `frontend/app/api/generate/test/route.ts` | Apply helper in preset branch |
| `frontend/app/dashboard/voices/page.tsx` | Test button + inline player in modal |

## Error Handling

- Preset preview: R2 upload failure → return temp Gradio URL (audio still plays this once). R2 check failures treated as miss → regenerate.
- Custom preview: match preset-preview error shape (500 generic, 502 empty URL, 422 validation).
- UI: generation errors shown via the existing error banner in the modal; button re-enabled for retry.

## Security

- New route does explicit auth check (middleware already covers `/api/generate/:path*`).
- R2 keys derive from validated `presetId` enum only — no path traversal surface.
- No secrets, no user data in cache keys.

## Verification

- [ ] Preset preview: first play generates; second play (same + different user) returns R2 URL without a TTS call (server log shows cache hit).
- [ ] R2 bucket contains `preset-previews/{presetId}.wav` after first play.
- [ ] Custom voice test button disabled until name + gender + instruction filled; generates + plays inline; no R2/DB write for the test.
- [ ] Saved custom voice with gender "female" (instruction not mentioning gender) produces an audio preview that differs from no-gender baseline and matches the creation test.
- [ ] Existing preset preview flow still works for users already logged in (no auth regressions).
