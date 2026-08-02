# Worker Task Audit — What Belongs on Render vs Vercel

**Date:** 2026-07-31
**Plan:** Vercel Hobby (10s timeout, no cron, 1GB bandwidth)
**Worker:** Render free tier (512MB RAM, 0.1 vCPU, 15min sleep, 100GB bandwidth)

## Current Architecture

| Layer | Responsibilities |
|---|---|
| **Render Worker** | PPTX-to-PDF conversion, email queue polling + sending |
| **Vercel Hobby** | Audio generation, narration, image descriptions, R2 file ops, combined audio rebuild, voice preview |
| **External APIs** | Gradio/VoxCPM2 (TTS), Gemini (narration), Nemotron (image descs), Resend (email), Cloudflare R2 |

## Vercel Hobby vs Pro — Critical Difference

With **Hobby's 10s timeout**, EVERY AI generation endpoint is at risk:

| Task | Typical Time | Hobby Status |
|---|---|---|
| Combined audio rebuild | 17-42s | **WILL TIMEOUT** |
| Image descriptions (20 images) | ~70s | **WILL TIMEOUT** |
| Audio generation (per slide) | 30-120s | **WILL TIMEOUT** |
| Narration (10 slides) | 5-15s | **MAY TIMEOUT** |
| PPTX-to-PDF conversion | 30-180s | On worker (safe) |

The 10s limit changes every verdict from the earlier analysis. Below are the revised assessments.

---

## Task-by-Task Analysis (Revised for Hobby)

### 1. Combined Audio Rebuild — **MUST MOVE (was MEDIUM → now CRITICAL) — DONE 2026-07-31**

**Risk on Hobby:** 17-42s vs 10s limit. **Guaranteed to timeout** for any presentation.

**Fix applied:** Moved to Render worker.
- `worker/lib/r2.js` — R2 S3 client for worker
- `worker/lib/wav-utils.js` — ported WAV validation + concatenation
- `worker/server.js` — new `POST /rebuild-audio` endpoint
- `frontend/app/api/presentations/[id]/audio/rebuild/route.ts` — delegates to worker via fire-and-forget, returns 202 immediately
- See `docs/specs/2026-07-31-worker-public-audit-design.md` for details

### 2. Image Descriptions — **MUST MOVE (was CONDITIONAL → now CRITICAL)**

**Risk on Hobby:** 20 images at ~10s each with concurrency 3 = ~70s. Guaranteed timeout. Also hits 4.5MB body limit.

**Fix:** Already fixed client-side (images downscaled to 400px, batch sent immediately). But the Vercel timeout remains. Must move to worker:
- Add `@google/generative-ai` to worker deps (Gemini fallback)
- Nemotron calls use raw `fetch` (already compatible)
- Split path: ≤2 images from Vercel for instant response, >2 images fire-and-forget to worker

**Impact:** Makes image description generation actually work (currently timing out silently).

### 3. Audio Generation — **ALREADY CRITICAL (10s << 120s)**

**Current behavior on Hobby:** Per-slide audio generation takes 30-120s per chunk. This exceeds 10s. The request may be completing via Vercel's streaming response loophole, or failing silently.

**Fix path A (quick):** Keep on Vercel. The Gradio polling loop in `voxcpm.ts` keeps the connection alive — Hobby may allow this via streaming responses. If it's currently working, leave as-is but monitor.

**Fix path B (robust):** Move to fire-and-forget pattern: Vercel kicks off a worker job → worker polls Gradio → Vercel client polls worker. Adds complexity but guarantees reliability.

**Verdict:** If audio generation currently works on Hobby (streaming keeps connection alive), leave it. If it fails, move to worker via fire-and-forget pattern.

### 4. Narration Generation — **MOVED RISK (2-8s → low)**

**Risk on Hobby:** Small presentations (≤5 slides) finish in ~5s (safe). Large presentations (15+ slides) may hit 10-25s and timeout.

**Fix:** Add `export const maxDuration = 15` (Hobby ignores, but documents intent). For large presentations, the user would need to upgrade to Pro for the 60s limit. Not worth moving to worker — Gemini API is fast enough that most cases complete under 10s.

### 5. Email Queue — **COLD START FIX APPLIED 2026-07-31, CRON REMOVED 2026-08-02**

**Hobby limitation:** Vercel Hobby does NOT support cron jobs — a `crons` block in `vercel.json` actually **fails the deployment** (not silently ignored). The keepalive cron (`/api/cron/worker-keepalive`) was removed 2026-08-02; its `/queue/process` trigger was redundant (worker self-polls every 10s) and unauthenticated (would 401 against the worker's API key).

**Fix applied (Option 2 - lazy wake):**
- `frontend/lib/email.ts` — after successful queue insert, fires a side-effect `fetch(workerUrl + "/health")` to wake the Render worker. Zero-cost, self-healing — emails are delivered whenever the app is active.

**Keepalive (worker warmth):**
- The worker's `GET /health` endpoint (`worker/server.js`) is public (no auth) and is pinged externally via **UptimeRobot** every 10 minutes to prevent the 15-min free-tier sleep. Configure a UptimeRobot HTTP(S) monitor against `RENDER_WORKER_URL/health`.
- Note: on a cold worker the first ping may take ~30s to spin up; UptimeRobot's default 30s timeout should be raised or the monitor keyword-based if flapping.

### 6. PPTX-to-PDF Conversion — **CORRECTLY ON WORKER**

Safe from Hobby timeout. The worker handles the full 30-180s LibreOffice conversion. Parallelized in the batching branch.

---

## Worker Endpoint Plan

| Endpoint | Status | Notes |
|---|---|---|
| `POST /convert` | **Existing** | PPTX-to-PDF |
| `POST /queue/process` | **Existing** | Manual email queue processing |
| `GET /health` | **Existing** | Health check |
| `POST /rebuild-audio` | **Needed** | Combined WAV from per-slide WAVs |
| `POST /describe-images` | **Needed** | Image description batch processing |
| `setInterval` email poller | **Existing** | Polls every 10s |

---

## Implementation Priority

| # | Task | Effort | Impact |
|---|---|---|---|
| 1 | Combined audio rebuild → worker | Medium (add R2 SDK + wav utils) | Fixes hard timeout |
| 2 | Image descriptions → worker | Medium (add Gemini SDK) | Fixes hard timeout + body limit |
| 3 | Lazy wake for email queue | Low (add fetch to health endpoint) | Prevents email delays |
| 4 | Audio generation fire-and-forget | High (worker job queue + polling) | Only if current approach fails |
