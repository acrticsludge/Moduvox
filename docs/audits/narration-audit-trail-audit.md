# Narration & Presentation Audit Trail — Schema Audit

**Date:** 2026-07-13  
**Auditor:** Build Agent  
**Scope:** Supabase schema, API routes, and editor state for narration/presentation generation and Smart Update flows

---

## 1. Current Data Model Summary

### Core Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `presentations` | `id`, `project_id`, `user_id`, `title`, `status` (draft/ready/archived), `previous_status`, `slide_count`, `editor_state` (JSONB), `share_token`, `password_hash`, `expires_at`, `email_gate_enabled`, `audio_version`, `created_at`, `updated_at` | Presentation metadata + editor state blob |
| `voices` | `id`, `user_id`, `name`, `type` (preset/cloned), `preset_id`, `sample_path`, `sample_duration_seconds`, `preview_audio_path`, `control_instruction`, `emotion_default`, `is_active`, `created_at`, `updated_at` | Voice profiles (preset + cloned) |
| `viewers` | `id`, `presentation_id`, `viewer_email`, `viewer_name`, `session_token`, `email_verified`, `consent_granted`, `verification_sent_at`, `ip_address`, `user_agent`, `viewed_at`, `completed_at`, `time_spent_seconds`, `progress_pct`, `created_at` | Share-link viewer tracking |
| `viewer_events` | `id`, `presentation_id`, `viewer_id`, `event_type`, `slide_number`, `progress_pct`, `time_spent_seconds`, `ip_address`, `user_agent`, `created_at` | Analytics events per viewer |

---

## 2. What Is Currently Tracked on Generation / Smart Update

### Narration (SlideEditor + editor_state)

| Field | Location | Tracks |
|-------|----------|--------|
| `narrations` | `editor_state.narrations` (JSONB) | Current narration text per slide (`Record<number, string>`) |
| `changedSlides` | `editor_state.changedSlides` (JSONB) | Slide numbers modified since last audio gen |
| `originalNarrationsRef` | Client-side `useRef` (not persisted) | Baseline for diff detection |
| `slideData` | `editor_state.slideData` | Parsed slide title + bullets |

**Missing:**
- ❌ **No version history** — only current narration survives
- ❌ **No content hash** — cannot detect external changes or verify integrity
- ❌ **No `generated_at` timestamp** per narration
- ❌ **No `generated_by` (user_id)** — can't audit who authored/edited
- ❌ **No per-slide voice metadata** — voice settings live globally in `editor_state`

### Audio Generation

| Field | Location | Tracks |
|-------|----------|--------|
| `audioGenerated` | `editor_state.audioGenerated` (boolean) | Whether any audio exists |
| `audioStoragePath` | `editor_state.audioStoragePath` | R2 prefix for per-slide WAVs |
| `audio_version` | `presentations.audio_version` (int) | Monotonic counter incremented on full regen |
| `changedSlides` | `editor_state.changedSlides` | Which slides need re-gen (Smart Update) |

**Missing:**
- ❌ **No per-slide audio metadata** — voice_id, voice_type, duration, generated_at, cfg_value
- ❌ **No linkage** between narration version and audio version
- ❌ **No regeneration reason** — voice_changed? content_changed? manual?

### Voice Settings (Global per Presentation)

| Field | Location |
|-------|----------|
| `selectedVoiceId` | `editor_state.selectedVoiceId` |
| `ultimateMode` | `editor_state.ultimateMode` |
| `controlInstructions` | `editor_state.controlInstructions` |

**Missing:**
- ❌ **No history** of voice changes
- ❌ **Not per-slide** — can't mix voices across slides

---

## 3. Voice-Clone Consent — Not Persisted

### Current UI (dashboard/voices/page.tsx:638-654)
```tsx
<label>
  <input type="checkbox" checked={voiceConsent} ... />
  <span>I confirm I have the right to use this voice</span>
  <p>This voice sample is my own voice or I have explicit permission...</p>
</label>
<button disabled={!voiceConsent} onClick={handleUploadClone}>Save Voice</button>
```

