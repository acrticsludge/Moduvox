# Worker Task Audit — What Belongs on Render vs Vercel

**Date:** 2026-07-31
**Branch:** `feat/worker-architecture-audit`

## Current Architecture

| Layer | Responsibilities |
|---|---|
| **Render Worker** (Node.js, Express, free tier) | PPTX-to-PDF conversion, email queue polling + sending |
| **Vercel Serverless** (Next.js API routes) | Audio generation, narration, image descriptions, R2 file ops, combined audio rebuild, voice preview |
| **External APIs** | Gradio/VoxCPM2 (HuggingFace TTS), Gemini (narration), Nemotron/NVIDIA NIM (image descriptions), Resend (email), Cloudflare R2 (storage) |

### Render Free Tier Constraints
- 512 MB RAM, 0.1 vCPU (shared)
- Spins down after 15 minutes of inactivity
- 100 GB/month outbound bandwidth
- 1 instance

### Vercel Constraints
- 10s (Hobby) / 60s (Pro) / 900s (Pro with `maxDuration`)
- 4.5 MB request body limit
- Cold starts on every invocation

---

## Task-by-Task Analysis

### 1. Combined Audio Rebuild (`POST /api/presentations/[id]/audio/rebuild`)

**What it does:** Lists per-slide WAVs from R2, downloads all, concatenates into `combined.wav`, uploads back, bumps `audio_version`.

| Factor | Assessment |
|---|---|
| Current location | Vercel |
| Bottleneck | I/O (R2 downloads/uploads) + CPU (WAV concatenation) |
| Vercel timeout risk | Medium — 10 slides × 5MB = 50MB down + 50MB up. ~17-42s. |
| Render fit | Excellent — same I/O→process→I/O pattern as existing `/convert` |
| Cold start concern | None — background task, not interactive |
| Implementation | Port `concatWavBuffers` + `findDataOffset` from `wav-utils.ts`, add `@aws-sdk/client-s3` to worker deps |

**Verdict: MOVE (future).** Would require adding R2 SDK + WAV utilities to the worker. For now, Vercel Pro's 60s timeout handles most cases. Prioritize when user upgrades Render or experiences timeouts.

### 2. Image Description Generation (`POST /api/generate/image-descriptions`)

**What it does:** Calls Nemotron/Gemini with base64 images. Retry with exponential backoff. 3 concurrent images. Max 20 images/request.

| Factor | Assessment |
|---|---|
| Current location | Vercel |
| Bottleneck | Network (Nemotron/Gemini), large payload memory |
| Vercel timeout risk | High — 20 images at ~10s each = ~70s total. Nemotron timeout: 120s. |
| Vercel body limit risk | High — base64 images easily exceed 4.5MB limit |
| Render fit | Good — persistent process handles retry-heavy long-running calls |
| Cold start concern | Significant — interactive UX, cold start adds 30-60s |
| Free tier bandwidth | Concern — large base64 payloads could exhaust 100GB/month |

**Verdict: CONDITIONAL MOVE.** If upgraded to paid Render (no sleep), split: ≤3 images on Vercel, >3 on worker. For now, images are downscaled to 400px before upload, keeping payloads within Vercel limits.

### 3. Audio Generation (`POST /api/generate/audio/slide`)

**What it does:** Calls Gradio/VoxCPM2, downloads generated audio, converts MP3→WAV, uploads to R2. Per chunk: 30-120s inference.

| Factor | Assessment |
|---|---|
| Bottleneck | External Gradio API |
| Render fit | Poor — bottleneck is external, moving adds network hop + cold start |
| Cold start concern | Fatal — 30-60s cold start on top of 120s inference |

**Verdict: DO NOT MOVE.** The fix for Vercel timeouts is `export const maxDuration = 300` (requires Pro). The bottleneck is external, not Vercel's runtime.

### 4. Narration Generation (`POST /api/generate/narration`)

**What it does:** Calls Gemini 2.5 Flash with slide content. 2-8s typical. Max ~25s for large presentations.

| Factor | Assessment |
|---|---|
| Bottleneck | External Gemini API |
| Vercel timeout risk | Low — 2-25s, within Pro's 60s |
| Render fit | Poor — network-bound, cold start is 6-12x slowdown |

**Verdict: DO NOT MOVE.** Fast enough on Vercel. Moving to worker only adds latency.

### 5. Email Queue — Cold Start Gap (FIXED)

**Current state:** Worker polls `email_queue` every 10s via `setInterval`. When Render spins down after 15min, polling stops.

**Fix:** Vercel cron job hits `/health` every 10 minutes to keep worker warm AND triggers queue processing. Implemented in this branch.

### 6. PPTX-to-PDF Conversion (ALREADY MOVED)

The `/convert` endpoint on the worker is correctly placed. The worker uses LibreOffice for the heavy lifting, which requires a persistent process. Page splitting and upload were parallelized in the batching/performance branch.

## Completed Improvements (This Branch)

1. **Email queue keep-alive:** Vercel cron hits `GET /api/cron/worker-keepalive` every 10 minutes, which:
   - Pings worker `/health` to wake up the instance
   - Hits worker `/queue/process` to process any pending emails
   - Prevents the 15-minute sleep timeout from causing email delays

## Future Work

1. **Combined audio rebuild on worker:** Port `concatWavBuffers` + `findDataOffset` to worker, add R2 SDK. This is the highest-impact next move — eliminates Vercel timeout risk for 10+ slide presentations.
2. **Image descriptions on worker:** After Render upgrade (paid tier, no sleep), move large image batches to worker with Vercel fallback for ≤3 images.
3. **Audio generation fire-and-forget:** Refactor to Vercel-kickoff + worker-process + Vercel-poll pattern, eliminating Vercel timeout risk without paying cold start penalty on initial response.
