# CLAUDE.local.md

Project-specific factual reference for Moduvox. Covers concrete details: schema, routes, flows, config, gotchas. For behavioral rules and coding standards, see `CLAUDE.md`.

---

## File Structure

```
Moduvox/
  frontend/          Next.js 16 app (Vercel)
  worker/            Express + LibreOffice Docker (Render)
  db/schema.sql      Supabase schema (outdated — use migration files)
  docs/migrations/   SQL migrations 001-029 (source of truth)
  docs/audits/       Security and feature audits
  docs/design/       Design system docs
  docs/plans/        Implementation plans
  docs/specs/        Technical specs
  reddit/            Marketing drafts (gitignored)
  .opencode/         AI agents, skills, commands
```

---

## Database Schema

**10 tables.** Source of truth is migration files in `docs/migrations/`, not `db/schema.sql` (outdated since migration 022).

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | Extends Supabase Auth | `id` (FK auth.users), `email`, `gemini_api_key` (encrypted), `terms_accepted_at` |
| `projects` | Organize presentations | `user_id`, `name`, `color`, `icon` |
| `presentations` | Core entities | `project_id`, `user_id`, `status` (draft/ready/archived), `share_token` (UUID unique), `password_hash`, `email_gate_enabled`, `editor_state` (JSONB), `audio_version` |
| `voices` | Preset and cloned | `user_id`, `type` (preset/cloned), `preset_id`, `sample_path`, `control_instruction`, `preview_audio_path` |
| `viewers` | Email-gated viewers | `presentation_id`, `viewer_email`, `session_token`, `email_verified`, `progress_pct`, UNIQUE(presentation_id, viewer_email) |
| `viewer_events` | Event log | `viewer_id`, `event_type` (opened/slide_viewed/completed/closed/progress), `slide_number` |
| `feedback` | Public submissions | `category`, `rating`, `message`, `can_contact` |
| `waitlist` | Paid tier interest | `user_id` (UNIQUE), `interest` (pro/team/both) |
| `sent_emails` | Email audit log | `user_id`, `to_email`, `email_type`, `status` (sent/failed) |
| `email_queue` | Background email queue | `status` (pending/processing/sent/failed), `retry_count`, partial index on pending |

**Functions:** `handle_new_user()` (auto-creates users row on auth signup), `increment_audio_version(UUID)` (RPC)

**Indexes (27):** Performance indexes on users, projects, presentations, voices, viewers, viewer_events, feedback, sent_emails, email_queue

---

## API Routes

**38 route files, 46 handlers.** All wrapped in `withApiHandler()`.

| Prefix | Methods | Auth | Count |
|--------|---------|------|-------|
| `/api/auth/*` | POST | None/bearer | 3 |
| `/api/presentations/*` | GET/POST/PATCH/DELETE | User session | 16 |
| `/api/view/[shareToken]/*` | GET/POST | Share token | 6 |
| `/api/projects/*` | GET/POST/PATCH/DELETE | User session | 4 |
| `/api/voices/*` | GET/POST/DELETE | User session | 6 |
| `/api/generate/*` | POST | User session | 4 |
| `/api/user/*` | GET/PUT/PATCH/DELETE | User session | 4 |
| `/api/feedback` | POST | None (reCAPTCHA) | 1 |
| `/api/waitlist` | POST | User session | 1 |

**Response envelope:** `{ data: T }` success, `{ error: string }` error.

---

## Auth System

**Two separate auth systems:**

**1. User Auth (Supabase):**
- 4 Supabase clients: browser, server, middleware, admin (service-role)
- Email/password + Google OAuth
- Middleware protects `/dashboard/*` and all `/api/*` routes
- Fail-closed: middleware errors redirect to `/login`
- No centralized auth context — each component calls `getUser()` independently
- Session refresh via middleware on every matched request

