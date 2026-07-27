# Security Audit Report — Moduvox

**Date:** 2026-07-28
**Method:** Manual code review per OWASP Top 10 + security-review methodology
**Scope:** All 49 API route files, components, libs, middleware, Supabase config
**Test suite:** 35/35 passing | TypeScript: clean

---

## Executive Summary

**15 confirmed findings** — 2 critical, 3 high, 5 medium, 5 low. The most urgent are: an unauthenticated email-confirmation backdoor (`auth/auto-confirm`), an unauthenticated welcome-email spam vector (`auth/send-welcome`), and an R2 path traversal vulnerability (`voices/signed-url`) that lets any authenticated user read any file in the bucket.

The core architecture (Zod validation on most routes, consistent auth patterns, AES-256 encryption, parameterized Supabase queries) is solid. The vulnerabilities cluster around **3 patterns**: endpoints missing auth checks, file-path validation gaps, and ineffective serverless rate limiting.

---

## 🔴 CRITICAL (Must Fix Before Production)

### C-1: Unauthenticated Email Confirmation Bypass
- **File:** `frontend/app/api/auth/auto-confirm/route.ts:4-28`
- **Type:** Authentication Bypass / Admin API Abuse
- **Confidence:** 10/10

**Description:** This endpoint accepts a `userId` from the request body with **zero authentication** and calls `supabase.auth.admin.updateUserById(userId, { email_confirm: true })` using the service_role key. No session check, no API key, no reCAPTCHA.

**Exploit scenario:**
```
POST /api/auth/auto-confirm
Content-Type: application/json
Body: { "userId": "any-user-uuid" }
→ Email confirmed for that user
```
An attacker who discovers a user's UUID (e.g., via `/api/auth/me` or data leakage) can bypass Supabase email verification entirely. If signup flows depend on email verification for authorization, this is a full auth bypass.

**Fix:** Either (a) remove this endpoint if unused, (b) require an admin API key header, or (c) at minimum verify the requesting user's session and only allow self-confirmation.

---

### C-2: In-Memory Rate Limiters Ineffective on Serverless
- **File:** `frontend/lib/rate-limiter.ts:14-22` and 3+ individual route implementations
- **Type:** Rate Limiting Bypass
- **Confidence:** 9/10

**Affected routes:**
| Route | Limiter | Bypass Method |
|-------|---------|--------------|
| `POST /api/generate/narration` | Local `Map<string, number[]>` | Hit 2+ concurrent instances |
| `POST /api/waitlist` | `rate-limiter.ts` 3/hr | Hit 2+ concurrent instances |
| `POST /api/auth/send-welcome` | `rate-limiter.ts` IP+user | Hit 2+ concurrent instances |
| `POST /api/generate/image-descriptions` | `rate-limiter.ts` 10/min | Hit 2+ concurrent instances |

**Description:** All rate limiters use in-memory `Map<string, ...>` stores. On Vercel serverless, each function invocation can run on a separate container with independent memory. An attacker sends requests across concurrent instances — each starts with `count: 0`.

**Fix:** Use Supabase-backed rate limiting (already done for the gate endpoint — replicate that pattern) or add Upstash Redis.

---

## 🟠 HIGH (Fix This Week)

### H-1: Unauthenticated Welcome Email Spam
- **File:** `frontend/app/api/auth/send-welcome/route.tsx:9-61`
- **Type:** Authentication Bypass / Spam Vector
- **Confidence:** 9/10

**Description:** Same pattern as C-1 — accepts arbitrary `userId` with no auth. Fetches user email from DB via admin client and sends welcome email via Resend.

**Exploit scenario:** Attacker fires 1000 concurrent requests to `/api/auth/send-welcome` with known user UUIDs → target users receive 1000 welcome emails → Resend quota exhausted → legitimate emails dropped.

**Fix:** Verify the requesting user's session. Only allow `/auth/me` to send to itself, or make this a server-internal function.

---

### H-2: Path Traversal via R2 Signed URL
- **File:** `frontend/app/api/voices/signed-url/route.ts:17-24`
- **Type:** Path Traversal / Object Store Access
- **Confidence:** 9/10