### Database (`voices` table)
| Column | Exists? |
|--------|---------|
| `consent_granted` | ❌ No |
| `consent_timestamp` | ❌ No |
| `consent_ip` | ❌ No |
| `consent_user_agent` | ❌ No |

### API (`/api/voices/upload/confirm`)
```typescript
// Only validates filePath + name
const { data: voice } = await supabase.from("voices").insert({
  user_id: user.id,
  name: name.trim(),
  type: "cloned",
  sample_path: filePath,
  // ...
});
```

**Finding:** Consent is a **purely client-side gate**. It is never written to the database. If a user bypasses the UI (direct API call, script, or future admin tool), a cloned voice can be created with zero audit trail of consent.

---

## 4. Gap Analysis — What's Missing for a Full Audit Trail

### A. `narration_versions` Table (Slide-Level Versioning)
| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `presentation_id` | UUID FK → presentations | Parent presentation |
| `slide_number` | INT | Slide identifier (1-based) |
| `content_hash` | CHAR(64) | SHA-256 of narration text (detects edits) |
| `narration_text` | TEXT | Full narration content |
| `voice_id` | UUID FK → voices | Voice used for this version |
| `voice_type` | TEXT (preset/cloned) | Denormalized for query speed |
| `voice_name` | TEXT | Denormalized |
| `control_instruction` | TEXT | Voice control instruction at generation time |
| `ultimate_mode` | BOOLEAN | Whether ultimate clone was active |
| `status` | TEXT (draft/pending/approved/published) | Approval state machine |
| `generated_by` | UUID FK → auth.users | Author (user or system) |
| `generated_at` | TIMESTAMPTZ | When this version was created |
| `approved_by` | UUID FK → auth.users | Approver (nullable) |
| `approved_at` | TIMESTAMPTZ | Approval timestamp |
| `published_at` | TIMESTAMPTZ | Publish timestamp |

**Index:** `(presentation_id, slide_number, generated_at DESC)`

### B. Approval State Machine
| State | Transitions To | Trigger |
|-------|----------------|---------|
| `draft` | `pending` | User submits for review |
| `pending` | `approved` / `draft` | Reviewer approves / requests changes |
| `approved` | `published` / `draft` | User publishes / reverts |
| `published` | `draft` | User unpublishes / edits |

**Enforcement:** RLS + CHECK constraints + application logic. Only `published` versions are served to viewers.

### C. `audit_log` Table (Immutable Event Stream)
| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `presentation_id` | UUID FK → presentations | |
| `slide_number` | INT (nullable) | Null = presentation-level event |
| `action` | TEXT | Enum: `narration_generated`, `narration_edited`, `audio_generated`, `audio_regenerated`, `voice_changed`, `voice_settings_changed`, `submitted_for_review`, `approved`, `rejected`, `published`, `unpublished`, `archived`, `slide_reordered`, `slide_added`, `slide_removed`, `pptx_reuploaded` |
| `actor_user_id` | UUID FK → auth.users | Who performed the action |
| `actor_role` | TEXT | `owner`, `collaborator`, `viewer`, `system` |
| `previous_state` | JSONB | Snapshot before change |
| `new_state` | JSONB | Snapshot after change |
| `metadata` | JSONB | Extra context (e.g., `{ "reason": "voice_changed", "slides": [3,5] }`) |
| `ip_address` | TEXT | |
| `user_agent` | TEXT | |
| `created_at` | TIMESTAMPTZ DEFAULT NOW() | Immutable |

**Indexes:**
- `(presentation_id, created_at DESC)`
- `(actor_user_id, created_at DESC)`
- `(action, created_at DESC)`

### D. Voice Clone Consent Columns (Add to `voices`)
| Column | Type | Default |
|--------|------|---------|
| `consent_granted` | BOOLEAN | `false` |
| `consent_timestamp` | TIMESTAMPTZ | NULL |
| `consent_ip` | TEXT | NULL |
| `consent_user_agent` | TEXT | NULL |

**Migration:** Backfill `consent_granted = true` for existing cloned voices (grandfathered), `consent_timestamp = created_at`.

---

## 5. Schema Diff & Migration Plan

### Phase 1: Voice Consent (Low Risk, Immediate)

