# Free Tier Enforcement — Audit Report

**Branch:** `feat/free-tier-enforcement`
**Date:** 2026-06-30
**Auditors:** Security reviewer, bug/edge-case reviewer, UX/code-quality reviewer

---

## Summary

| Category | Count |
|---|---|
| 🔴 Critical | 1 |
| 🟠 Important | 5 |
| 🟡 Low / Warn | 8 |
| ✅ Verified Clean | 8 items |

**Verdict:** Fix the 5 Important items + the Clone button UX gap, then merge. The Critical (TOCTOU) is low-likelihood for v1 — track as follow-up.

---

## 🔴 Critical

### C1. TOCTOU Race Condition — Concurrent Requests Bypass All Limits

**Files:** `lib/quota.ts:26-104`, `presentations/route.ts:42-50`, `voices/upload/route.ts:40-43`
**Risk:** Low likelihood, high impact

**Problem:** All quota checks follow a read-then-write pattern (SELECT count → compare → INSERT) with no database-level isolation. Two concurrent POSTs can both SELECT count, both see `current < limit`, and both INSERT. The `presentations` table has no UNIQUE(user_id) constraint to catch duplicates.

**Example:** 16 concurrent POST /api/presentations from a user with 0 presentations can create all 16, despite the 15-lifetime limit.

**Fix options:**
1. **Atomic Postgres RPC** — create a `pg_function` that atomically counts and inserts in a single transaction, call via `.rpc()`
2. **Partial unique index on voice clones** — `CREATE UNIQUE INDEX ON voices (user_id) WHERE type = 'cloned'` enforces max 1 clone at the DB level
3. **Application advisory lock** — use `pg_advisory_xact_lock(hash(user_id))` to serialize per-user operations

---

## 🟠 Important

### I1. COUNT Errors Silently Disable All Limits

**Files:** `lib/quota.ts:35, 65, 90`

**Problem:** `const { count } = await supabase...` completely ignores the `error` field. If Supabase returns null (network blip, RLS misconfiguration, transient DB error), `count ?? 0` sets `current = 0`, which passes every check. A transient failure silently grants unlimited access.

**Fix:** Check `error` and fail-closed:
```typescript
const { count, error } = await supabase...
if (error) {
  console.error("Quota check failed:", error.message)
  return { allowed: false, limit, current: limit, message: "Could not verify usage. Please try again." }
}
```

**Reproduction:** Disconnect network briefly while creating a presentation → quota check returns null count → creation succeeds even if over limit.

---

### I2. Archived Presentations Count Toward Lifetime/Daily Limits

**File:** `lib/quota.ts:33, 62`

**Problem:** The COUNT queries have no `.neq("status", "archived")` filter. Soft-deleted (archived) presentations consume quota slots. A user who archives 15 presentations cannot create a single new one.

**Fix:** Add `.neq("status", "archived")` to both `checkPresentationQuota` and `checkDailyPresentationQuota`.

---

### I3. Hard Delete Frees "Lifetime" Slots — Delete + Recreate Bypasses Intent

**Files:** `presentations/[id]/route.ts:104-108`, `voices/[id]/route.ts:45-48`

**Problem:** The "lifetime limit" is implemented as a concurrency cap (count of current rows), not a total-ever ceiling. User can: create 15 → delete 5 → create 5 → repeat forever.

**Fix:** Soft-delete with `deleted_at` column + exclude from COUNT queries, or use a non-decrementing counter. For v1, low practical impact — document as known limitation.

---

### I4. Null Email Stores Un-notifiable Waitlist Records

**File:** `waitlist/route.ts:36`

**Problem:** `email: user.email ?? ""` — if `user.email` is null (phone-only auth, OAuth without email scope), the waitlist entry stores `""`. Cannot notify this user when Pro launches.

**Fix:** Reject users without email:
```typescript
if (!user.email) {
  return NextResponse.json({ error: "A verified email is required" }, { status: 400 })
}
```

---

### I5. "Clone Your Voice" Button Always Enabled — No Proactive Limit Messaging

**File:** `voices/page.tsx:279-293`

**Problem:** The "Clone your voice" button in AddVoiceModal's choose step shows no indication of the 1-clone limit. User must: click the button → fill the upload form → select a file → type a name → click "Save Voice" → get a 429 → see the WaitlistDialog. Wasted effort, frustrating UX.

**Fix:** Pass `clonedVoicesCount` from parent's `voices` array to AddVoiceModal. If `count >= 1`:
- Disable the clone button with visual dimming
- Show messaging: "Limit reached (1 of 1 used)"
- Add a small "Upgrade to clone more" link

