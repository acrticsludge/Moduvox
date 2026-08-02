# Voice Clone Fix — Recorder Sample Rate + Remove Gender from Clone Flow — Design Spec

**Date:** 2026-08-02
**Status:** Approved

## Problem

Two related issues in the voice-clone flow:

1. **Recorder-produced clones fail on the backend** ("Failed to generate preview" in Test Voice; "Failed to generate audio" in slide generation). Uploading a clip works; using the inbuilt recorder fails.

2. **Gender selection in the clone step is misleading/redundant.** A cloned voice *is* the speaker's voice — gender is inherent. Asking the user to pick male/female/neutral is confusing, and per the user's decision it should be removed from the clone flow (presets keep their fixed gender).

## Root Cause (verified)

The user's initial hypothesis was gender, but investigation proved gender is **not** the cause:

- Both upload and recorder send the **identical** `gender` field to `/api/voices/upload/confirm`.
- **Cloned voices never use gender in TTS**: `/api/generate/test`, `/api/generate/audio/slide`, and `/lib/generate-preview.ts` all pass only `control_instruction` for `type === "cloned"`. Gender only flows into `buildVoiceDescription` for **preset** voices.
- Therefore gender cannot break clone features.

The real difference is the **audio file** the recorder produces:

- `VoiceRecorder.tsx:13` hardcodes `targetSampleRate = 16000` in `convertToWav` — the recorded clip is downsampled to **16 kHz mono** before upload.
- Uploaded clips keep their **native sample rate** (typically 44.1/48 kHz).
- VoxCPM2's reference-audio pipeline expects native/higher-rate audio; empirical testing confirms uploads work while 16 kHz recorder clones fail. The `convertToWav` step (added in `3a93040`) was intended to fix WebM/Opus incompatibility but over-corrected by forcing 16 kHz.
- Secondary risk: `VoiceRecorder.tsx:182-186` silently falls back to a `.webm` blob if WAV conversion throws, which then gets re-labeled `audio.wav` at the Gradio boundary → guaranteed decode failure.

## Goals

- Recorder-produced voice samples match what uploads produce (native sample rate WAV), so cloning works from the inbuilt recorder.
- Remove the gender picker from the Clone Your Voice step.
- Stop sending `gender` on the clone confirm call (stored as `null`).
- No behavior change for preset voices or the editor.

## Non-goals

- Preset voice flow, editor, narration, R2/VoxCPM infrastructure, DB schema (gender column stays nullable — no migration needed).

## Design

### 1. VoiceRecorder — preserve native sample rate

`frontend/components/dashboard/VoiceRecorder.tsx`:

- In `convertToWav`, remove the forced 16 kHz resampling. Use the **decoded audio's native sample rate** for the WAV header and PCM data. Keep:
  - Mono downmix (safe, matches VoxCPM expectations).
  - 16-bit PCM WAV packaging.
  - The WebM→WAV conversion (still needed for format compatibility) — but at native rate.
- Remove the now-unused `targetSampleRate` constant.
- Update the comment to reflect native-rate conversion.
- Keep the existing fallback behavior (if conversion throws, use original blob) — but update its filename/type handling only if trivially correct; the primary fix removes the failure trigger.

### 2. Clone flow — remove gender picker + gender payload

`frontend/app/dashboard/voices/page.tsx`:

- In the clone step (`step === "clone"`), remove the "Voice gender" selection block (the three male/female/neutral buttons at lines ~828-849).
- In `handleUploadClone`, remove `gender: voiceGender || null` from the `/api/voices/upload/confirm` body (the confirm route stores `gender: gender || null`, so omitting it yields `null`).
- `voiceGender` state stays (still used by the preset step and preset selection) — do not remove the state, only its clone-step usage.

### 3. API route — no change required

`/api/voices/upload/confirm` already accepts `gender` as optional/nullable. Omitting the field produces `gender: null` on the cloned voice. No route change needed.

## Files touched

| File | Change |
|---|---|
| `frontend/components/dashboard/VoiceRecorder.tsx` | Remove 16 kHz downsample; use native sample rate |
| `frontend/app/dashboard/voices/page.tsx` | Remove gender picker from clone step; drop gender from clone confirm body |

## Testing / verification

- `npm run type-check` from `frontend/` → clean.
- `npm run build` from `frontend/` → success.
- Unit tests (`voice-description.test.ts`, `image-analysis.test.ts`) → still pass.
- Final code review over the diff.
- Manual smoke (if dev server available): record via inbuilt recorder → clone → Test Voice generates preview; slide audio generation works. Gender picker absent from clone step.