```sql
-- 030_add_voice_consent_columns.sql
ALTER TABLE voices
  ADD COLUMN IF NOT EXISTS consent_granted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_ip TEXT,
  ADD COLUMN IF NOT EXISTS consent_user_agent TEXT;

-- Backfill existing cloned voices
UPDATE voices
SET consent_granted = true,
    consent_timestamp = created_at
WHERE type = 'cloned' AND consent_granted = false;

-- Update upload/confirm API to require + persist consent
-- Update voices page to pass consent fields
```

**API Changes:**
- `/api/voices/upload/confirm` → require `consent: true` in body, persist all 4 fields
- Add Zod validation: `consent: z.literal(true)`

---

### Phase 2: Narration Versioning (Core Audit Trail)

```sql
-- 031_create_narration_versions_table.sql
CREATE TABLE narration_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  slide_number INTEGER NOT NULL CHECK (slide_number > 0),
  content_hash CHAR(64) NOT NULL, -- SHA-256 hex
  narration_text TEXT NOT NULL,
  voice_id UUID REFERENCES voices(id) ON DELETE SET NULL,
  voice_type TEXT CHECK (voice_type IN ('preset', 'cloned')),
  voice_name TEXT,
  control_instruction TEXT,
  ultimate_mode BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'published')),
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  UNIQUE (presentation_id, slide_number, generated_at) -- natural key for idempotency
);

CREATE INDEX idx_narration_versions_presentation_slide
  ON narration_versions (presentation_id, slide_number, generated_at DESC);

CREATE INDEX idx_narration_versions_status
  ON narration_versions (status, generated_at DESC);

ALTER TABLE narration_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can CRUD narration versions"
  ON narration_versions
  USING (auth.uid() = (
    SELECT user_id FROM presentations WHERE id = narration_versions.presentation_id
  ))
  WITH CHECK (auth.uid() = (
    SELECT user_id FROM presentations WHERE id = narration_versions.presentation_id
  ));
```

**API Changes:**
- `/api/generate/narration` → on success, write to `narration_versions` (status: `draft`)
- SlideEditor `updateNarration` → on blur/save, write new version (status: `draft`)
- New endpoint: `POST /api/presentations/[id]/narration/[slide]/submit` → set status `pending`
- New endpoint: `POST /api/presentations/[id]/narration/[slide]/approve` → set status `approved`
- New endpoint: `POST /api/presentations/[id]/narration/[slide]/publish` → set status `published`

**Viewer API (`/api/view/...`):**
- Only serve `narration_versions` where `status = 'published'`
- Join to get approved narration text for TTS

---

### Phase 3: Audit Log (Immutable History)

```sql
-- 032_create_audit_log_table.sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  slide_number INTEGER, -- NULL = presentation-level
  action TEXT NOT NULL CHECK (action IN (
    'narration_generated', 'narration_edited', 'audio_generated', 'audio_regenerated',
    'voice_changed', 'voice_settings_changed',
    'submitted_for_review', 'approved', 'rejected', 'published', 'unpublished',
    'archived', 'slide_reordered', 'slide_added', 'slide_removed', 'pptx_reuploaded'
  )),
  actor_user_id UUID REFERENCES auth.users(id),
  actor_role TEXT CHECK (actor_role IN ('owner', 'collaborator', 'viewer', 'system')),
  previous_state JSONB,
  new_state JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_presentation_time
  ON audit_log (presentation_id, created_at DESC);

CREATE INDEX idx_audit_log_actor_time
  ON audit_log (actor_user_id, created_at DESC);

CREATE INDEX idx_audit_log_action_time
  ON audit_log (action, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read audit log"
  ON audit_log FOR SELECT
  USING (auth.uid() = (
    SELECT user_id FROM presentations WHERE id = audit_log.presentation_id
  ));

-- System/API inserts only (no direct user inserts)
CREATE POLICY "System can insert audit log"
  ON audit_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = (
    SELECT user_id FROM presentations WHERE id = audit_log.presentation_id
  ));
```

**Instrumentation Points (add to existing API routes):**

