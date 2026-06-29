# VoxSlides Voice Clone Backend

> Documentation for the voice cloning and text-to-speech (TTS) backend used by VoxSlides.
> Version: 1.0.0 | Last updated: 2026-06-23

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [API Reference](#2-api-reference)
   - [2.1 POST /api/v1/tts/voxcpm2 (Primary)](#21-post-apiv1ttsvoxcpm2-primary)
   - [2.2 POST /api/v1/tts (Legacy / ElevenLabs)](#22-post-apiv1tts-legacy)
   - [2.3 GET /api/v1/tts/voxcpm2/debug (Diagnostic)](#23-get-apiv1ttsvoxcpm2debug-diagnostic)
3. [Core Library: lib/voxcpm2.ts](#3-core-library-libvoxcpm2ts)
4. [Script Parsing: lib/script-utils.ts](#4-script-parsing-libscript-utilsts)
5. [Emotion System](#5-emotion-system)
6. [External Integrations](#6-external-integrations)
7. [Environment Variables](#7-environment-variables)
8. [Security & Configuration](#8-security--configuration)
9. [Frontend Components (Brief)](#9-frontend-components-brief)
10. [Testing](#10-testing)
11. [Deployment Checklist](#11-deployment-checklist)

---

## 1. Architecture Overview

The VoxSlides voice clone backend converts written scripts (with optional emotion tags) into spoken audio, with optional voice cloning from a user-provided voice sample. The system has **two parallel TTS routes**, though only one is currently used by the frontend.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React)                          │
│                                                                 │
│  VoiceRecorder ← records mic audio → base64 data URL           │
│  SlotEditor    ← script with [emotion] tags                     │
│  AudioPlayer   ← plays generated WAV/MP3                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Next.js API Routes                            │
│                                                                  │
│  ┌─────────────────────┐    ┌──────────────────────────────┐    │
│  │  /api/v1/tts        │    │  /api/v1/tts/voxcpm2         │    │
│  │  (ElevenLabs →      │    │  (VoxCPM2 via Gradio)        │    │
│  │   msedge-tts        │    │  ← PRIMARY ROUTE (UI uses)   │    │
│  │   fallback)         │    │                              │    │
│  │  ← LEGACY, unused   │    │  POST: segments[]            │    │
│  │    by UI)            │    │  Returns: audio/wav          │    │
│  └─────────────────────┘    └──────────────┬───────────────┘    │
│                                            │                     │
└────────────────────────────────────────────┼─────────────────────┘
                                             │
                                             ▼
┌──────────────────────────────────────────────────────────────────┐
│              Core Library (lib/voxcpm2.ts)                       │
│                                                                  │
│  synthesizeSpeech(params)                                        │
│    ├── Client.connect(spaceId) → Gradio client                  │
│    ├── decode base64 → audio Blob                               │
│    ├── auto-transcribe via /_run_asr_if_needed                  │
│    ├── for each segment:                                        │
│    │     ├── buildEmotionText() → dual signal                   │
│    │     ├── splitIntoChunks() → ≤150 chars per chunk           │
│    │     └── client.predict(/generate) → WAV buffer             │
│    ├── concatWavBuffers() → merge with 200ms trim               │
│    └── return { audioBuffer: Buffer }                           │
└──────────────────────────────────┬───────────────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │  HuggingFace Gradio Space   │
                    │  (openbmb/VoxCPM-Demo)      │
                    │    ┌──────────────┐         │
                    │    │  /generate   │         │
                    │    │  /_run_asr   │         │
                    │    └──────────────┘         │
                    └─────────────────────────────┘
```

**Key architectural decisions:**

- **No database persistence** — voice samples and generated audio are ephemeral. Audio exists only in browser memory (blob URLs) during the session. Generation history is stored in `localStorage` (max 5 entries).
- **No background workers** — all TTS generation happens synchronously within the API request.
- **Dual emotion signaling** — emotions are sent to VoxCPM2 both as embedded text markers (`(excitedly) Hello`) AND as structured `control_instruction` parameters (`"Energetic, enthusiastic..."`).

---

## 2. API Reference

### 2.1 POST /api/v1/tts/voxcpm2 (Primary)

This is the **primary TTS endpoint** currently called by the frontend. It uses the VoxCPM2 model running on a HuggingFace Gradio Space to generate speech with voice cloning and emotion control.

**File:** `frontend/app/api/v1/tts/voxcpm2/route.ts`

#### Request

**Method:** `POST`

**Content-Type:** `application/json`

**Body:**

```typescript
{
  // Required: Array of text segments with optional emotion tags
  segments: [
    {
      text: string,         // The text to speak
      emotion: string | null // Emotion name (e.g., "excited", "whisper") or null
    }
  ],
  // Optional: Base64-encoded WAV audio of the voice to clone
  speakerAudio?: string,
  // Optional: Free-form control instruction (alternative to emotion tags)
  controlInstruction?: string,
  // Optional: CFG scale (0-10, default 3). Higher = stronger cloning
  cfgValue?: number,
  // Optional: Normalize audio output (default false)
  doNormalize?: boolean,
  // Optional: Denoise audio output (default false)
  denoise?: boolean
}
```

**Validation (Zod schema):**

```typescript
const SegmentSchema = z.object({
  text: z.string(),
  emotion: z.string().nullable(),
});

const RequestSchema = z.object({
  segments: z.array(SegmentSchema).min(1),           // At least 1 segment
  speakerAudio: z.string().optional(),                // base64 data URL
  controlInstruction: z.string().optional(),
  cfgValue: z.number().min(0).max(10).optional(),     // 0-10 range
  doNormalize: z.boolean().optional(),
  denoise: z.boolean().optional(),
});
```

#### Response

**Success (200):**

```
Content-Type: audio/wav
Content-Disposition: inline; filename="voxslides-voxcpm2.wav"
```
Body: Raw WAV audio binary.

**Validation Error (400):**

```json
{
  "error": "Validation failed",
  "fields": {
    "segments": ["Must have at least 1 segment"],
    ...
  }
}
```

**Configuration Error (500):**

```json
{
  "error": "VoxCPM2 not configured. Set VOXCPM2_SPACE_ID in .env.local"
}
```

**Processing Error (500):**

```json
{
  "error": "Speech generation failed"
}
```

**Empty Text (422):**

```json
{
  "error": "No text to synthesize"
}
```

#### Behavior

1. Validates the request body with Zod
2. Checks that `VOXCPM2_SPACE_ID` is configured
3. Filters empty segments and applies `applyModifiers()` (punctuation/casing per emotion)
4. Returns 422 if all segments are empty after filtering
5. Calls `synthesizeSpeech()` from `lib/voxcpm2.ts`
6. Returns the raw WAV audio buffer with appropriate headers

#### Example

```bash
curl -X POST http://localhost:3000/api/v1/tts/voxcpm2 \
  -H "Content-Type: application/json" \
  -d '{
    "segments": [
      {"text": "Hello world", "emotion": "excited"},
      {"text": "This is a secret", "emotion": "whisper"}
    ],
    "speakerAudio": "data:audio/wav;base64,UklGRi4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAACAgICA..."
  }'
```

---

### 2.2 POST /api/v1/tts (Legacy)

**Note:** This route is **not currently called by the frontend** (the UI uses `/api/v1/tts/voxcpm2` instead). It is maintained as a fallback path using ElevenLabs (with voice cloning) and msedge-tts (free fallback without cloning).

**File:** `frontend/app/api/v1/tts/route.ts`

#### Request

**Method:** `POST`

**Body:**

```typescript
{
  script: string,         // Script with optional [emotion] tags (max 5000 chars)
  speakerAudio: string    // Base64 data URL of voice sample
}
```

#### Response

**Success (200):**
- If ElevenLabs succeeds: `audio/mpeg` (MP3 format)
- If ElevenLabs fails / unavailable: `audio/mpeg` from msedge-tts

#### Routing Logic

```
POST /api/v1/tts
  ├── speakerAudio provided + ELEVENLABS_API_KEY exists?
  │     YES → tryCloneVoice(audioBase64, apiKey)
  │              ├── POST api.elevenlabs.io/v1/voices/add → voice_id
  │              ├── On 401/missing_permissions → returns null (fallback to preset)
  │              └── generateWithElevenLabs(text, voiceId, apiKey)
  │                    └── POST api.elevenlabs.io/v1/text-to-speech/{voiceId}?output_format=mp3_44100_128
  │                          → Returns audio/mpeg
  │              └── On error → logs warning, falls through
  │
  └── Fallback: synthesizeWithEdge(segments)
        ├── buildSsml() → SSML with prosody tags
        ├── MsEdgeTTS → en-US-AvaNeural, 24kHz 96kbps mono MP3
        └── Returns audio/mpeg
```

#### Voice Cloning Details

- **API:** `POST https://api.elevenlabs.io/v1/voices/add`
- **Model:** `eleven_multilingual_v2`
- **Preset voice (fallback):** `21m00Tcm4TlvDq8ikWAM` ("Rachel")
- **Voice settings:** `stability: 0.35`, `similarity_boost: 0.8`
- **Output format:** `mp3_44100_128` (44.1kHz, 128kbps MP3)
- **Auth header:** `xi-api-key`

---

### 2.3 GET /api/v1/tts/voxcpm2/debug (Diagnostic)

A diagnostic endpoint that tests VoxCPM2's Gradio API directly via raw HTTP calls (bypassing the `@gradio/client` library). Useful for debugging `control_instruction` behavior.

**File:** `frontend/app/api/v1/tts/voxcpm2/debug/route.ts`

#### Request

**Method:** `GET`

#### Response

```json
{
  "logs": [
    "Connecting to openbmb/VoxCPM-Demo...",
    "Root URL: https://openbmb-voxcpm-demo.hf.space",
    "Uploading test WAV (16044 bytes)...",
    "Upload status: 200",
    "Server path: /tmp/gradio/abc123/test.wav",
    "--- Test 1: NO control_instruction ---",
    "--- Test 2: WITH control_instruction (excited) ---",
    "--- Test 3: WITH control_instruction (whisper) + CFG 7 ---"
  ],
  "success": true
}
```

On failure:
```json
{
  "logs": ["..."],
  "error": "Error message"
}
```

The debug endpoint:
1. Connects to the VoxCPM2 Gradio space
2. Uploads a synthetic 1-second silent WAV (16kHz mono, 16-bit PCM)
3. Runs 3 test predictions with varying control instructions and CFG values
4. Returns all log output and success/failure for each test

---

## 3. Core Library: lib/voxcpm2.ts

**File:** `frontend/lib/voxcpm2.ts`

This is the core voice synthesis engine. It contains all VoxCPM2 integration logic.

### Types

```typescript
interface SegmentData {
  text: string;
  emotion: string | null;
}

interface VoxCPM2Params {
  segments: SegmentData[];
  referenceAudioBase64?: string;
  controlInstruction?: string;
  usePromptText?: boolean;
  promptText?: string;
  cfgValue?: number;      // default: 3
  doNormalize?: boolean;  // default: false
  denoise?: boolean;      // default: false
}

interface VoxCPM2Result {
  audioBuffer: Buffer;    // Combined WAV audio
}
```

### Main Function: `synthesizeSpeech(params: VoxCPM2Params): Promise<VoxCPM2Result>`

This is the main entry point. It:

1. **Reads env config**: `VOXCPM2_SPACE_ID` via `getVoxCPM2SpaceId()`
2. **Connects to Gradio**: `Client.connect(spaceId)` from `@gradio/client`
3. **Processes reference audio** (if provided):
   - Decodes base64 → `Blob`
   - Attempts auto-transcription via `/_run_asr_if_needed` (ASR endpoint)
   - Stores transcript as `finalPromptText`
4. **Determines mode**:
   - **Ultimate Cloning** (no emotions + has reference audio + has transcript): uses `use_prompt_text=true`, disables `control_instruction`
   - **Controllable Cloning** (emotions or control instructions present): uses `control_instruction` with emotion descriptions, `use_prompt_text=false`
5. **Builds work items**: for each segment, applies `buildEmotionText()` (dual signal: marker + instruction), then `splitIntoChunks()` (≤150 chars per chunk)
6. **Generates audio per chunk**: calls `client.predict("/generate", {...})` with all parameters
7. **Collects WAV buffers**: handles both base64 responses and file URL responses
8. **Merges chunks**: `concatWavBuffers()` with 200ms overlap trimming
9. **Returns combined audio**: `{ audioBuffer: Buffer }`

### Emotion → Control Instruction Mapping

Each of the 12 preset emotions maps to a natural-language control instruction:

```typescript
const EMOTION_INSTRUCTIONS: Record<string, string> = {
  excited:         "Energetic, enthusiastic, fast-paced, high pitch variation, excited tone",
  whisper:         "Soft whisper, breathy, quiet, intimate, close-mic, secretive tone",
  "slow and dramatic": "Very slow, dramatic pauses, deep serious tone, heavy emphasis on each word",
  fast:            "Rapid, urgent, fast-paced delivery, words flowing quickly without pause",
  nervous:         "Nervous, hesitant, slight tremor, uncertain tone, small voice, anxious",
  crying:          "Tearful, trembling voice, breaking with emotion, sad, sniffles, choked up",
  angry:           "Angry, sharp, forceful, biting each word, rising intensity, frustrated",
  calm:            "Relaxed, calm, soothing, gentle, unhurried, peaceful tone",
  laughing:        "Laughing, amused, bright voice, chuckling, joyful, smiling tone",
  sarcastic:       "Dry, sarcastic, knowing tone, drawn-out words, mocking, sardonic",
  storytelling:    "Narrator voice, varied pace, building suspense, dramatic, engaging storyteller",
  breathless:      "Out of breath, panting, winded, urgent, catching breath between words",
};
```

### Emotion Text Markers (Dual Signal)

Alongside the `control_instruction`, emotion markers are embedded directly into the text:

```typescript
const EMOTION_MARKERS: Record<string, string> = {
  excited:         "(excitedly) ",
  whisper:         "(whispering) ",
  "slow and dramatic": "(slowly, dramatically) ",
  fast:            "(quickly) ",
  nervous:         "(nervously) ",
  crying:          "(crying) ",
  angry:           "(angrily) ",
  calm:            "(calmly) ",
  laughing:        "(laughing) ",
  sarcastic:       "(sarcastically) ",
  storytelling:    "(storytelling) ",
  breathless:      "(out of breath) ",
};
```

### Text Chunking (`splitIntoChunks`)

- **Max chunk size:** 150 characters
- **Split priority:** sentence boundary (`.!?` + space) → clause boundary (`,;—–` + space) → word boundary (space) → hard cut at 150
- **Lookback window:** 50%–100% of max (75–150 chars)

### WAV Concatenation (`concatWavBuffers`)

- Parses WAV header to extract format parameters (sample rate, channels, bit depth)
- Validates: sampleRate ≤ 200kHz, bitsPerSample ≤ 32, channels ≤ 8
- Trims **200ms** from the end of each chunk (except the last) to avoid clicks/pops
- Builds a fresh WAV header for the combined data
- **Fallback:** If parsing fails, concatenates raw buffers directly

### Gradio Client Parameters (`/generate`)

| Parameter | Type | Description |
|-----------|------|-------------|
| `text_input` | string | Text to be spoken (with optional emotion marker prefix) |
| `control_instruction` | string | Natural-language style/emotion description |
| `reference_wav_path_input` | blob | Reference voice sample for cloning |
| `use_prompt_text` | boolean | Enable Ultimate Cloning mode |
| `prompt_text_input` | string | ASR transcript of reference audio |
| `cfg_value_input` | number (0-10) | CFG scale for synthesis strength |
| `do_normalize` | boolean | Normalize output volume |
| `denoise` | boolean | Denoise output audio |

---

## 4. Script Parsing: lib/script-utils.ts

**File:** `frontend/lib/script-utils.ts`

### Types

```typescript
interface Segment {
  text: string;
  condition: string | null;
}
```

### `parseScript(fullScript: string): Segment[]`

Parses a raw script string with `[emotion]` tags into an array of `{text, condition}` segments.

**Input example:**
```
Hello world [excited] this is amazing [whisper] keep it secret
```

**Output:**
```json
[
  { "text": "Hello world", "condition": null },
  { "text": "this is amazing", "condition": "excited" },
  { "text": "keep it secret", "condition": "whisper" }
]
```

**Parsing behavior:**
- Tags appear as `[anything]` (case-insensitive, matched by regex)
- Text before the first tag gets `condition: null`
- Tags apply to all following text until the next tag
- Trailing text after the last tag uses the last tag's condition

### `applyModifiers(text: string, condition: string | null): string`

Applies text-level punctuation and casing modifications based on emotion:

| Emotion | Punctuation | Casing |
|---------|-------------|--------|
| excited | `!` | normal |
| whisper | `...` | **lower** |
| slow and dramatic | `...` | normal |
| fast | `!` | normal |
| nervous | `...` | normal |
| crying | `...` | **lower** |
| angry | `!` | **UPPER** |
| calm | `...` | **lower** |
| laughing | `!` | normal |
| sarcastic | `.` | normal |
| storytelling | `...` | normal |
| breathless | `...` | **lower** |

**Behavior:**
- If no condition, returns text unchanged
- Applies casing (uppercase/lowercase/normal)
- Appends punctuation if text doesn't end with `.!?…`
- Replaces trailing `.` with `!` if the emotion calls for it

### `buildFullText(segments: Segment[]): string`

Joins all segments into a single plain-text string with modifiers applied. Used by the ElevenLabs legacy route (which needs a single text blob).

---

## 5. Emotion System

The emotion system spans **three layers** of the stack, each mapped independently:

### Layer 1: Frontend UI (`lib/conditions.ts`)

12 preset emotions with label, emoji, and Tailwind color:

```typescript
{ label: "Excited",         emoji: "⚡", color: "amber",   value: "excited" },
{ label: "Slow & Dramatic", emoji: "🎭", color: "purple",  value: "slow and dramatic" },
// ... see full list in lib/conditions.ts
```

Used by `SlotEditor.tsx` to render clickable emotion chips.

### Layer 2: Script Parsing (`lib/script-utils.ts`)

Emotions in `[brackets]` are parsed by `parseScript()` into segments, and text-level modifiers (punctuation, casing) are applied by `applyModifiers()`.

### Layer 3: Voice Engines

#### VoxCPM2 Path:
- **Text marker:** `(excitedly) Hello` embedded in text input
- **Control instruction:** `"Energetic, enthusiastic..."` sent as parameter

#### ElevenLabs Path:
- No emotion-specific API (emotions are conveyed via text content only)
- Speed multiplier per emotion used for Chatterbox (unused code)

#### msedge-tts Fallback Path:
- **SSML prosody tags:** rate, pitch, and volume per emotion
- Example for excited: `<prosody rate="1.4" pitch="+150Hz" volume="100">text</prosody>`

### Complete Emotion Mapping Table

| Emotion | VoxCPM2 Marker | VoxCPM2 Control Instruction | ElevenLabs Speed | msedge SSML rate/pitch/vol | Text Modifier |
|---------|----------------|----------------------------|-----------------|---------------------------|---------------|
| excited | (excitedly) | Energetic, enthusiastic... | 1.15x | 1.4, +150Hz, 100% | !, normal |
| whisper | (whispering) | Soft whisper, breathy... | 0.7x | 0.6, -200Hz, 20% | ..., lower |
| slow and dramatic | (slowly, dramatically) | Very slow, dramatic pauses... | 0.5x | 0.35, -80Hz, 100% | ..., normal |
| fast | (quickly) | Rapid, urgent... | 1.6x | 1.8, +60Hz, 100% | !, normal |
| nervous | (nervously) | Nervous, hesitant... | 1.2x | 1.3, +200Hz, 90% | ..., normal |
| crying | (crying) | Tearful, trembling... | 0.6x | 0.5, -300Hz, 85% | ..., lower |
| angry | (angrily) | Angry, sharp... | 1.25x | 1.3, -180Hz, 100% | !, UPPER |
| calm | (calmly) | Relaxed, calm... | 0.75x | 0.7, -30Hz, 80% | ..., lower |
| laughing | (laughing) | Laughing, amused... | 1.1x | 1.2, +200Hz, 100% | !, normal |
| sarcastic | (sarcastically) | Dry, sarcastic... | 0.9x | 0.9, +250Hz, 100% | ., normal |
| storytelling | (storytelling) | Narrator voice... | 0.85x | 0.8, +0Hz, 100% | ..., normal |
| breathless | (out of breath) | Out of breath... | 1.4x | 1.5, +150Hz, 75% | ..., lower |

---

## 6. External Integrations

### 6.1 VoxCPM2 via HuggingFace Gradio

| Property | Value |
|----------|-------|
| **Service** | HuggingFace Gradio Space |
| **Default Space** | `openbmb/VoxCPM-Demo` |
| **Library** | `@gradio/client` v2.2.0 |
| **Endpoint** | `Client.connect(spaceId)` → `client.predict("/generate", {...})` |
| **ASR Endpoint** | `client.predict("/_run_asr_if_needed", ...)` |
| **Max Chunk** | 150 characters |
| **Modes** | Ultimate Cloning (no emotions) / Controllable Cloning (emotions) |

**Space URL pattern:** `https://{owner}-{space}.hf.space`

### 6.2 ElevenLabs

| Property | Value |
|----------|-------|
| **API Base** | `https://api.elevenlabs.io` |
| **Voice Cloning** | `POST /v1/voices/add` (instant clone) |
| **TTS Generation** | `POST /v1/text-to-speech/{voiceId}?output_format=mp3_44100_128` |
| **Auth** | `xi-api-key` header |
| **Model** | `eleven_multilingual_v2` |
| **Preset Voice** | `21m00Tcm4TlvDq8ikWAM` ("Rachel") |
| **Stability** | 0.35 |
| **Similarity Boost** | 0.8 |

**Note:** The frontend currently does NOT call this route. It is fully implemented and maintained as a fallback.

### 6.3 msedge-tts (Free Fallback)

| Property | Value |
|----------|-------|
| **Library** | `msedge-tts` v2.0.5 |
| **Voice** | `en-US-AvaNeural` |
| **Format** | 24kHz 96kbps mono MP3 |
| **Input** | SSML with `<prosody>` tags |
| **Emotion** | Mapped via rate/pitch/volume per emotion |

**Limitations:** No voice cloning, no true emotion modeling — relies solely on SSML prosody parameters to approximate vocal style.

### 6.4 Intentionally Unused Services

The `.env.example` and `.env.local` files reference these, but **no code references them**:

- **Chatterbox TTS** (`CHATTERBOX_BASE_URL`) — local Colab-based TTS
- **FishSpeech S2 Pro** (`FISHSPEECH_BASE_URL`) — self-hosted on GCloud VM
- **Deepgram** (`DEEPGRAM_API_KEY`) — speech-to-text API
- **fal.ai** (`FAL_KEY`) — AI media API
- **Gemini** (`GEMINI_API_KEY`) — LLM API
- **Replicate** (`REPLICATE_API_KEY`) — AI model hosting

---

## 7. Environment Variables

### Required for Voice Features

| Variable | For | Example | Notes |
|----------|-----|---------|-------|
| `VOXCPM2_SPACE_ID` | VoxCPM2 voice synthesis | `openbmb/VoxCPM-Demo` | HuggingFace Gradio Space ID. This is the primary engine. |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS + cloning (legacy route) | `sk_...` | Only needed if using the legacy `/api/v1/tts` route. |
| `HF_TOKEN` | HuggingFace authentication (optional) | `hf_...` | May be required for authenticated/protected Gradio spaces. |

### Next.js Configuration

From `next.config.ts`:

```typescript
experimental: {
  serverActions: { bodySizeLimit: "10mb" },  // Audio uploads can be large
}
```

The `bodySizeLimit` of 10MB is important — base64-encoded WAV audio samples can be several megabytes. If this limit is exceeded, the request will fail silently.

### CSP `connect-src` Allowlist (from next.config.ts)

```typescript
"connect-src 'self' https://api.elevenlabs.io https://*.hf.space https://huggingface.co"
```

These origins are required:
- `https://api.elevenlabs.io` — ElevenLabs API calls
- `https://*.hf.space` — VoxCPM2 Gradio Space
- `https://huggingface.co` — HuggingFace asset hosting

---

## 8. Security & Configuration

### Headers (from `next.config.ts`)

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | See above section |

### Voice Data Security

- **No persistent storage** — voice samples are decoded, sent to the TTS provider, and the server-side buffer is garbage-collected after response
- **No encryption applied at application layer** — relies on HTTPS transport encryption
- **API keys are server-side only** — never exposed to the browser
- **Generated audio** — returned as blob URLs, exists only in browser memory

### Key Security Concerns

1. **No RLS or auth checks** on TTS endpoints — the API is currently open. Add auth middleware if deploying publicly.
2. **No rate limiting** — TTS API calls (especially to ElevenLabs/VoxCPM2) can incur costs. Consider rate-limiting.
3. **Body size limit** — 10MB cap on server actions prevents abuse via oversized payloads.

---

## 9. Frontend Components (Brief)

These components interact with the backend:

| Component | File | Role |
|-----------|------|------|
| `VoiceRecorder` | `components/voice-recorder/VoiceRecorder.tsx` | Captures mic audio → base64 data URL |
| `AudioPlayer` | `components/audio-player/AudioPlayer.tsx` | Playback, seek, download of generated audio |
| `SlotEditor` | `components/slot-editor/SlotEditor.tsx` | Textarea with emotion tag slot management |
| `compileScript` | `components/slot-editor/compileScript.ts` | Compiles user text + emotion slots → script string |
| Page | `app/page.tsx` | Orchestrates the full flow: collects sample, manages script, calls `/api/v1/tts/voxcpm2`, renders `AudioPlayer` |

### Data Flow (Frontend → Backend)

```
User records/upload audio → VoiceRecorder → base64 state
User writes script + emotion tags → SlotEditor → compileScript → compiled string
                                                                         │
                                                        parseScript() ───┤
                                                                         ▼
                                          segments[{text, emotion}] + speakerAudio
                                                                         │
                                              POST /api/v1/tts/voxcpm2 ──┘
                                                                         │
                                                                         ▼
                                                                   audio/wav buffer
                                                                         │
                                                                         ▼
                                                              URL.createObjectURL(blob)
                                                                         │
                                                                         ▼
                                                                  AudioPlayer plays
```

---

## 10. Testing

### Playwright Tests

**File:** `frontend/tests/voxeslides.spec.ts`

The test suite covers:
- Page load and rendering
- Typing scripts and inserting emotion slot chips
- Audio generation (mocked API response)
- Audio player visibility
- Generation history

**To run:**
```bash
cd frontend
npx playwright test
```

### Manual Testing via Debug Endpoint

```bash
curl http://localhost:3000/api/v1/tts/voxcpm2/debug
```

This runs 3 variations of VoxCPM2 generation (no instruction, excited, whisper+high CFG) and returns diagnostic logs.

### Test with curl (VoxCPM2)

```bash
# Minimal test (no voice sample, no emotions)
curl -X POST http://localhost:3000/api/v1/tts/voxcpm2 \
  -H "Content-Type: application/json" \
  -d '{"segments": [{"text": "Hello world", "emotion": null}]}' \
  --output test-output.wav
```

### Test with curl (ElevenLabs Legacy)

```bash
# Only works if ELEVENLABS_API_KEY is set
curl -X POST http://localhost:3000/api/v1/tts \
  -H "Content-Type: application/json" \
  -d '{"script": "Hello world [excited] this is great", "speakerAudio": "data:audio/wav;base64,..."}' \
  --output test-output.mp3
```

---

## 11. Deployment Checklist

### Vercel Deployment

1. **Set environment variables** in Vercel Dashboard → Settings → Environment Variables (see Section 7)
2. **Body size limit:** Already configured in `next.config.ts` (10MB for server actions)
3. **CSP headers:** Already configured — ensures `connect-src` allows HF Spaces and ElevenLabs

### Railway Worker

Currently no background workers exist for voice processing. If adding async processing in the future:
- Process audio generation in a stateless worker
- Store results in a database or object storage (R2, S3)
- Poll for completion from the frontend

---

## Appendix: File Index

| File | Purpose |
|------|---------|
| `frontend/app/api/v1/tts/route.ts` | Legacy ElevenLabs + msedge-tts API route (228 lines) |
| `frontend/app/api/v1/tts/voxcpm2/route.ts` | Primary VoxCPM2 API route (90 lines) |
| `frontend/app/api/v1/tts/voxcpm2/debug/route.ts` | Diagnostic debug endpoint (169 lines) |
| `frontend/lib/voxcpm2.ts` | Core VoxCPM2 synthesis engine (357 lines) |
| `frontend/lib/script-utils.ts` | Script parsing and text modifiers (73 lines) |
| `frontend/lib/conditions.ts` | Emotion preset definitions (36 lines) |
| `frontend/lib/history.ts` | localStorage generation history |
| `frontend/types/index.ts` | Shared TypeScript interfaces |
| `frontend/next.config.ts` | Security headers, body size limit |
| `frontend/package.json` | Dependencies (`@gradio/client`, `msedge-tts`, `zod`) |
| `.env.example` | All documented env vars with descriptions |