**Description:** The `path` query param is passed directly to `createDownloadUrl(path, 300)` with zero validation:
```typescript
const path = searchParams.get("path")   // arbitrary user input
const audioUrl = await createDownloadUrl(path, 300)
```

**Exploit scenario:** An attacker with a valid session requests `/api/voices/signed-url?path=../other-user-id/audio/abc-123/slides/slide-1.wav` and receives a signed URL to another user's audio files. No ownership check, no path prefix scoping.

**Fix:** Validate `path` against a regex (`^[a-f0-9-]+/[a-f0-9-]+/[a-f0-9-]+\.wav$`), reject paths containing `..`, and verify the user owns the resource at that path.

---

### H-3: `voices/[id]` DELETE Missing User ID Filter
- **File:** `frontend/app/api/voices/[id]/route.ts:43-47`
- **Type:** IDOR / TOCTOU
- **Confidence:** 8/10

**Description:** The DELETE query filters by `id` but **not by `user_id`**:
```typescript
const { error: deleteError } = await supabase
  .from("voices")
  .delete()
  .eq("id", id)
  // ❌ missing .eq("user_id", user.id)
```

Every other mutation route in the codebase adds `.eq("user_id", user.id)` — this is the exception. While an ownership check runs before the DELETE (separate SELECT at line 20-31), a TOCTOU window exists between check and execution. If RLS is enabled with anon key, the server client would enforce row-level security, but the pattern is inconsistent.

**Fix:** Add `.eq("user_id", user.id)` to the delete query.

---

## 🟡 MEDIUM (Fix This Sprint)

### M-1: Unvalidated filePath in Upload Confirm
- **File:** `frontend/app/api/presentations/[id]/upload/confirm/route.ts:18-23`
- **Type:** Path Traversal / Object Store Access
- **Confidence:** 7/10

**Description:** `filePath` from request body is used to generate download URLs and delete files from R2. The only check is `!filePath` truthiness. The path format check (`pathParts.length !== 2`) is insufficient — `../other.pptx` passes. Ownership of `presentationId` is verified, but `filePath` could reference files outside that presentation's scope.

**Fix:** Add path prefix validation + reject `..` sequences + use Zod schema.

---

### M-2: No Zod Schema on Slide Cleanup
- **File:** `frontend/app/api/presentations/[id]/slides/cleanup/route.ts:30-32`
- **Type:** Missing Input Validation
- **Confidence:** 6/10

**Description:** Body is cast directly without Zod validation:
```typescript
const { activeSlideNumbers } = body as { activeSlideNumbers?: number[] }
```
Non-numeric values would silently pass through.

**Fix:** Add a Zod schema with `.array(z.number().int().positive())`.

---

### M-3: No Zod Schema on Narration Generation
- **File:** `frontend/app/api/generate/narration/route.ts:75-160`
- **Type:** Missing Input Validation
- **Confidence:** 6/10

**Description:** Body destructured directly without Zod. Slide objects not validated — `number`, `title`, `bullets` are just used. Prompt injection possible within character limits.

**Fix:** Add a Zod schema for the full request body.

---

### M-4: reCAPTCHA Silently Disabled on Missing Env Vars
- **Files:** `api/view/[shareToken]/gate/route.tsx:55`, `api/feedback/route.tsx:58`, `api/auth/verify-captcha/route.ts:10-13`
- **Type:** Security Control Bypass
- **Confidence:** 7/10

**Description:** When `RECAPTCHA_SECRET_KEY` is missing, returns `{ success: true, score: 1 }`. If env vars fail to propagate to a deployment, bot protection is silently disabled.

**Fix:** Log a warning in production when env vars are missing. Consider failing closed.

---

### M-5: Gemini/NIM Key Plaintext Fallback on Decryption Failure
- **Files:** `api/user/gemini-key/route.ts:22-28`, `api/user/nim-key/route.ts:22-28`
- **Type:** Data Exposure
- **Confidence:** 6/10

**Description:** When AES-256-GCM decryption fails, the raw DB value is returned as-is. If `ENCRYPTION_KEY` is rotated without re-encrypting, all stored keys leak as plaintext.

**Fix:** Remove the fallback — return an error instead. Add a migration endpoint for re-encrypting after key rotation.

