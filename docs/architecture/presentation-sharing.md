# Presentation Sharing — Architecture Plan

> **Branch:** `feat/share-presentation`  
> **Status:** Planning — ready for Phase 1 implementation  
> **PRD Reference:** `docs/PRD.md` — Shareable Link (FR-7), Email Gate (FR-6), Viewer Dashboard (FR-6.4/6.5)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Model Changes](#2-data-model-changes)
3. [Component Inventory](#3-component-inventory)
4. [Data Flow](#4-data-flow)
5. [Build Sequence](#5-build-sequence)
   - [Phase 1: Schema + Types](#phase-1-schema--types)
   - [Phase 2: API — Share Settings](#phase-2-api--share-settings)
   - [Phase 3: API — Public View + Magic Link](#phase-3-api--public-view--magic-link)
   - [Phase 4: Page — Hosted Player](#phase-4-page--hosted-player)
   - [Phase 5: API + UI — Viewer Dashboard](#phase-5-api--ui--viewer-dashboard)
6. [Security Considerations](#6-security-considerations)
7. [Files to Create / Modify](#7-files-to-create--modify)
8. [Dependencies](#8-dependencies)

---

## 1. Overview

The sharing feature covers three P0 capabilities from the PRD:

| Capability | Priority | Description |
|---|---|---|
| **Shareable Link** | P0 | Unique URL per presentation (`/view/{share_token}`), optional password, optional expiration |
| **Email Gate with Magic Link** | P0 | Viewer enters name + email + consent checkbox → receives magic link to verify identity |
| **Viewer Dashboard + CSV Export** | P0 | Per-presentation table: Name, Email, Status, Completion %, Time Spent, Date. Exportable. |

---

## 2. Data Model Changes

### presentations — Add columns

```sql
ALTER TABLE presentations ADD COLUMN share_token UUID DEFAULT gen_random_uuid();
ALTER TABLE presentations ADD COLUMN password_hash TEXT;              -- bcrypt, nullable
ALTER TABLE presentations ADD COLUMN expires_at TIMESTAMPTZ;          -- nullable
ALTER TABLE presentations ADD COLUMN email_gate_enabled BOOLEAN DEFAULT false;

CREATE UNIQUE INDEX idx_presentations_share_token ON presentations(share_token);
```

### viewers — New table

```sql
CREATE TABLE viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  viewer_email TEXT NOT NULL,
  viewer_name TEXT NOT NULL,
  session_token UUID DEFAULT gen_random_uuid(),
  email_verified BOOLEAN DEFAULT false,
  consent_granted BOOLEAN DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  viewed_at TIMESTAMPTZ,           -- set when they first start watching
  completed_at TIMESTAMPTZ,        -- set when they reach 100%
  time_spent_seconds INTEGER DEFAULT 0,
  progress_pct NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_viewers_presentation_id ON viewers(presentation_id);
```

### viewer_events — New table

```sql
CREATE TABLE viewer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES viewers(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('opened', 'slide_viewed', 'completed', 'closed')),
  slide_number INTEGER,
  progress_pct NUMERIC(5,2),
  time_spent_seconds INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_viewer_events_presentation ON viewer_events(presentation_id);
```

### RLS Policies

```sql
-- presentations: owner can write share columns; share_token readable by all (for view page)
CREATE POLICY "Owner can update share settings"
ON presentations FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read share_token data"
ON presentations FOR SELECT
USING (true);  -- only share_token, title, slide_count, expires_at exposed via view endpoint

-- viewers: owner can read; anyone can insert (gate endpoint)
CREATE POLICY "Owner can read viewers"
ON viewers FOR SELECT
USING (
  auth.uid() = (SELECT user_id FROM presentations WHERE id = viewers.presentation_id)
);

CREATE POLICY "Anyone can insert viewers"
ON viewers FOR INSERT
WITH CHECK (true);

-- viewer_events: owner can read; anyone can insert (track endpoint)
CREATE POLICY "Owner can read viewer events"
ON viewer_events FOR SELECT
USING (
  auth.uid() = (SELECT user_id FROM presentations WHERE id = viewer_events.presentation_id)
);

CREATE POLICY "Anyone can insert viewer events"
ON viewer_events FOR INSERT
WITH CHECK (true);
```

### TypeScript Types

```ts
// frontend/lib/validations/presentation.ts — extend existing Presentation type
export type Presentation = {
  id: string
  project_id: string
  user_id: string
  title: string
  status: PresentationStatus
  slide_count: number
  share_token: string         // NEW
  password_hash: string | null // NEW
  expires_at: string | null    // NEW
  email_gate_enabled: boolean  // NEW
  created_at: string
  updated_at: string
}

// frontend/lib/validations/share.ts — NEW
import { z } from "zod"

export const updateShareSettingsSchema = z.object({
  email_gate_enabled: z.boolean().optional(),
  password: z.string().min(1).max(128).nullable().optional(),  // set to null to clear
  expires_at: z.string().datetime().nullable().optional(),       // ISO 8601 or null to clear
})

export const emailGateSchema = z.object({
  viewer_name: z.string().min(1, "Name is required").max(200),
  viewer_email: z.string().email("Valid email is required"),
  consent_granted: z.literal(true, {
    errorMap: () => ({ message: "You must confirm you are watching for yourself" }),
  }),
})

export const viewerEventSchema = z.object({
  viewer_id: z.string().uuid(),
  event_type: z.enum(["opened", "slide_viewed", "completed", "closed"]),
  slide_number: z.number().int().positive().optional(),
  progress_pct: z.number().min(0).max(100).optional(),
  time_spent_seconds: z.number().int().min(0).optional(),
})

export const trackEventSchema = viewerEventSchema.extend({
  session_token: z.string().uuid(),
})

export type UpdateShareSettingsInput = z.infer<typeof updateShareSettingsSchema>
export type EmailGateInput = z.infer<typeof emailGateSchema>
export type ViewerEventInput = z.infer<typeof viewerEventSchema>
export type TrackEventInput = z.infer<typeof trackEventSchema>
```

---

## 3. Component Inventory

### New Components (7)

| Component | Path | Purpose |
|---|---|---|
| `ShareSettingsPanel` | `components/dashboard/ShareSettingsPanel.tsx` | Panel in editor: toggle email gate, set/clear password, set expiration, copy link, copy invite message, info tooltip about magic link verification |
| `ViewerTable` | `components/dashboard/ViewerTable.tsx` | Table: Name, Email, Status, Completion %, Time, Date. Sortable. CSV export button. |
| `ViewPlayer` | `components/view/ViewPlayer.tsx` | Guest-facing player — slide display, combined audio with auto-advance, prev/next, play/pause, progress bar |
| `EmailGateDialog` | `components/view/EmailGateDialog.tsx` | Modal: name + email + consent checkbox + "Send Verification Link" button |
| `EmailSentScreen` | `components/view/EmailSentScreen.tsx` | "Check your inbox" confirmation with resend link |
| `PasswordGateDialog` | `components/view/PasswordGateDialog.tsx` | Modal: password input, verify button |
| `VerifyErrorScreen` | `components/view/VerifyErrorScreen.tsx` | "Link expired or invalid" error with "Request new link" button |

### New Utilities (1)

| File | Purpose |
|---|---|
| `lib/wav-duration.ts` | Read WAV binary header → compute `durationMs` for per-slide timing data |

### Modified Components (1)

| Component | Change |
|---|---|
| `CreatePageSidebar` (or the editor page directly) | Add tab/toggle that shows `ShareSettingsPanel` and `ViewerTable` after audio is generated |

---

## 4. Data Flow

### Share Settings Flow (Owner)

```
Editor Page → Share tab/section (shown after audio generated)
  → Toggle email gate on/off
  → Set/clear password (POST /api/presentations/[id]/share — bcrypt hashed)
  → Set expiration date
  → Copy link: moduvox.com/view/{share_token}
  → Copy invite message (pre-formatted with link + instructions)
```

### Viewer Flow (Magic Link)

```
Viewer clicks moduvox.com/view/{share_token}
  │
  ▼
GET /api/view/[shareToken]
  ← Check expires_at → expired? → Show "This link has expired"
  ← Has password_hash? → PasswordGate → verify via POST /gate
  ← email_gate_enabled = true → EmailGateDialog
      │
      ▼
  Viewer fills: Name, Email, ☐ consent checkbox
  → POST /api/view/[shareToken]/gate
      → Backend:
          1. Verify password (if set)
          2. Validate consent checkbox = true
          3. INSERT into viewers (email_verified=false, session_token=UUID)
          4. Send magic link email via Resend
             └─ Subject: "Verify your email to watch {presentation_title}"
             └─ Body: "{name}, click to verify: {origin}/view/{token}/verify?vt={session_token}"
          5. Return { ok: true }
      │
      ▼
  Viewer sees EmailSentScreen: "📧 Check your inbox — we've sent a magic link"
  └─ Optional: "Resend" button → re-sends email using same session_token
      │
      ▼
  Viewer checks email → clicks magic link
  → GET /api/view/[shareToken]/verify?vt={session_token}
      → Backend:
          1. FIND viewers WHERE session_token = vt AND presentation share_token matches
          2. If not found or already used → show "Link expired or invalid"
          3. SET email_verified = true, SET viewed_at = NOW()
          4. Generate short-lived player session token
          5. Redirect to: /view/{share_token}?session={new_token}
      │
      ▼
  Player page loads with session token
  → Validates session token, email_verified = true
  → Loads ViewPlayer with:
      - Slide data + narration text from presentation
      - Combined audio URL (/api/presentations/{id}/audio/combined)
      - Per-slide timing data (computed from WAV headers)
      │
      ▼
  Player auto-plays, fires tracking events:
    "opened"       → POST /track on first play
    "slide_viewed" → POST /track on each slide advance
    "completed"    → POST /track when last slide ends
    "closed"       → POST /track on page leave (visibilitychange / beforeunload)
```

### Auto-Advance Timing

Auto-advance uses per-slide WAV duration, computed on-the-fly:

```
GET /api/view/[shareToken]
  → List all per-slide WAVs from storage bucket:
      {userId}/audio/{presentationId}/slides/slide-{N}.wav
  → For each WAV, read header bytes → compute durationMs:
      dataSize / (sampleRate * numChannels * bitsPerSample/8)
  → Return:
      {
        slides: [{ number, title, bullets, narration }],
        combinedAudioUrl: "...",
        timings: [{ slideNumber: 1, durationMs: 12450 }, ...],
        totalDurationMs: 124500
      }
```

The player maintains a `currentTime` tracker on the combined `<audio>` element. On each `timeupdate` event, it maps the current position to cumulative timing buckets to determine which slide to display.

---

## 5. Build Sequence

### Phase 1: Schema + Types

**Goal:** Database exists, types compile, no runtime code yet.

**Steps:**

- [ ] **1.1** Execute DDL in Supabase dashboard SQL editor:
  - `ALTER TABLE presentations ADD COLUMN` — `share_token`, `password_hash`, `expires_at`, `email_gate_enabled`
  - `CREATE UNIQUE INDEX idx_presentations_share_token`
- [ ] **1.2** Execute DDL for `viewers` table
- [ ] **1.3** Execute DDL for `viewer_events` table
- [ ] **1.4** Execute RLS policy statements
- [ ] **1.5** Install `bcryptjs`:
  ```bash
  cd frontend && npm install bcryptjs && npm install -D @types/bcryptjs
  ```
- [ ] **1.6** Create `frontend/lib/validations/share.ts` with Zod schemas
- [ ] **1.7** Update `frontend/lib/validations/presentation.ts`:
  - Add `share_token`, `password_hash`, `expires_at`, `email_gate_enabled` to `Presentation` type
  - Add `share_token` to `updatePresentationSchema`? (No — share settings get own route)
- [ ] **1.8** Verify types compile: `cd frontend && npx tsc --noEmit`

**Verification:** Types check passes without errors.

---

### Phase 2: API — Share Settings

**Goal:** Owner can toggle email gate, set/clear password, set expiration.

**Steps:**

- [ ] **2.1** Create `frontend/app/api/presentations/[id]/share/route.ts` — `GET`:
  - Auth: verify ownership
  - Return `{ share_token, has_password: !!password_hash, expires_at, email_gate_enabled }`
- [ ] **2.2** Same file — `PATCH`:
  - Auth: verify ownership
  - Validate body with `updateShareSettingsSchema`
  - If `password` is provided and non-null: `bcrypt.hash(password, 12)` → store in `password_hash`
  - If `password` is `null`: clear `password_hash`
  - If `expires_at` is `null`: clear `expires_at`
  - Return updated presentation
- [ ] **2.3** Create `ShareSettingsPanel.tsx` — UI for the editor page:
  - Shows share link with copy button
  - Email gate toggle with info text about magic link verification
  - Password set/clear (input to set, button to clear)
  - Expiration date picker (basic `<input type="date">`)
  - "Copy Invite" button — copies pre-formatted message
  - Fetches from `GET /api/presentations/[id]/share` on mount
  - Mutations via `PATCH` on change
- [ ] **2.4** Wire `ShareSettingsPanel.tsx` into the editor page:
  - Show as a tab or expandable section below the audio player
  - Only visible when `audioGenerated === true`

**Verification:** Owner can toggle email gate, set password (reload — hash persists), set expiration, copy link.

---

### Phase 3: API — Public View + Magic Link

**Goal:** Public endpoints for the viewer flow — look up presentation, gate, verify, track.

**Steps:**

- [ ] **3.1** Create `frontend/app/api/view/[shareToken]/route.ts` — `GET`:
  - No auth (public)
  - Find presentation by `share_token`:
    - If `expires_at` is past → `return { error: "expired" }`
  - If `email_gate_enabled`, return minimal metadata (title, has_password) — no slide content yet
  - If not gated, return full data:
    - `{ title, slides: [{ number, title, bullets }], narrations, combinedAudioUrl, timings: [...] }` (computed from WAV durations via `wav-duration.ts`)
- [ ] **3.2** Create `frontend/lib/wav-duration.ts`:
  - `getWavDuration(buffer: ArrayBuffer): number` — parse RIFF/WAV header, compute duration
  - `getAllSlideDurations(userId, presentationId): Promise<{ slideNumber, durationMs }[]>` — list storage bucket files matching pattern, fetch each, compute
- [ ] **3.3** Create `frontend/app/api/view/[shareToken]/gate/route.ts` — `POST`:
  - No auth (public)
  - If password set: verify with `bcrypt.compare(password, password_hash)` — fail if mismatch
  - Validate body with `emailGateSchema`
  - `INSERT INTO viewers (presentation_id, viewer_email, viewer_name, consent_granted, ip_address, user_agent, email_verified=false, session_token=uuid)`
  - Send magic link email via Resend:
    - Subject: `"Verify your email to watch {title}"`
    - Content: `"{name}, click to verify: {baseUrl}/view/{shareToken}/verify?vt={session_token}"`
  - Return `{ ok: true }`
- [ ] **3.4** Create `frontend/app/api/view/[shareToken]/verify/route.ts` — `GET`:
  - No auth (public)
  - Read `vt` query param (session_token)
  - Find viewer by session_token + presentation share_token
  - If not found or already verified → return `{ error: "invalid_link" }`
  - Set `email_verified = true`, `viewed_at = NOW()`
  - Generate short-lived player session (could re-use the same session_token or generate a new one)
  - Return success with `{ viewer_id, session_token }` — client stores in sessionStorage
- [ ] **3.5** Create `frontend/app/api/view/[shareToken]/track/route.ts` — `POST`:
  - No auth (public)
  - Validate body with `trackEventSchema`
  - Verify session_token matches a known viewer session
  - If `event_type = "opened"` → update `viewers.viewed_at`
  - If `event_type = "completed"` → update `viewers.completed_at`, `viewers.progress_pct = 100`
  - If `event_type = "slide_viewed"` → update `viewers.progress_pct`
  - INSERT into `viewer_events`
  - Rate limit: 100 requests per minute per presentation (reject with 429)
  - Return `{ ok: true }`

**Verification with curl/Postman:**
- `GET /api/view/{share_token}` returns presentation metadata
- `POST /api/view/{share_token}/gate` with valid input sends email, returns ok
- `GET /api/view/{share_token}/verify?vt={session_token}` marks verified
- `POST /api/view/{share_token}/track` with valid session stores event

---

### Phase 4: Page — Hosted Player

**Goal:** `/view/{shareToken}` page renders the player with the full magic link flow.

**Steps:**

- [ ] **4.1** Update `frontend/proxy.ts` — **critical:** ensure `/view/:path*` is NOT matched by auth middleware:
  ```ts
  export const config = {
    matcher: [
      "/dashboard/:path*",
      "/settings/:path*",
      // /view is intentionally excluded (public)
    ],
  }
  ```
- [ ] **4.2** Create `frontend/app/view/[shareToken]/page.tsx` — client component:
  - **State machine:** `loading | password_gate | email_gate | email_sent | verify_error | player | expired`
  - On mount, `GET /api/view/[shareToken]`:
    - `expired` → show expired screen
    - `has_password` → show `PasswordGateDialog`
    - `email_gate_enabled` → show `EmailGateDialog`
    - otherwise → show player
  - After gate submission → show `EmailSentScreen`
  - On verify redirect (check URL params for `?vt=` or `?session=`) → validate session → load player
- [ ] **4.3** Create `PasswordGateDialog.tsx`:
  - Password input + submit
  - On submit: `POST /api/view/[shareToken]/gate` with body `{ password }` — if wrong, show error
  - On success, advance to next state
- [ ] **4.4** Create `EmailGateDialog.tsx`:
  - Name `<input>`, Email `<input>`, Consent checkbox with label text
  - "ℹ️ This verifies your identity and prevents watching on behalf of someone else."
  - Submit: `POST /api/view/[shareToken]/gate` with `{ viewer_name, viewer_email, consent_granted: true }`
  - On success → advance to `EmailSentScreen`
- [ ] **4.5** Create `EmailSentScreen.tsx`:
  - "📧 Check your inbox" message with the email shown
  - "Resend" button
  - "Didn't receive it?" → check spam instructions
  - Polls or waits for verification (poll `/verify` status, or just let user return after clicking link)
- [ ] **4.6** Create `ViewPlayer.tsx`:
  - Receives: `slides`, `narrations`, `combinedAudioUrl`, `timings`, `presentationId`, `viewerId`, `sessionToken`
  - **Slide display:** renders slide title + number + bullet list (styled nicely, full-width)
  - **Audio:** `<audio>` element with `combinedAudioUrl`, auto-plays
  - **Auto-advance:** `timeupdate` listener maps `currentTime` to timing buckets → updates displayed slide
  - **Controls:** play/pause, prev/next slide, progress bar (shows slide position)
  - **Tracking hooks:**
    - `onPlay` → POST `opened` event (once per session)
    - On slide change → POST `slide_viewed` with `slide_number + progress_pct`
    - `onEnded` → POST `completed`
    - `visibilitychange` / `beforeunload` → POST `closed` with accumulated `time_spent_seconds`
- [ ] **4.7** Create `VerifyErrorScreen.tsx`:
  - "This verification link has expired or is invalid."
  - "Request a new link" button → go back to email gate state

**Verification:** Visit `/view/{share_token}` in incognito. Full flow works: gate → email → click magic link → player loads with audio auto-advancing slides.

---

### Phase 5: API + UI — Viewer Dashboard

**Goal:** Owner sees who watched, and can export CSV.

**Steps:**

- [ ] **5.1** Create `frontend/app/api/presentations/[id]/viewers/route.ts` — `GET`:
  - Auth: verify ownership
  - Query `viewers` WHERE `presentation_id = id`:
    - Include aggregated stats from `viewer_events` (first opened, last activity)
    - Derive `status`: not_viewed | in_progress | completed
  - Return paginated list: `{ viewers: [...], total, page }`
  - Order by most recent first
- [ ] **5.2** Create `frontend/app/api/presentations/[id]/viewers/export/route.ts` — `GET`:
  - Auth: verify ownership
  - Query all viewers for presentation
  - Return CSV with Content-Disposition header:
    ```csv
    Name,Email,Status,Completion %,Time Spent (min),First Viewed,Completed At
    Alex Smith,alex@co.com,Completed,100,12.5,2026-06-28 14:30,2026-06-28 14:42
    ```
- [ ] **5.3** Create `ViewerTable.tsx`:
  - Props: `presentationId` (fetches data internally)
  - Columns: Name, Email, Status (badge: green = completed, yellow = in progress, gray = not viewed), Completion % (bar), Time Spent, Date
  - Sortable columns
  - Empty state: "No viewers yet. Share your presentation link to get started."
  - Export CSV button → triggers download from `/export`
  - Auto-refresh: poll every 30 seconds when the tab is visible
- [ ] **5.4** Wire `ViewerTable` into the editor page:
  - Show below the share settings panel, or as a separate tab
  - Only visible when `audioGenerated === true`
  - Refresh when presentation loads

**Verification:** Owner opens a shared presentation where someone has watched → sees viewer row. Clicks export → downloads CSV with correct data.

---

## 6. Security Considerations

| Concern | Mitigation |
|---|---|
| **Password in plaintext** | bcryptjs hash, never stored or logged in plaintext |
| **Magic link reuse** | `Link is valid for 15 minutes` (set `session_token_issued_at`). Once used, `email_verified=true`, link cannot be replayed. |
| **Brute force /guess share_token** | UUID v4 (122 bits of entropy) — astronomically unlikely to guess |
| **Brute force password** | Server-side rate limit on `/gate`: 5 attempts per IP per minute |
| **Tracking abuse** | `/track` rate-limited to 100 req/min per presentation. Session_token required. |
| **Auth bypass** | `/view/*` explicitly excluded from middleware matcher. View endpoints are stateless public routes. |
| **Expired links** | Checked server-side on every request — can't bypass by bookmarking. |
| **CSV data leak** | Export endpoint requires owner authentication (Supabase session cookie). |
| **Consent checkbox** | Stored as `consent_granted` in DB with timestamp for audit trail. |
| **CORS** | No CORS needed — all requests are same-origin (moduvox.com). If embedded in iframe is needed later, add explicitly. |

---

## 7. Files to Create / Modify

### New Files (16)

```
frontend/lib/validations/share.ts                        # Zod schemas for share settings, email gate, tracking
frontend/lib/wav-duration.ts                              # WAV header parsing for per-slide timing

frontend/app/api/presentations/[id]/share/route.ts        # GET + PATCH share settings
frontend/app/api/view/[shareToken]/route.ts               # GET public presentation data
frontend/app/api/view/[shareToken]/gate/route.ts          # POST password verify + email gate + magic link
frontend/app/api/view/[shareToken]/verify/route.ts        # GET magic link verification
frontend/app/api/view/[shareToken]/track/route.ts         # POST viewer event tracking
frontend/app/api/presentations/[id]/viewers/route.ts      # GET viewer list
frontend/app/api/presentations/[id]/viewers/export/route.ts # GET CSV export

frontend/app/view/[shareToken]/page.tsx                   # Public player page (client component)

frontend/components/view/ViewPlayer.tsx                    # Slide + audio player with auto-advance
frontend/components/view/EmailGateDialog.tsx               # Name + email + consent form
frontend/components/view/EmailSentScreen.tsx               # "Check your inbox" confirmation
frontend/components/view/PasswordGateDialog.tsx            # Password input form
frontend/components/view/VerifyErrorScreen.tsx             # "Link expired" error

frontend/components/dashboard/ShareSettingsPanel.tsx       # Share settings in editor
frontend/components/dashboard/ViewerTable.tsx              # Viewer tracking table
```

### Modified Files (4)

```
frontend/lib/validations/presentation.ts                   # Add share_token, password_hash, etc. to type
frontend/proxy.ts                                          # Ensure /view/:path* excluded from matcher
frontend/app/api/presentations/route.ts                    # Add share_token: gen_random_uuid() on create
frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx
  # Wire ShareSettingsPanel + ViewerTable when audioGenerated === true
```

### Backfill Existing Presentations

On deploy, existing presentations need a `share_token`:
```sql
UPDATE presentations SET share_token = gen_random_uuid() WHERE share_token IS NULL;
```

This happens automatically if the column has `DEFAULT gen_random_uuid()` — existing rows will get the default on next write, but we should run the update to populate immediately.

---

## 8. Dependencies

### npm

```bash
cd frontend && npm install bcryptjs && npm install -D @types/bcryptjs
```

`bcryptjs` is a pure-JS bcrypt implementation (~80KB). No native compilation needed.

### Resend Email

Magic link email uses the existing Resend integration. Requires no new configuration — just a transactional email send from within the gate API route.

**Email template contents:**

| Field | Value |
|---|---|
| From | `Moduvox <noreply@moduvox.com>` |
| To | `{viewer_email}` |
| Subject | `Verify your email to watch "{presentation_title}"` |
| Body (text) | `Hi {viewer_name},\n\nClick this link to verify your email and start watching:\n{verification_url}\n\nThis link expires in 15 minutes.\n\n— Moduvox` |

### Supabase (existing)

No new buckets needed. No new service config. Just the new tables and columns.