**2. Viewer Auth (Custom magic link):**
- NOT Supabase Auth
- Gate: password (bcrypt) + email (magic link) + reCAPTCHA
- Session token stored in localStorage as `moduvox_session_{shareToken}`
- 15-minute magic link expiry enforced
- Rate limits: 5/IP/hour gate submissions, 20 emails/presentation/day

---

## Voice Pipeline

```
User selects voice → SlideEditor → POST /api/generate/audio/slide
  → API resolves voice from DB (preset or cloned)
  → lib/voxcpm.ts → Gradio API (HuggingFace space or self-hosted)
  → Downloads generated audio → MP3→WAV conversion (mpg123-decoder WASM)
  → Uploads per-slide WAV to R2 → Deletes stale combined.wav
```

**VoxCPM client** (`lib/voxcpm.ts`): Raw fetch to Gradio API (bypasses `@gradio/client` which hangs on Vercel). Upload ref audio → POST predict → Poll SSE → Return audio URL. Fallback: `INFERENCE_BASE_URL` env var.

**3 modes:** `generateWithPreset` (no ref audio), `generateWithClone` (ref audio + tone), `generateUltimateClone` (ref audio + prompt text, no control instruction)

**Free tier limits:** 1 voice clone, 5 preset voices

---

## PDF Conversion Pipeline

```
PPTX upload → confirm route → fire-and-forget POST to worker /convert
  → Worker: downloads PPTX via presigned GET URL
  → soffice --headless --convert-to pdf (180s timeout)
  → pdf-lib splits into per-slide PDFs
  → PUTs each slide-N.pdf to R2 via presigned PUT URLs
Frontend polls GET /api/presentations/[id]/slides every 2s
  → Returns { slides: [{slideNumber, pdfUrl}], completed: boolean }
```

**Worker** (`worker/server.js`): Express on Render Docker. Node 22-slim + libreoffice-impress. No R2 credentials — uses presigned URLs only. Constant-time API key auth.

**R2 key format:** `{userId}/pdf/{presentationId}/slide-{N}.pdf`

---

## Email System

**3 templates** (React Email): welcome, magic-link, feedback-notification

**Queue-based delivery:**
1. `sendEmail()` in `lib/email.ts` renders template → inserts into `email_queue` table
2. Worker polls every 10s → sends via Resend → logs to `sent_emails`
3. Fallback: direct Resend API if queue insert fails

**3 trigger points:** Welcome (signup), magic link (gate), feedback (notification to admin)

---

## R2 Storage Structure

```
{userId}/{presentationId}.pptx              # Source PPTX
{userId}/pdf/{presentationId}/slide-{N}.pdf # Per-slide PDFs
{userId}/audio/{presentationId}/slides/slide-{N}.wav  # Per-slide audio
{userId}/audio/{presentationId}/combined.wav           # Concatenated audio
{userId}/{uuid}.{ext}                       # Voice sample
{userId}/previews/{voiceId}.wav             # Cached voice preview
```

**Presigned URL expiry:** Upload 1h, download (owner) 1h, download (viewer) 7 days, voice preview 5min.

**Lazy SDK loading:** All AWS SDK imports use `import()` to prevent Turbopack bundling during static prerendering.

---

## Editor State Machine

```
Page load → fetch presentation from DB
  → has storagePath? → mode="editor" (restore from saved state)
  → no storagePath? → mode="upload" (show PptxUploadZone)
  → file accepted → mode="editor"
  → SlideEditor.processFile():
    1. Upload to R2 via presigned URL
    2. Parse PPTX text via JSZip
    3. Confirm upload → trigger PDF conversion
    4. Poll for PDF completion (2s interval, 150 max attempts)
    5. Show PDF viewer with SlidePdfViewer
    6. Auto-generate narrations via Gemini (first upload only)
    7. User clicks "Generate Audio" → sequential per-slide TTS
```

**Auto-save:** 2-second debounced PATCH to `/api/presentations/[id]/state` (JSONB `editor_state` column). Changed slides saved immediately (no debounce).

