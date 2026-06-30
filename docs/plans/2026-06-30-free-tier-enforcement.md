# Free Tier Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce free tier limits (15 presentations lifetime, 3 presentations/day, 1 voice clone) with waitlist capture when limits are hit.

**Architecture:** Centralized `lib/quota.ts` service called by API routes before inserts. On 429, client shows a WaitlistDialog that saves user interest to a `waitlist` table for when Pro/Team launch.

**Tech Stack:** TypeScript, Next.js App Router, Supabase, Zod, shadcn/ui patterns

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/lib/quota.ts` | Create | Quota check functions + 429 response helper |
| `docs/migrations/022_create_waitlist_table.sql` | Create | Waitlist table DDL |
| `frontend/lib/validations/waitlist.ts` | Create | Zod schema for waitlist interest |
| `frontend/app/api/waitlist/route.ts` | Create | Upsert waitlist entry |
| `frontend/components/dashboard/WaitlistDialog.tsx` | Create | Limit-hit dialog with waitlist form |
| `frontend/app/api/presentations/route.ts` | Modify | Add quota checks before insert |
| `frontend/app/api/voices/upload/route.ts` | Modify | Add clone quota check before insert |
| `frontend/components/dashboard/CreatePresentationDialog.tsx` | Modify | Handle 429, show WaitlistDialog |
| `frontend/app/dashboard/voices/page.tsx` | Modify | Handle 429 in upload flow, show WaitlistDialog |

---

### Task 1: Create `lib/quota.ts`

**Files:**
- Create: `frontend/lib/quota.ts`

- [ ] **Step 1: Write the file**

```typescript
import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

// ── Types ────────────────────────────────────────

export interface QuotaResult {
  allowed: boolean
  limit: number
  current: number
  /** Human-readable message for the user */
  message?: string
  /** Key identifying which limit was hit (for the UI dialog) */
  limitKey?: "presentations_lifetime" | "presentations_daily" | "voice_clones"
}

// ── Free Tier Limits ─────────────────────────────

const FREE_LIMITS = {
  presentations_lifetime: 15,
  presentations_daily: 3,
  voice_clones: 1,
} as const

// ── Quota Checks ─────────────────────────────────

export async function checkPresentationQuota(
  supabase: SupabaseClient,
  userId: string,
): Promise<QuotaResult> {
  const { count } = await supabase
    .from("presentations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  const current = count ?? 0
  const limit = FREE_LIMITS.presentations_lifetime

  if (current >= limit) {
    return {
      allowed: false,
      limit,
      current,
      limitKey: "presentations_lifetime",
      message: `You've reached the lifetime limit of ${limit} presentations. Upgrade to Pro to create more.`,
    }
  }

  return { allowed: true, limit, current }
}

export async function checkDailyPresentationQuota(
  supabase: SupabaseClient,
  userId: string,
): Promise<QuotaResult> {
  const now = new Date()
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const limit = FREE_LIMITS.presentations_daily

  const { count } = await supabase
    .from("presentations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", todayStart.toISOString())

  const current = count ?? 0

  if (current >= limit) {
    return {
      allowed: false,
      limit,
      current,
      limitKey: "presentations_daily",
      message: `You've reached the daily limit of ${limit} presentations. Try again tomorrow or upgrade to Pro.`,
    }
  }

  return { allowed: true, limit, current }
}

export async function checkVoiceCloneQuota(
  supabase: SupabaseClient,
  userId: string,
): Promise<QuotaResult> {
  const { count } = await supabase
    .from("voices")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "cloned")

  const current = count ?? 0
  const limit = FREE_LIMITS.voice_clones

  if (current >= limit) {
    return {
      allowed: false,
      limit,
      current,
      limitKey: "voice_clones",
      message: `You've reached the limit of ${limit} voice clone${limit !== 1 ? "s" : ""}. Upgrade to Pro to clone more voices.`,
    }
  }

  return { allowed: true, limit, current }
}

// ── Response Helper ──────────────────────────────