| Route | Action(s) to Log |
|-------|------------------|
| `POST /api/generate/narration` | `narration_generated` |
| `PATCH /api/presentations/[id]/state` (narrations change) | `narration_edited` |
| `POST /api/generate/audio/slide` | `audio_generated` (per slide) |
| `POST /api/presentations/[id]/audio/ensure` | `audio_regenerated` (combined) |
| `PATCH /api/presentations/[id]/state` (voice change) | `voice_changed`, `voice_settings_changed` |
| `POST /api/presentations/[id]/upload/confirm` (re-upload) | `pptx_reuploaded`, `slide_added`/`slide_removed`/`slide_reordered` |
| New narration approval endpoints | `submitted_for_review`, `approved`, `rejected`, `published`, `unpublished` |

**Helper (lib/audit.ts):**
```typescript
export async function logAudit(
  supabase: SupabaseClient,
  presentationId: string,
  action: AuditAction,
  opts: {
    slideNumber?: number;
    previousState?: Record<string, unknown>;
    newState?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  } = {}
) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("audit_log").insert({
    presentation_id: presentationId,
    slide_number: opts.slideNumber,
    action,
    actor_user_id: user?.id,
    actor_role: "owner",
    previous_state: opts.previousState ?? null,
    new_state: opts.newState ?? null,
    metadata: opts.metadata ?? {},
  });
}
```

---

### Phase 4: Presentation Status Alignment

Currently `presentations.status` = `draft | ready | archived`.  
Add `published` state to align with narration approval flow:

```sql
-- 033_add_published_status.sql
ALTER TABLE presentations
  ALTER COLUMN status TYPE TEXT
  USING status::TEXT; -- drop check constraint

ALTER TABLE presentations
  ADD CONSTRAINT presentations_status_check
  CHECK (status IN ('draft', 'ready', 'published', 'archived'));
```

**Semantic mapping:**
- `draft` → working copy, narration versions in `draft`/`pending`
- `ready` → narration versions `approved`, audio generated, not yet shared
- `published` → live share link, narration versions `published`, served to viewers
- `archived` → read-only

---

## 6. Backfill Strategy

| Table | Strategy |
|-------|----------|
| `narration_versions` | For each presentation, read `editor_state.narrations` + `selectedVoiceId` + `controlInstructions` + `ultimateMode`. Create one version per slide with `generated_at = presentations.updated_at`, `status = 'published'` if `status = 'ready'` else `draft`. |
| `audit_log` | Seed one `presentation_created` event per presentation at `created_at`. Seed `narration_generated` for each backfilled narration version. |

---

## 7. API Contract Changes (Breaking)

| Endpoint | Change |
|----------|--------|
| `GET /api/view/[shareToken]` | Join `narration_versions` where `status = 'published'` |
| `GET /api/view/[shareToken]/slides` | Same |
| `POST /api/generate/narration` | Returns `narrationVersionId`; writes to `narration_versions` |
| `PATCH /api/presentations/[id]/state` | Triggers audit log on narration/voice changes |
| New: `POST /api/presentations/[id]/narration/[slide]/submit` | Set status `pending` |
| New: `POST /api/presentations/[id]/narration/[slide]/approve` | Set status `approved` |
| New: `POST /api/presentations/[id]/narration/[slide]/publish` | Set status `published` |
| New: `GET /api/presentations/[id]/audit-log` | Paginated audit log for owner |

---

## 8. Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Voice consent columns | Low | Additive, default `false`, backfill existing |
| `narration_versions` table | Medium | New table, no existing deps. Backfill script required. |
| `audit_log` table | Low | Append-only, no reads in hot path. |
| Status enum change | Medium | Coordinated deploy: migration → API → frontend. Feature flag `published` status. |
| Viewer API join | Medium | Add index on `narration_versions(status, presentation_id, slide_number)`. Test query plan. |

---

## 9. Recommended Implementation Order

1. **030** Voice consent columns + API enforcement (1 day)
2. **031** `narration_versions` table + backfill script (2 days)
3. **032** `audit_log` table + instrumentation in 5-6 key API routes (2 days)
4. **033** Status enum + viewer API migration (1 day)
5. Frontend: approval UI (draft/pending/approved/published badges, submit/approve buttons) (2 days)
6. Frontend: audit log viewer (read-only table) (1 day)

**Total:** ~9 days for full audit trail MVP.