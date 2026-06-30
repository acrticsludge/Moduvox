# Feedback Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public feedback submission page at `/feedback` with categories, star rating, rate limiting, and email notification.

**Architecture:** New `feedback` table in Supabase. Public POST endpoint with IP-based rate limiting (1 per 12h). Form submission triggers Resend email to founder. Navbar link added to existing `NAV_LINKS`.

**Tech Stack:** Next.js App Router, Supabase (admin client), Resend, Zod, Tailwind CSS

---

### Task 1: Migration — `feedback` table

**Files:**
- Create: `docs/migrations/021_create_feedback_table.sql`

- [ ] **Step 1: Write the migration file**

Create `docs/migrations/021_create_feedback_table.sql`:

```sql
-- Create feedback table for public submissions
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bug_report', 'feature_request', 'general')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_ip ON feedback(ip_address, created_at);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert feedback"
ON feedback FOR INSERT
WITH CHECK (true);

CREATE POLICY "Owner can read feedback"
ON feedback FOR SELECT
USING (auth.uid() IN (SELECT id FROM auth.users LIMIT 1));
```

- [ ] **Step 2: Commit**

```bash
git add docs/migrations/021_create_feedback_table.sql
git commit -m "feat(feedback): add feedback table migration"
```

---

### Task 2: Validation — Zod schema

**Files:**
- Create: `frontend/lib/validations/feedback.ts`

- [ ] **Step 1: Write the validation file**

Create `frontend/lib/validations/feedback.ts`:

```typescript
import { z } from "zod"

export const CATEGORIES = ["bug_report", "feature_request", "general"] as const
export type FeedbackCategory = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug_report: "Bug Report",
  feature_request: "Feature Request",
  general: "General",
}

export const submitFeedbackSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
  email: z.string().email("Valid email is required"),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: "Please select a category" }) }),
  rating: z.number().int().min(1, "Rating is required").max(5),
  message: z.string().min(1, "Message is required").max(5000, "Message must be 5000 characters or less"),
})

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/validations/feedback.ts
git commit -m "feat(feedback): add Zod validation schemas"
```

---

### Task 3: API route — `POST /api/feedback`

**Files:**
- Create: `frontend/app/api/feedback/route.ts`

- [ ] **Step 1: Write the API route**

Create `frontend/app/api/feedback/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { submitFeedbackSchema, CATEGORY_LABELS } from "@/lib/validations/feedback"
import type { FeedbackCategory } from "@/lib/validations/feedback"

export async function POST(request: Request) {
  const supabase = createAdminClient()

  // Parse body
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Validate
  const parsed = submitFeedbackSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  // Extract IP
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown"

  // Rate limit: 1 submission per IP per 12 hours
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const { count: recentCount } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("ip_address", ipAddress)
    .gte("created_at", twelveHoursAgo)

  if (recentCount && recentCount > 0) {
    return NextResponse.json(
      { error: "You've already submitted feedback recently. Please try again later." },
      { status: 429 },
    )
  }

  // Insert into DB
  const { data: feedback, error: insertError } = await supabase
    .from("feedback")
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      category: parsed.data.category,
      rating: parsed.data.rating,
      message: parsed.data.message,
      ip_address: ipAddress,
    })
    .select("id, created_at")
    .single()

  if (insertError || !feedback) {
    console.error("Failed to insert feedback:", insertError?.message)
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 })
  }

  // Send email notification via Resend
  const categoryLabel = CATEGORY_LABELS[parsed.data.category as FeedbackCategory]
  const stars = "★".repeat(parsed.data.rating) + "☆".repeat(5 - parsed.data.rating)

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "Moduvox <alerts@pulsemonitor.dev>",
        to: ["anubhavrai100@gmail.com"],
        subject: `New feedback: ${categoryLabel} ${stars}`,
        text: `New feedback submitted\n\nCategory: ${categoryLabel}\nRating: ${parsed.data.rating}/5\nName: ${parsed.data.name}\nEmail: ${parsed.data.email}\n\nMessage:\n${parsed.data.message}\n\nSubmitted at: ${feedback.created_at}\nIP: ${ipAddress}`,
      }),
    })
  } catch (err) {
    console.error("Failed to send feedback email:", err)
    // Don't fail — feedback is already saved
  }

  return NextResponse.json({ data: { ok: true } }, { status: 201 })
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/api/feedback/route.ts
git commit -m "feat(feedback): add POST /api/feedback with rate limiting + email notification"
```

---

### Task 4: Page — `/feedback`

**Files:**
- Create: `frontend/app/feedback/page.tsx`

- [ ] **Step 1: Write the feedback page**

Create `frontend/app/feedback/page.tsx`. It's a client component with:

- Navbar + Footer (same as other landing pages)
- Centered single-column layout, max-w-lg
- States: form → submitting → success → rate_limited
- Star rating widget (1-5 clickable stars)
- Category dropdown (Bug Report, Feature Request, General)
- Character count on message textarea (max 5000)
- Inline validation errors
- On success: shows "Thanks for your feedback!" with a "Submit another" button