---

### M-6: Authless Feedback Endpoint Spam
- **File:** `frontend/app/api/feedback/route.tsx:22-147`
- **Type:** Spam Vector
- **Confidence:** 6/10

**Description:** No authentication on feedback submission. reCAPTCHA can be bypassed by calling the API directly. Cookie-based cooldown is client-side only.

**Fix:** Add session verification for authenticated users. Keep no-auth path but enforce stronger rate limiting via DB-backed counters.

---

## 🟢 LOW (Track / Fix When Convenient)

### L-1: `auth/me` Returns User UUID
- **File:** `frontend/app/api/auth/me/route.ts:8`
- **Type:** Information Disclosure (minor)
- **Context:** Only for authenticated users, but UUID + auto-confirm (C-1) = email bypass

### L-2: Account Deletion Partial Failure Creates Orphan
- **File:** `frontend/app/api/user/account/route.ts:31-43`
- **Type:** Data Integrity
- **Context:** DB data deleted → auth account deletion fails → orphan

### L-3: Viewer Gate `viewed_at` Reset on Re-Gate
- **File:** `frontend/app/api/view/[shareToken]/gate/route.tsx:131-141`
- **Type:** Analytics Tampering
- **Context:** Each re-gate resets `viewed_at` → inflates unique view count

### L-4: Presigned Upload URL Exposure (1hr window)
- **Files:** `api/view/[shareToken]/convert/route.ts:51-58`, `api/presentations/[id]/upload/route.ts:49`
- **Type:** Credential Exposure
- **Context:** If session token is leaked, attacker has 1hr to overwrite slide PDFs

### L-5: URL Params Not Validated as UUIDs
- **Files:** All routes using `params.id` in Supabase queries
- **Type:** Defense-in-Depth
- **Context:** Parameterized queries prevent injection, but non-UUID params produce confusing errors

---

## ✅ Areas Cleaned (No Findings)

| Area | Verdict |
|------|---------|
| **XSS vectors** — All user content rendered via React (auto-escaped). No `dangerouslySetInnerHTML` on user data. | ✅ Clean |
| **SQL injection** — All queries use Supabase parameterized `.eq()`, `.select()`, `.insert()`. No raw SQL. | ✅ Clean |
| **Command injection** — No `exec()`, `spawn()`, `child_process` usage. | ✅ Clean |
| **Supabase RLS** — Consistent anon key + service_role separation. | ✅ Clean |
| **AES-256 encryption** — Proper IV, auth tags, key length verification. No custom crypto. | ✅ Clean |
| **Response envelope** — Consistent `{ data }` / `{ error }` pattern. No stack trace leakage. | ✅ Clean |
| **Security headers** — HSTS, X-Content-Type-Options, X-Frame-Options in middleware. | ✅ Clean |
| **Ownership checks** — Every mutation verifies `user_id` on the resource (except H-3). | ✅ Clean (1 exception) |

---

## Action Items by Priority

| Priority | Finding | Fix |
|----------|---------|-----|
| P0 | C-1: Unauthenticated auto-confirm | Remove endpoint or add admin API key auth |
| P0 | C-2: In-memory rate limiters | Replace with Supabase or Redis-backed counters |
| P1 | H-1: Unauthenticated send-welcome | Add session verification |
| P1 | H-2: R2 path traversal | Validate + scope `path` param to user's prefix |
| P1 | H-3: Missing user_id in voice DELETE | Add `.eq("user_id", user.id)` |
| P2 | M-1: Unvalidated filePath | Add path prefix validation |
| P2 | M-2: No Zod on cleanup route | Add Zod schema |
| P2 | M-3: No Zod on narration route | Add Zod schema |
| P2 | M-4: reCAPTCHA silent failure | Fail closed when env vars missing |
| P2 | M-5: Key plaintext fallback | Remove fallback, return error |
| P2 | M-6: Authless feedback | Add session verification |
| P3 | L-1 through L-5 | Track and fix when convenient |

---

**Audit methodology:** 3 parallel security review passes covering input validation, authentication/authorization/crypto/data exposure, and XSS/code execution/trust boundaries. Each finding validated against false-positive filter and exploit-scenario analysis.
