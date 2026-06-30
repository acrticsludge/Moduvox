# Free Tier Enforcement Design

> Approved design for enforcing free tier limits (15 presentations lifetime, 3/day, 1 voice clone) with waitlist capture for upcoming Pro/Team tiers.

**Status:** Approved
**Date:** 2026-06-30
**Author:** AI (brainstorming skill)

---

## 1. Architecture Overview

Centralized quota service (`lib/quota.ts`) called by API routes before creating resources. No schema changes needed to existing tables — limits are enforced via DB COUNT queries. When a limit is hit, the API returns 429 with structured error data, and the client shows a waitlist dialog for "Pro coming soon."

### Key Decisions
- **Approach:** Centralized quota service (Approach 2)
- **UX:** Block + "Pro coming soon — join waitlist" with email capture
- **Daily window:** Calendar day (UTC midnight)
- **Voice clone limit:** Only `type='cloned'` counts toward the limit

---

## 2. Quota Service (`lib/quota.ts`)

### Types

```typescript
interface QuotaResult {
  allowed: boolean;
  limit: number;
  current: number;
  /** Human-readable message for the user */
  message?: string;
  /** Key identifying which limit was hit (for the UI dialog) */
  limitKey?: "presentations_lifetime" | "presentations_daily" | "voice_clones";
}
```

### Free Tier Limits

```typescript
const FREE_LIMITS = {
  presentations_lifetime: 15,
  presentations_daily: 3,
  voice_clones: 1,
} as const;
```

Initially hardcoded. When paid tiers arrive, replace with a lookup function:
```typescript
async function getLimits(userId: string): Promise<typeof FREE_LIMITS>
```

### Functions

| Function | DB Query | When to call |
|---|---|---|
| `checkPresentationQuota(client, userId)` | `COUNT(*) FROM presentations WHERE user_id = $1` | Before creating a presentation |
| `checkDailyPresentationQuota(client, userId)` | `COUNT(*) FROM presentations WHERE user_id = $1 AND created_at >= today UTC` | Before creating a presentation |
| `checkVoiceCloneQuota(client, userId)` | `COUNT(*) FROM voices WHERE user_id = $1 AND type = 'cloned'` | Before uploading a clone |

### Helper

```typescript
function quotaBlockResponse(result: QuotaResult): NextResponse
```

Returns `{ error, limitKey, limit, current }` with status 429.

---

## 3. Waitlist Table (Migration 022)

```sql
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  interest TEXT NOT NULL CHECK (interest IN ('pro', 'team', 'both')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage waitlist" ON waitlist
  FOR ALL USING (auth.role() = 'service_role');
```

- One row per user (upsert semantics)
- `interest` captures whether they want Pro, Team, or both
- RLS: service_role only (admin read access)
- No public read/write — only the API route with admin client can write

---

## 4. Waitlist API (`POST /api/waitlist`)

### Request

```json
{
  "interest": "pro" | "team" | "both"
}
```

### Response

- **201:** `{ data: { id } }`
- **400:** Zod validation error
- **401:** Unauthorized

### Logic

1. Auth check via `supabase.auth.getUser()`
2. Validate `interest` with Zod enum
3. Upsert into `waitlist` table (by `user_id`)
4. Return `{ data: { id } }`

---

## 5. Limit-Hit UI (WaitlistDialog)

A reusable dialog component displayed when any quota check fails.

### States

| State | Content |
|---|---|
| **Form** | Title "Pro is on its way", description with specific limit info, interest checkboxes (Pro / Team), pre-filled email, submit button, cancel link |
| **Submitting** | Submit button shows spinner, inputs disabled |
| **Success** | "You're on the list! We'll notify you when Pro launches." with close button |
| **Error** | Inline error message, form remains editable |

### Integration Points

| Component | Trigger | Limit Key |
|---|---|---|
| `CreatePresentationDialog` | 429 from `POST /api/presentations` | `presentations_lifetime` or `presentations_daily` |
| `AddVoiceModal` | 429 from `POST /api/voices/upload` | `voice_clones` |

The dialog dynamically shows the appropriate message based on `limitKey`:
- `presentations_lifetime`: "You've reached the lifetime limit of 15 presentations"
- `presentations_daily`: "You've reached the daily limit of 3 presentations. Try again tomorrow."
- `voice_clones`: "You've reached the limit of 1 voice clone"

---

## 6. API Route Changes

### `POST /api/presentations` (lines 40-50)

Insert between auth check and DB insert:

```typescript
// Check lifetime quota
const lifetimeCheck = await checkPresentationQuota(supabase, user.id);
if (!lifetimeCheck.allowed) {
  return quotaBlockResponse(lifetimeCheck);
}

// Check daily quota
const dailyCheck = await checkDailyPresentationQuota(supabase, user.id);
if (!dailyCheck.allowed) {
  return quotaBlockResponse(dailyCheck);
}
```

### `POST /api/voices/upload` (lines 57-68)

Insert after file validation, before DB insert:

```typescript
const cloneCheck = await checkVoiceCloneQuota(supabase, user.id);
if (!cloneCheck.allowed) {
  return quotaBlockResponse(cloneCheck);
}
```

### No changes needed
- `POST /api/voices` (preset voices) — no limit
- All other routes — unaffected

---

## 7. Error Response Contract

When a limit is hit, the API returns:

```json
{
  "error": "You've reached the lifetime limit of 15 presentations.",
  "limitKey": "presentations_lifetime",
  "limit": 15,
  "current": 15
}
```

Status: **429 Too Many Requests**

The client uses `limitKey` to render the appropriate dialog message and knows which limit was hit.

---

## 8. File Changes Summary

| File | Action |
|---|---|
| `frontend/lib/quota.ts` | **Create** — quota service with 3 check functions + helper |
| `docs/migrations/022_create_waitlist_table.sql` | **Create** — waitlist table migration |
| `frontend/app/api/waitlist/route.ts` | **Create** — waitlist upsert endpoint |
| `frontend/lib/validations/waitlist.ts` | **Create** — Zod schema for waitlist request |
| `frontend/components/dashboard/WaitlistDialog.tsx` | **Create** — limit-hit waitlist dialog |
| `frontend/app/api/presentations/route.ts` | **Modify** — add quota checks before insert |
| `frontend/app/api/voices/upload/route.ts` | **Modify** — add voice clone quota check before insert |
| `frontend/components/dashboard/CreatePresentationDialog.tsx` | **Modify** — handle 429, show WaitlistDialog |
| `frontend/app/dashboard/voices/page.tsx` | **Modify** — handle 429 in upload flow, show WaitlistDialog |

---

## 9. Non-Goals

- NOT building payment/subscription infrastructure
- NOT creating Pro/Team pricing pages
- NOT enforcing limits in the DB layer (no constraints/triggers)
- NOT rate-limiting the waitlist endpoint
- NOT removing or hiding features for free users after limit is hit (they keep what they have)