**Re-upload:** `compareSlides()` hashes slide content → diff types: identical, replacement, changed. Merge preserves unchanged narrations, carries reordered narrations.

---

## Narration Generation

**Route:** `POST /api/generate/narration`
- Model: Gemini 2.5 Flash
- API key: user's own (encrypted AES-256-GCM in DB) → fallback to env `GEMINI_API_KEY`
- Rate limit: 5/min per user (shared key only, in-memory Map)
- Input: slides with title (200 char cap) + bullets (500 char cap) — injection guard
- Output: JSON `{ "1": "narration text", "2": "...", ... }`
- Partial responses handled: `{ partial: true, missingSlides: [...] }`
- Error codes: `rate_limited`, `quota_exhausted`, `invalid_api_key`, `service_unavailable`

---

## Audio Generation

**Route:** `POST /api/generate/audio/slide` (sequential, per-slide)
- Resolves voice from DB (preset → `control_instruction`, cloned → download sample from R2)
- Calls VoxCPM via Gradio API
- MP3→WAV conversion via `mpg123-decoder` WASM
- Stores at `{userId}/audio/{presId}/slides/slide-{N}.wav`
- Deletes stale `combined.wav`, bumps `audio_version` via RPC

**Combined audio:** `GET /api/presentations/[id]/audio/combined` — checks R2 cache, concatenates per-slide WAVs via `concatWavBuffers()` if needed. Supports Range requests.

---

## View/Share Flow

```
/share → GET /api/view/[shareToken] → check gate requirements
  → gate? → CombinedGateDialog (password + email + reCAPTCHA)
  → email gate? → send magic link → EmailSentScreen → verify → redirect with ?session=
  → verified → fetch slides (PDFs from R2) + audio (combined WAV)
  → ViewSlide (react-pdf) + ViewAudioBar (Howler.js)
```

**Slide timing:** Server computes per-slide durations from WAV headers (Range requests). Client uses `detectSlide()` via RAF polling during playback.

**Tracking:** opened/progress(30s)/completed/closed events → `POST /api/view/[shareToken]/track`. `closed` uses `sendBeacon()`. Rate limit: 100 events/min/presentation.

---

## Rate Limiting

| Endpoint | Limit | Mechanism |
|----------|-------|-----------|
| Narration | 5/min/user (shared key) | In-memory Map |
| Waitlist | 3/hour/user | In-memory rate-limiter |
| Welcome email | 1/user/year + 5/IP/hour | In-memory rate-limiter |
| Gate submission | 5/IP/hour/presentation | DB COUNT |
| Gate emails | 20/presentation/day | DB COUNT |
| Track events | 100/min/presentation | DB COUNT |
| Presentations | 15 lifetime + 3/day | DB COUNT (quota.ts) |
| Voice clones | 1/user | DB COUNT (quota.ts) |
| Preset voices | 5/user | DB COUNT (quota.ts) |
| Feedback | 1/12hr | Cookie |

**Known weakness:** In-memory rate limiters reset on Vercel cold starts. DB-backed limits are authoritative.

---

## Environment Variables

**28 in active use.** Key groups:
- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **R2:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- **Worker:** `RENDER_WORKER_URL`, `RENDER_WORKER_API_KEY`
- **Email:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- **AI:** `GEMINI_API_KEY`, `VOXCPM2_SPACE_ID`, `INFERENCE_BASE_URL`
- **Security:** `ENCRYPTION_KEY` (AES-256), `RECAPTCHA_SECRET_KEY`
- **App:** `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`

**Missing from .env.example:** R2 vars, `API_KEY`, `CORS_ORIGIN`, `SUPABASE_URL` (worker), `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`

---

## Migration History

27 migrations (001-029, gaps at 002/003). Key additions:
- 008: users table + trigger
- 010: projects table
- 011: presentations table (final)
- 004-007: voices table + columns
- 016: share columns (token, password, gate)
- 017-018: viewers + viewer_events tables
- 021: feedback table
- 022: waitlist table
- 025: audio_version + increment function
- 026: performance indexes
- 028-029: sent_emails + email_queue tables