export function quotaBlockResponse(result: QuotaResult) {
  return NextResponse.json(
    {
      error: result.message,
      limitKey: result.limitKey,
      limit: result.limit,
      current: result.current,
    },
    { status: 429 },
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit` from the `frontend/` directory.
Expected: exit code 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/quota.ts
git commit -m "feat(quota): add quota service with check functions and 429 helper"
```

---

### Task 2: Create migration 022 and waitlist validation

**Files:**
- Create: `docs/migrations/022_create_waitlist_table.sql`
- Create: `frontend/lib/validations/waitlist.ts`

- [ ] **Step 1: Write the migration**

```sql
-- 022_create_waitlist_table.sql
-- Captures user interest in paid tiers when free tier limits are hit

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  interest TEXT NOT NULL CHECK (interest IN ('pro', 'team', 'both')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Only admins (service_role) can manage the waitlist
CREATE POLICY "Admins can manage waitlist" ON waitlist
  FOR ALL USING (auth.role() = 'service_role');
```

- [ ] **Step 2: Write the validation file**

```typescript
import { z } from "zod"

export const WAITLIST_INTERESTS = ["pro", "team", "both"] as const
export type WaitlistInterest = (typeof WAITLIST_INTERESTS)[number]

export const submitWaitlistSchema = z.object({
  interest: z.enum(WAITLIST_INTERESTS, {
    message: "Please select Pro, Team, or both",
  }),
})

export type SubmitWaitlistInput = z.infer<typeof submitWaitlistSchema>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit` from the `frontend/` directory.
Expected: exit code 0.

- [ ] **Step 4: Commit**

```bash
git add docs/migrations/022_create_waitlist_table.sql frontend/lib/validations/waitlist.ts
git commit -m "feat(waitlist): add waitlist table migration and Zod validation"
```

---

### Task 3: Create `POST /api/waitlist`

**Files:**
- Create: `frontend/app/api/waitlist/route.ts`

- [ ] **Step 1: Write the API route**

```typescript
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { submitWaitlistSchema } from "@/lib/validations/waitlist"

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = submitWaitlistSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from("waitlist")
    .upsert(
      {
        user_id: user.id,
        email: user.email ?? "",
        interest: parsed.data.interest,
      },
      { onConflict: "user_id" },
    )
    .select()
    .single()

  if (error) {
    console.error("POST /api/waitlist:", error.message)
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 })
  }

  return NextResponse.json({ data: { id: data.id } }, { status: 201 })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit` from the `frontend/` directory.
Expected: exit code 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/waitlist/route.ts
git commit -m "feat(waitlist): add POST /api/waitlist endpoint with upsert"
```

---

### Task 4: Create WaitlistDialog component

**Files:**
- Create: `frontend/components/dashboard/WaitlistDialog.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client"

import { useState } from "react"
import { Loader2, CheckCircle2 } from "lucide-react"
import type { QuotaResult } from "@/lib/quota"
import type { WaitlistInterest } from "@/lib/validations/waitlist"

const LIMIT_MESSAGES: Record<string, { title: string; description: string }> = {
  presentations_lifetime: {
    title: "Presentation limit reached",
    description: "You've used all your free presentations. Upgrade to Pro to create unlimited presentations.",
  },
  presentations_daily: {
    title: "Daily limit reached",
    description: "You've hit your daily limit of 3 presentations. Try again tomorrow or upgrade to Pro.",
  },
  voice_clones: {
    title: "Voice clone limit reached",
    description: "You've reached the limit of 1 voice clone. Upgrade to Pro to clone more voices.",
  },
}

const INTEREST_OPTIONS: { value: WaitlistInterest; label: string; description: string }[] = [
  { value: "pro", label: "Pro", description: "$20/mo — for regular content creators" },
  { value: "team", label: "Team", description: "$50/mo — for teams creating together" },
  { value: "both", label: "Both", description: "Interested in both plans" },
]

export function WaitlistDialog({
  quota,
  onClose,
}: {
  quota: QuotaResult
  onClose: () => void
}) {
  const [interest, setInterest] = useState<WaitlistInterest | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [validationError, setValidationError] = useState("")

  const limitInfo = quota.limitKey ? LIMIT_MESSAGES[quota.limitKey] : null

  async function handleSubmit() {
    if (!interest) {
      setValidationError("Please select at least one plan")
      return
    }

    setSubmitting(true)
    setError("")
    setValidationError("")

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interest }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Something went wrong")
      setSubmitted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
          <h2 className="mt-3 text-base font-semibold text-[#18181B]">You&apos;re on the list!</h2>
          <p className="mt-2 text-sm text-[#71717A]">
            We&apos;ll notify you when Pro launches. Thanks for your interest!
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-[#71717A] hover:text-[#18181B]"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto hide-scrollbar">
        {/* Header */}
        <div className="mb-5">
          <h2 className="text-base font-semibold text-[#18181B]">
            {limitInfo?.title ?? "Limit reached"}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[#71717A]">
            {limitInfo?.description ?? quota.message}
          </p>
        </div>

        {/* Plan selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#18181B]">Which plan interests you?</label>
          {INTEREST_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setInterest(opt.value); setValidationError("") }}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                interest === opt.value
                  ? "border-[#18181B] bg-zinc-50"
                  : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                interest === opt.value ? "border-[#18181B]" : "border-zinc-300"
              }`}>
                {interest === opt.value && (
                  <div className="h-2.5 w-2.5 rounded-full bg-[#18181B]" />
                )}
              </div>
              <div>
                <span className="text-sm font-medium text-[#18181B]">{opt.label}</span>
                <p className="text-xs text-[#71717A]">{opt.description}</p>
              </div>
            </button>
          ))}
          {validationError && <p className="text-xs text-red-600">{validationError}</p>}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-[#71717A] hover:text-[#18181B]"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#18181B]/70 bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-all hover:border-[#18181B] hover:bg-[#27272A] disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Notify me when available
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit` from the `frontend/` directory.
Expected: exit code 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/dashboard/WaitlistDialog.tsx
git commit -m "feat(ui): add WaitlistDialog for limit-hit flow"
```

---

### Task 5: Modify `POST /api/presentations` to enforce quotas

**Files:**
- Modify: `frontend/app/api/presentations/route.ts:28-38`

- [ ] **Step 1: Add quota checks after project verification**

Insert between the project check (line 38) and the DB insert (line 40):

```typescript
  // Check free tier quotas
  const lifetimeCheck = await checkPresentationQuota(supabase, user.id)
  if (!lifetimeCheck.allowed) {
    return quotaBlockResponse(lifetimeCheck)
  }

  const dailyCheck = await checkDailyPresentationQuota(supabase, user.id)
  if (!dailyCheck.allowed) {
    return quotaBlockResponse(dailyCheck)
  }
```

Update the import to include the quota functions:

```typescript
import { checkPresentationQuota, checkDailyPresentationQuota, quotaBlockResponse } from "@/lib/quota"
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit` from the `frontend/` directory.
Expected: exit code 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/presentations/route.ts
git commit -m "feat(quota): enforce presentation limits in POST /api/presentations"
```

---

### Task 6: Modify `POST /api/voices/upload` to enforce clone quota

**Files:**
- Modify: `frontend/app/api/voices/upload/route.ts:56-68`

- [ ] **Step 1: Add clone quota check after file validation**

Insert between the file/name validation and the storage upload. Place it right before the comment "Upload file to Supabase Storage" (line 38):

```typescript
  // Check free tier voice clone quota
  const cloneCheck = await checkVoiceCloneQuota(supabase, user.id)
  if (!cloneCheck.allowed) {
    return quotaBlockResponse(cloneCheck)
  }
```

Update the import to include the quota function:

```typescript
import { checkVoiceCloneQuota, quotaBlockResponse } from "@/lib/quota"
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit` from the `frontend/` directory.
Expected: exit code 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/voices/upload/route.ts
git commit -m "feat(quota): enforce voice clone limit in POST /api/voices/upload"
```

---

### Task 7: Modify CreatePresentationDialog to handle 429

**Files:**
- Modify: `frontend/components/dashboard/CreatePresentationDialog.tsx`

- [ ] **Step 1: Add WaitlistDialog import and 429 handling**

Add import for `WaitlistDialog` and a new state variable. Modify the submit handler to detect 429 and show the dialog instead of just setting error text.

Changes:

```tsx
// Add to imports:
import { WaitlistDialog } from "@/components/dashboard/WaitlistDialog"
import type { QuotaResult } from "@/lib/quota"
```

```tsx
// Add state inside the component:
const [quotaResult, setQuotaResult] = useState<QuotaResult | null>(null)
```

Modify the submit handler to detect 429:

```tsx
      const json = await res.json()
      if (res.status === 429 && json.limitKey) {
        setQuotaResult({
          allowed: false,
          limit: json.limit,
          current: json.current,
          limitKey: json.limitKey,
          message: json.error,
        })
        setSaving(false)
        return
      }
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Something went wrong")
        return
      }
```

Add the dialog before the closing `</>` of the component:

```tsx
      {quotaResult && (
        <WaitlistDialog
          quota={quotaResult}
          onClose={() => setQuotaResult(null)}
        />
      )}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit` from the `frontend/` directory.
Expected: exit code 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/dashboard/CreatePresentationDialog.tsx
git commit -m "feat(ui): handle 429 quota errors in CreatePresentationDialog"
```

---

### Task 8: Modify AddVoiceModal in voices page to handle 429

**Files:**
- Modify: `frontend/app/dashboard/voices/page.tsx`

- [ ] **Step 1: Add WaitlistDialog import and 429 handling**

Add imports at the top:

```tsx
import { WaitlistDialog } from "@/components/dashboard/WaitlistDialog"
import type { QuotaResult } from "@/lib/quota"
```

Add state inside `AddVoiceModal`:

```tsx
const [quotaResult, setQuotaResult] = useState<QuotaResult | null>(null)
```

Modify `handleUploadClone` to detect 429:

```tsx
      const json = await res.json()
      if (res.status === 429 && json.limitKey) {
        setQuotaResult({
          allowed: false,
          limit: json.limit,
          current: json.current,
          limitKey: json.limitKey,
          message: json.error,
        })
        setUploading(false)
        return
      }
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Failed to upload voice")
```

Add the dialog at the end of the modal JSX (before the closing `</div>` of the modal):

```tsx
      {quotaResult && (
        <WaitlistDialog
          quota={quotaResult}
          onClose={() => setQuotaResult(null)}
        />
      )}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit` from the `frontend/` directory.
Expected: exit code 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/dashboard/voices/page.tsx
git commit -m "feat(ui): handle 429 quota errors in voice clone upload"
```
