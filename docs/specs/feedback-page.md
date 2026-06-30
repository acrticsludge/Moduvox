# Feedback Page — Design Spec

> **Date:** 2026-06-30  
> **Status:** Draft  
> **Branch:** `feat/feedback-review-page`

---

## 1. Overview

A public feedback submission page at `/feedback` that allows anyone (no login required) to submit categorized feedback with a star rating. Submissions are stored in a new `feedback` table and forwarded to the founder via email.

---

## 2. Data Model

### New table: `feedback`

```sql
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

CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX idx_feedback_ip_hour ON feedback(ip_address, created_at);
```

### RLS

Table is insertable by anyone (public form), readable only by the owner (via dashboard later):

```sql
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert feedback"
ON feedback FOR INSERT
WITH CHECK (true);

CREATE POLICY "Only owner can read feedback"
ON feedback FOR SELECT
USING (auth.uid() IN (SELECT id FROM auth.users LIMIT 1));
```

---

## 3. API Route

### `POST /api/feedback`

**Auth:** Public (no auth required)

**Rate limit:** 1 submission per IP per 12 hours. Checked by querying `feedback` for the same `ip_address` within the last 12 hours. Returns 429 if exceeded.

**Request body:**
```json
{
  "name": "string (1-200 chars)",
  "email": "string (valid email)",
  "category": "bug_report | feature_request | general",
  "rating": "integer (1-5)",
  "message": "string (1-5000 chars)"
}
```

**Validation:** Zod schema in `lib/validations/feedback.ts`

**Flow:**
1. Validate body with Zod
2. Extract IP from `x-forwarded-for` or `x-real-ip` headers
3. Check rate limit: count recent feedback from same IP in last 12h
4. If over limit → `429 Too Many Requests`
5. Insert into `feedback` table
6. Send email via Resend to `anubhavrai100@gmail.com` with feedback details
7. Return `201 Created` with `{ data: { ok: true } }`

**Error responses:**
- `400` — Invalid JSON
- `422` — Validation failure (field-level errors)
- `429` — Rate limit exceeded (1 per 12h)
- `500` — Server error (DB insert or email failure)

---

## 4. Email Template

**To:** `anubhavrai100@gmail.com`  
**From:** `Moduvox <alerts@pulsemonitor.dev>` (existing `RESEND_FROM_EMAIL`)  
**Subject:** `New feedback: [{category}] {rating}/5 — {name}`  

**Body:**
```
New feedback submitted

Category: {category_label}
Rating: {rating}/5
Name: {name}
Email: {email}

Message:
{message}

Submitted at: {created_at}
IP: {ip_address}
```

---

## 5. Page: `/feedback`

### Layout
- Landing page style (matches `/pricing`, `/features`)
- Uses `Navbar` + `Footer` components
- Centered single-column layout, max-w-lg

### Form
- **Name:** Text input, autofocus, required
- **Email:** Email input, required
- **Category:** Select dropdown with three options (Bug Report, Feature Request, General)
- **Rating:** Star rating widget (1-5), clickable stars, required
- **Message:** Textarea, required, 5000 char max, show character count

### States
| State | Behaviour |
|---|---|
| **Default** | Empty form, all fields pristine |
| **Submitting** | Button shows spinner + "Sending…", all fields disabled |
| **Success** | Form replaced with success message: "Thanks for your feedback!" with a "Submit another" link |
| **Error** | Toast or inline error message, form remains filled |
| **Rate limited** | Inline error: "You've already submitted feedback recently. Please try again later." |

### Validation
- Required fields marked with asterisk
- Client-side validation on submit (before API call)
- Server-side validation via Zod (returns field-level 422)

---

## 6. Navbar

Add to `NAV_LINKS` in `components/ui/Navbar.tsx`:

```typescript
const NAV_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Feedback", href: "/feedback" },
];
```

Also add to mobile drawer (same array — already auto-renders both).

---

## 7. Files to Create / Modify

| File | Action | Purpose |
|---|---|---|
| `docs/migrations/021_create_feedback_table.sql` | Create | Feedback table + RLS |
| `frontend/lib/validations/feedback.ts` | Create | Zod schemas |
| `frontend/app/api/feedback/route.ts` | Create | POST handler |
| `frontend/app/feedback/page.tsx` | Create | Feedback page |
| `frontend/components/ui/Navbar.tsx` | Modify | Add Feedback link |

---

## 8. Build Sequence

1. **Migration:** Create `021_create_feedback_table.sql` with table + RLS
2. **Validation:** Create `lib/validations/feedback.ts` with Zod schema
3. **API route:** Create `app/api/feedback/route.ts` with rate limit + insert + email
4. **Page:** Create `app/feedback/page.tsx` with form UI + star rating
5. **Navbar:** Add Feedback link to `NAV_LINKS`
6. **Verify:** Submit test feedback, check DB + email receipt