**Note:** `db/schema.sql` is outdated since migration 022. Migration files are authoritative.

---

## Worker Config

**Dockerfile:** `node:22-slim` + `libreoffice-impress` + `npm install --production`
**Dependencies:** express, zod, pdf-lib, node-fetch, @supabase/supabase-js, resend
**Endpoints:** POST /convert (PPTX→PDF), POST /queue/process (manual email trigger), GET /health
**Auth:** Constant-time API key comparison (no `crypto.timingSafeEqual`)
**Email queue:** Polls every 10s, batch of 5, max 3 retries

---

## Build/Deploy

- **Frontend:** Vercel (Next.js 16, Turbopack, Sentry integration)
- **Worker:** Render.com Docker (free tier)
- **No CI/CD:** No GitHub Actions, no `railway.toml`, no `render.yaml`
- **TypeScript:** Strict mode, `skipLibCheck: true`
- **Tailwind:** v4 (CSS-first config, no tailwind.config.ts)
- **ESLint:** v9 flat config with `next/core-web-vitals`
- **Sentry:** 100% trace sampling (should be reduced), session replay on errors

---

## Design System

**Fonts:** Geist (sans) + Geist Mono via `next/font/google`
**Colors:** Zinc/Slate neutrals + charcoal (#18181B) accent. No purples, neon blues, or gradient backgrounds.
**Custom tokens:** `--color-canvas` (#F9FAFB), `--color-surface` (#FFFFFF), `--color-charcoal` (#18181B), `--color-muted-steel` (#71717A)
**Dark mode:** Structurally ready (`@custom-variant dark`) but not shipped.
**Touch targets:** Custom utilities `touch-target` (48px) and `touch-target-sm` (44px)
**Spring curve:** `cubic-bezier(0.34, 1.56, 0.64, 1)` on interactive elements

---

## Third-Party Integrations

| Service | Status | Package |
|---------|--------|---------|
| Supabase | Active | @supabase/ssr, @supabase/supabase-js |
| Cloudflare R2 | Active | @aws-sdk/client-s3, @aws-sdk/s3-request-presigner |
| Resend | Active | resend |
| Gemini API | Active | @google/generative-ai |
| VoxCPM (Gradio) | Active | Raw fetch (no package) |
| Sentry | Active | @sentry/nextjs |
| Howler.js | Active | howler |
| react-pdf | Active | react-pdf |
| reCAPTCHA | Active | Script injection |
| Dodo Payments | **NOT wired** | Env vars only |
| Recharts | **Not installed** | Referenced in CLAUDE.md but not used |

---

## Known Issues (Critical)

1. **TOCTOU race on quotas:** Concurrent requests bypass limits (read-then-write with no DB isolation)
2. **COUNT errors disable limits:** `count ?? 0` passes every check on Supabase failure (fail-open)
3. **Session token leak:** Passed as `?session=` query param, leaks via Referer/history
4. **Session never expires:** Magic link says "15 minutes" but no code enforces after initial verification
5. **RLS on sent_emails/email_queue:** `USING (true)` allows any authenticated user full access (should be `service_role`)
6. **`generatingNarrations` stuck true:** Rate limit early return skips `setGeneratingNarrations(false)`
7. **In-memory rate limiters ineffective on Vercel:** Reset on cold starts

---

## LESSONS.md

7 tracked lessons (auto-logged by build agent):
- Turbopack caches stale `.ts` output when renaming to `.tsx`
- `forwardRef` + `next/dynamic` breaks — use ref object prop pattern
- View stale audio: added `audio_version` + RPC + polling
- Magic link used anon client (RLS blocked) → fixed to admin client
- WAV duration was downloading full files → fixed with Range header
- Regen flow had 4 stacked bugs → 3-step modal + cache invalidation
- Rate limit emails missing daily cap → DB-backed 20/day

See `LESSONS.md` for full entries.