```tsx
<button
  type="button"
  disabled={clonedVoicesCount >= 1}
  onClick={() => setStep("clone")}
  className="flex w-full items-center gap-4 rounded-xl border border-zinc-200 p-4 text-left transition-all hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
>
  ...
  {clonedVoicesCount >= 1 && (
    <p className="text-xs text-amber-600">Limit reached (1 of 1 used)</p>
  )}
</button>
```

---

## 🟡 Low / Warn

### L1. Non-JSON 429 Body → Generic Error Instead of WaitlistDialog

**File:** `CreatePresentationDialog.tsx:34`

**Problem:** `res.json()` throws on non-JSON 429 (Vercel edge rate-limit page), falls to catch → "Something went wrong". User never sees waitlist.

**Fix:** Parse with try/catch before checking `json.limitKey`.

---

### L2. Missing Scroll Containment on AddVoiceModal

**File:** `voices/page.tsx:234`

**Problem:** Unlike all other dialogs, AddVoiceModal lacks `max-h-[90vh] overflow-y-auto`. On mobile, the clone form overflows below the fold.

**Fix:** Add `max-h-[90vh] overflow-y-auto hide-scrollbar` to the inner container.

---

### L3. No ARIA Dialog Semantics on New Modals

**Files:** `WaitlistDialog.tsx`, `CreatePresentationDialog.tsx`, `AddVoiceModal`

**Problem:** No `role="dialog"`, `aria-modal="true"`, or Escape-key handler. Pre-existing pattern across the codebase.

**Fix (minimum):**
```tsx
<div role="dialog" aria-modal="true" aria-label="..." onKeyDown={(e) => e.key === "Escape" && onClose()}>
```

---

### L4. Touch Targets Below 44px Minimum

**Files:** `WaitlistDialog.tsx:84,157`, `CreatePresentationDialog.tsx:64`, `AddVoiceModal`

| Button | Current size | Minimum |
|---|---|---|
| Close (X icon) | 16×16px (`h-4 w-4`) | 44×44px |
| "Not now" | ~20px height (no padding) | 44px |
| Close (✕) in AddVoiceModal | 32×32px (`h-8 w-8`) | 44×44px |

**Fix:** Add `min-h-[44px] min-w-[44px]` to all interactive elements, or increase padding.

---

### L5. Inconsistent Close Icon — Unicode ✕ vs lucide-react X

**File:** `voices/page.tsx:250`

**Problem:** AddVoiceModal uses raw `✕` while CreatePresentationDialog uses `<X className="h-4 w-4" />`. Pre-existing in TestVoiceModal.

**Fix:** Use `<X className="h-4 w-4" />` consistently.

---

### L6. Dead Code: `handlePlay` and `audioRef`

**File:** `voices/page.tsx:605-616`

**Problem:** `handlePlay()` is defined but never called. The `audioRef` exists only for this function. Dead code.

**Fix:** Remove both.

---

### L7. `LIMIT_MESSAGES` Type Too Loose

**File:** `WaitlistDialog.tsx:8`

**Problem:** `Record<string, { title, description }>` — adding a new `limitKey` to `QuotaResult` without adding a dialog message won't cause a type error.

**Fix:** 
```typescript
type LimitKey = NonNullable<QuotaResult["limitKey"]>
const LIMIT_MESSAGES: Record<LimitKey, { title: string; description: string }> = { ... }
```

---

### L8. Redundant `setSaving(false)` in 429 Handler

**File:** `CreatePresentationDialog.tsx:43`

**Problem:** Line 43 calls `setSaving(false)` before early return, but the `finally` block also calls it.

**Fix:** Remove line 43 — `finally` covers it.

---

## ✅ Verified Clean

| Check | Result |
|---|---|
| TypeScript strict, zero errors | ✅ |
| No `any` types | ✅ |
| Project pattern match (shadcn/ui, Tailwind) | ✅ |
| Response format consistency (server <-> client) | ✅ |
| Quota check ordering (lifetime before daily) | ✅ |
| WaitlistDialog retry flow on error | ✅ |
| Voice upload cleanup on DB failure | ✅ |
| Preset voice creation intentionally unrestricted | ✅ |

---

## Appendix: Additional Feature — 5 Preset Voice Limit

Added as part of this branch to complete the free tier enforcement:

- **New quota check:** `checkPresetVoiceQuota()` in `lib/quota.ts` — counts `type = 'preset'`, limit of 5
- **Enforced at:** `POST /api/voices` (preset creation route)
- **Client 429 handling:** `handleSavePreset` in `AddVoiceModal`
- **Pricing card updated:** "Preset AI voices" → "5 preset voices"