```tsx
"use client"

import { useState } from "react"
import { Loader2, CheckCircle, AlertCircle, Star } from "lucide-react"
import { Navbar } from "@/components/ui/Navbar"
import { Footer } from "@/components/landing/footer"
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/validations/feedback"

type PageState =
  | { type: "form" }
  | { type: "submitting" }
  | { type: "success" }
  | { type: "rate_limited" }

export default function FeedbackPage() {
  const [state, setState] = useState<PageState>({ type: "form" })
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [category, setCategory] = useState("")
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const charCount = message.length

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setFieldErrors({})

    // Client-side validation
    const errors: Record<string, string> = {}
    if (!name.trim()) errors.name = "Name is required"
    if (!email.trim()) errors.email = "Email is required"
    if (!category) errors.category = "Please select a category"
    if (rating === 0) errors.rating = "Please select a rating"
    if (!message.trim()) errors.message = "Message is required"

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setState({ type: "submitting" })

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          category,
          rating,
          message: message.trim(),
        }),
      })

      const json = await res.json()

      if (res.status === 429) {
        setState({ type: "rate_limited" })
        return
      }

      if (!res.ok) {
        if (json.details) {
          const fieldErrors: Record<string, string> = {}
          for (const [field, msgs] of Object.entries(json.details)) {
            fieldErrors[field] = (msgs as string[])[0]
          }
          setFieldErrors(fieldErrors)
        }
        setError(json.error || "Something went wrong")
        setState({ type: "form" })
        return
      }

      setState({ type: "success" })
    } catch {
      setError("Network error. Please try again.")
      setState({ type: "form" })
    }
  }

  function handleReset() {
    setName("")
    setEmail("")
    setCategory("")
    setRating(0)
    setMessage("")
    setError("")
    setFieldErrors({})
    setState({ type: "form" })
  }

  return (
    <main className="bg-[#F9FAFB] min-h-screen flex flex-col">
      <Navbar />
      <div className="mx-auto w-full max-w-lg px-4 pt-32 pb-24 sm:px-6 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[#18181B]">
          Send Feedback
        </h1>
        <p className="mt-1.5 text-sm text-[#71717A]">
          Help us improve Moduvox. What's on your mind?
        </p>

        {state.type === "success" && (
          <div className="mt-8 space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-[#18181B]">Thanks for your feedback!</h2>
            <p className="text-sm text-[#71717A]">
              We review every submission and use it to improve Moduvox.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-[#18181B] transition-colors hover:bg-zinc-50"
            >
              Submit another
            </button>
          </div>
        )}

        {state.type === "rate_limited" && (
          <div className="mt-8 space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <AlertCircle className="h-7 w-7 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-[#18181B]">Already submitted</h2>
            <p className="text-sm text-[#71717A]">
              You've already submitted feedback recently. You can submit again later.
            </p>
          </div>
        )}

        {(state.type === "form" || state.type === "submitting") && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                disabled={state.type === "submitting"}
                autoFocus
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={state.type === "submitting"}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={state.type === "submitting"}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-[#18181B] focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
              {fieldErrors.category && <p className="mt-1 text-xs text-red-500">{fieldErrors.category}</p>}
            </div>

            {/* Rating */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
                Rating <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    disabled={state.type === "submitting"}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-0.5 transition-colors disabled:opacity-50"
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={`h-7 w-7 ${
                        star <= (hoverRating || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "fill-none text-zinc-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              {fieldErrors.rating && <p className="mt-1 text-xs text-red-500">{fieldErrors.rating}</p>}
            </div>

            {/* Message */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what you think..."
                rows={5}
                maxLength={5000}
                disabled={state.type === "submitting"}
                className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
              />
              <div className="mt-1 flex items-center justify-between">
                {fieldErrors.message && <p className="text-xs text-red-500">{fieldErrors.message}</p>}
                <p className={`ml-auto text-xs ${charCount > 4500 ? "text-amber-500" : "text-zinc-400"}`}>
                  {charCount} / 5000
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={state.type === "submitting"}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#18181B] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#27272A] disabled:opacity-50"
            >
              {state.type === "submitting" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Submit Feedback"
              )}
            </button>
          </form>
        )}
      </div>
      <Footer />
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/feedback/page.tsx
git commit -m "feat(feedback): add /feedback page with star rating and form states"
```

---

### Task 5: Navbar — Add Feedback link

**Files:**
- Modify: `frontend/components/ui/Navbar.tsx`

- [ ] **Step 1: Add Feedback to NAV_LINKS**

In `frontend/components/ui/Navbar.tsx`, change:

```typescript
const NAV_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
];
```

to:

```typescript
const NAV_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Feedback", href: "/feedback" },
];
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/ui/Navbar.tsx
git commit -m "feat(navbar): add Feedback link"
```
