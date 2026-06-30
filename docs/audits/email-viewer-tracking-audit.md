# Email-Gated Viewer Tracking — Security & Edge-Case Audit

> **Date:** 2026-06-30  
> **Scope:** Gate flow (CombinedGateDialog → gate route → magic link → verify → ViewPlayer → tracking)  
> **Method:** Two independent agents audited the codebase, then cross-referenced findings

---

## Critical (Fix Before Launch)

### 1. RLS blocks all anonymous verify/track flows

**Files:** `migrations/019_add_viewer_rls_policies.sql`, `gate/route.ts`, `track/route.ts`, `verify/page.tsx`, `view/[shareToken]/route.ts`

**Problem:** The RLS policy on `viewers` and `viewer_events` only allows SELECT when `auth.uid() = presentation owner`. Anonymous viewers clicking magic links have no auth session — `auth.uid()` is `null`. This blocks every anon flow:

| Endpoint | What breaks |
|---|---|
| `verify/page.tsx` | `SELECT ... WHERE session_token = vt` → RLS returns 0 rows → "Link expired" for every link |
| `track/route.ts` | `SELECT ... WHERE session_token = xxx` → 403 "Invalid session" on every event |
| `gate/route.ts` (dedup) | `.maybeSingle()` returns nothing → every submission creates a duplicate viewer |
| `view/[shareToken]/route.ts` (session bypass) | `sessionVerified` always false → gate never bypassed |

**Who is this affecting:** Everyone. The entire system appears to work (200 responses, emails sent) but no viewer can ever complete verification. Tracking events are silently dropped.

**Fix:** Use `createAdminClient()` (bypasses RLS) in verify/track/gate endpoints since these are public endpoints authenticated by `session_token`, not by Supabase Auth:

```typescript
// In verify, track, and gate routes that need to read viewers
import { createAdminClient } from "@/lib/supabase/admin"

const admin = createAdminClient()
// Admin client bypasses RLS — safe because session_token is the bearer auth
```

Alternatively, add permissive SELECT policies:
```sql
CREATE POLICY "Anyone can read viewers by session_token"
ON viewers FOR SELECT
USING (true);

CREATE POLICY "Anyone can read viewer_events"
ON viewer_events FOR SELECT
USING (true);
```

---

### 2. No CAPTCHA on gate endpoint — automated bot submissions

**Files:** `gate/route.ts`, `CombinedGateDialog.tsx`

**Problem:** The gate endpoint has no CAPTCHA/Challenge. Bots can:
- Mass-submit the gate form to create thousands of viewer records
- Automate password brute force attacks without any friction
- Trigger unlimited Resend API calls (cost exposure + spam)
- Enumerate valid email addresses by observing error responses

The PRD specifies reCAPTCHA v2 for signup (`FR-10.4`), but there's no equivalent protection for the gate endpoint which is equally exposed to bots.

**Fix:** Add Cloudflare Turnstile (free, privacy-friendly, no CAPTCHA challenges) to the CombinedGateDialog:

1. Install Turnstile widget in the gate form:
```tsx
// In CombinedGateDialog.tsx
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
<div className="cf-turnstile" data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} data-callback="onTurnstileCallback" />
```

2. Verify the token server-side in `gate/route.ts`:
```typescript
// Verify Turnstile token
const turnstileRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
  method: "POST",
  body: new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY || "",
    response: body.cf_turnstile_response,
  }),
})
const turnstileJson = await turnstileRes.json()
if (!turnstileJson.success) {
  return NextResponse.json({ error: "Security check failed. Please try again." }, { status: 403 })
}
```

3. Add Turnstile site key to the gate form validation schema:
```typescript
// In share.ts Zod schema
cf_turnstile_response: z.string().min(1, "Security check required"),
```

**Why Turnstile over reCAPTCHA:** Turnstile is invisible (no "select all traffic lights" challenges), free with no usage limits, privacy-first (no Google tracking), and works without showing any widget by default.

---

### 3. No rate limiting on /gate — password brute force + email quota drain

**Files:** `gate/route.ts`, `track/route.ts`

**Problem:** The gate endpoint has zero rate limiting. Attackers can:
- Brute force the presentation password (bcrypt compare per request)
- Exhaust the Resend daily email quota (100/day free tier) in minutes
- Fill the `viewers` table with millions of records
- Use Moduvox as an open email relay (user-controlled subject line)

The `/track` endpoint has an in-memory `Map` rate limiter that is **completely ineffective on Vercel serverless** — each cold start resets the map, concurrent instances don't share state.

**Fix:** Add database-backed rate limiting:
- **Gate:** 5 submissions per IP per hour per presentation
- **Track:** 100 events per minute per presentation (backed by Supabase, not in-memory)
- Use `pg_advisory_lock` or a Supabase `rate_limits` table

---

### 3. Session token in URL — referrer leak + bookmarkable

**Files:** `verify/page.tsx`, `verify/route.ts`, `view/[shareToken]/page.tsx`

**Problem:** After magic link verification, the session token is passed as a URL query param `?session={uuid}`. This leaks via:
- `Referer` header on all outbound links and resources (fonts, images, analytics)
- Browser history sync across devices
- Server access logs
- URLs shared via copy-paste

A leaked session token grants access to the presentation and ability to fire tracking events.

**Fix:** After the magic link redirect, strip the session from the URL immediately:
```typescript
// In the view page, after reading session from URL
useEffect(() => {
  const sessionFromUrl = searchParams.get("session")
  if (sessionFromUrl) {
    // Store in sessionStorage and strip from URL
    sessionStorage.setItem(`moduvox_session_${shareToken}`, sessionFromUrl)
    window.history.replaceState(null, "", `/view/${shareToken}`)
    validateAndLoad(sessionFromUrl)
  }
}, [shareToken])
```

---

### 4. No UNIQUE constraint — race condition on viewer dedup

**Files:** `migrations/017_create_viewers_table.sql`, `gate/route.ts`

**Problem:** No `UNIQUE (presentation_id, viewer_email)` constraint on the `viewers` table. The application-level read-then-write dedup in `gate/route.ts` has a race condition: two simultaneous submissions with the same email both get `null` from `existingViewer` and both insert duplicate rows. Both get separate magic links, both can verify independently.

**Fix:**
```sql
ALTER TABLE viewers ADD UNIQUE (presentation_id, viewer_email);
```

Then replace the read-then-write with an upsert:
```typescript
const { data: viewer } = await supabase
  .from("viewers")
  .upsert({
    presentation_id: presentation.id,
    viewer_email: parsed.data.viewer_email,
    viewer_name: parsed.data.viewer_name,
    consent_granted: true,
    email_verified: false,
    session_token: crypto.randomUUID(),
    ip_address: ipAddress,
    user_agent: userAgent,
  }, {
    onConflict: "presentation_id, viewer_email",
    ignoreDuplicates: false,
  })
  .select("id, session_token, viewer_email, viewer_name")
  .single()
```

---

### 5. Session token never expires — magic link "15 minutes" is a lie

**Files:** `gate/route.ts` (email says "expires in 15 min"), `verify/route.ts`, `verify/page.tsx`

**Problem:** The magic link email states "This link expires in 15 minutes" but no code enforces this. A session token intercepted from email compromise or Referer leak works indefinitely.

**Fix:** Add `verification_sent_at TIMESTAMPTZ` to the `viewers` table. In verify endpoints:
```typescript
if (viewer.verification_sent_at && 
    Date.now() - new Date(viewer.verification_sent_at).getTime() > 15 * 60 * 1000) {
  return NextResponse.json({ error: "Link expired" }, { status: 410 })
}
```

Set it on gate submission:
```typescript
verification_sent_at: new Date().toISOString(),
```

---

### 6. `/track` doesn't verify `email_verified` — spoofed events

**Files:** `track/route.ts`

**Problem:** The track endpoint validates that `session_token + presentation_id` matches a viewer row, but does NOT check `email_verified = true`. An attacker who obtains a session token (via Referer leak, URL bookmark) can fire arbitrary tracking events without ever verifying their email.

**Fix:** Add `.eq("email_verified", true)` to the viewer lookup in `track/route.ts`:
```typescript
const { data: viewer } = await supabase
  .from("viewers")
  .select("id")
  .eq("session_token", parsed.data.session_token)
  .eq("presentation_id", presentation.id)
  .eq("email_verified", true)  // ← ADD THIS
  .single()
```

---

## High Priority

### 7. `beforeunload` + `fetch` loses close tracking events

**File:** `ViewPlayer.tsx` (lines 127-140)

**Problem:** The "closed" tracking event uses `window.addEventListener("beforeunload", ...)` + `fetch()`. Browsers may cancel fetch on page unload. The `beforeunload` event also doesn't fire on mobile or when the browser is killed. Additionally, the closure captures `audioRef.current` at event registration time, not at fire time — the ref value may be stale.

**Fix:** Use `navigator.sendBeacon()` and read `audioRef.current.currentTime` at fire time via a stable ref:
```typescript
// Stable ref for current time
const currentTimeRef = useRef(0)
// Update it on every timeupdate
const handleTimeUpdate = useCallback(() => {
  if (audioElement) currentTimeRef.current = audioElement.currentTime
  // ... rest
}, [audioElement])

// Use sendBeacon for close event
useEffect(() => {
  function handleVisibilityChange() {
    if (document.visibilityState === "hidden" && hasTrackedOpen.current) {
      const data = JSON.stringify({
        session_token: sessionToken,
        event_type: "closed",
        time_spent_seconds: Math.round(currentTimeRef.current),
      })
      navigator.sendBeacon(`/api/view/${shareToken}/track`, data)
    }
  }
  document.addEventListener("visibilitychange", handleVisibilityChange)
  return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
}, [shareToken, sessionToken])
```

### 8. Open email relay via gate endpoint

**Files:** `gate/route.ts`

**Problem:** The gate endpoint sends emails to user-supplied addresses with a user-controlled subject line (the presentation title). With no rate limiting, an attacker can use Moduvox's Resend account to spam arbitrary recipients. The email comes from a trusted domain, making it effective for phishing.

**Fix:** 
- Cap daily email sends per presentation (e.g., 20 sends/24h)
- Cap daily email sends per recipient email (e.g., 3 sends/15min)
- Use a static email subject line
- Add Cloudflare Turnstile to the gate form (see Critical #2)

### 9. Presentation title in email subject — phishing vector

**File:** `gate/route.ts` (line 121)

**Problem:** Subject is `Verify your email to watch "{title}"`. A malicious presentation owner can set the title to `<a href="phishing.com">Verify now</a>` — the email comes from Moduvox's domain, lending trust to the phishing attempt.

**Fix:** Use a static subject:
```typescript
subject: "Verify your email to watch this presentation",
```

### 10. Two divergent verify code paths

**Files:** `verify/page.tsx` (server component) vs `verify/route.ts` (API route)

**Problem:** The magic link goes to the server component page. The client-side `validateAndLoad` also calls the API route. Both do roughly the same thing but:
- The server component silently swallows update errors (no `await` check)
- Error messages differ between paths
- The server component's VerifyError link goes to `/view/${shareToken}` with a broken `href`

**Fix:** Simplify to a single path. Make the magic link point directly to the API route, then have the API route return a 302 redirect to `/view/{shareToken}` with a sessionStorage-based handshake (no URL params). Or eliminate the API route and do everything server-side.

Simplest fix for now: keep the server component but add proper error handling and consolidate logic.

---

## Medium Priority

### 11. No email domain validation — disposable/spoofed emails

**File:** `lib/validations/share.ts`

**Problem:** Only format validation (`z.string().email()`). Anyone can use disposable emails (e.g., `tempmail123@yopmail.com`) to bypass identity tracking.

**Fix:** Add a disposable email domain blocklist check in the gate route:
```typescript
const DISPOSABLE_DOMAINS = ["yopmail.com", "guerrillamail.com", "mailinator.com", ...]
const domain = parsed.data.viewer_email.split("@")[1]
if (DISPOSABLE_DOMAINS.includes(domain)) {
  return NextResponse.json({ error: "Please use a work email address" }, { status: 422 })
}
```

### 12. Orphaned viewer records when email fails

**File:** `gate/route.ts`

**Problem:** Viewer records are committed to the DB before Resend sends the email. If the email fails, unverified viewer records accumulate with no way to complete verification (unless the user retries).

**Fix:** Either:
- Delete the viewer record if email fails (`return` before commit), or
- Add a scheduled cleanup task for unverified records older than 24h

### 13. No presentation expiration check in verify endpoint

**File:** `verify/route.ts`

**Problem:** The verify endpoint checks session token validity but does NOT check `presentation.expires_at`. A viewer can verify after the presentation has expired, then get a confusing "expired" screen on redirect.

**Fix:** Add an `expires_at` check in the verify endpoint:
```typescript
if (presentation.expires_at && new Date(presentation.expires_at) < new Date()) {
  return NextResponse.json({ error: "Presentation has expired" }, { status: 410 })
}
```

### 14. Multiple tabs create duplicate events

**File:** `ViewPlayer.tsx`

**Problem:** Each browser tab creates its own state and fires overlapping tracking events. Same viewer, duplicate opens, duplicate slide views.

**Fix:** Accept this as a client-side tracking limitation. Document that viewer stats are per-session, not per-unique-viewer. Add a note to the viewer dashboard clarifying this.

---

## Low Priority

### 15. Error message leaks Resend config state

**File:** `gate/route.ts`

**Problem:** The gate endpoint returns different messages depending on whether Resend is unconfigured vs. failed. An attacker can detect the app's email provider.

**Fix:** Return identical generic message regardless of failure cause.

### 16. Fake session token for un-gated presentations

**File:** `view/[shareToken]/page.tsx`

**Problem:** When no gate is enabled, `loadPlayerFromFullData` generates a fake `crypto.randomUUID()` session token. Tracking events are sent with this fake session, and the track endpoint returns 403 (session doesn't exist in DB). Tracking is silently dropped for un-gated presentations.

**Fix:** For un-gated presentations, create an anonymous viewer record client-side or skip tracking entirely.

### 17. IP + User Agent stored indefinitely

**Files:** `viewers` and `viewer_events` tables

**Problem:** Raw IPs and user agents stored with no retention policy. GDPR/CCPA exposure.

**Fix:** Add a 90-day cleanup cron. Hash IPs before storage. Add a data deletion endpoint keyed by session_token.

---

## Missing Across the App

### No CAPTCHA anywhere (signup + gate)

The PRD specifies reCAPTCHA v2 on signup (`FR-10.4`) but this was never implemented. There is also no CAPTCHA on the gate endpoint. This means:

- **Signup:** Bots can create unlimited accounts via `POST /api/auth/signup` (if implemented) — the only protection is email verification
- **Gate:** Bots can spam the gate endpoint to send unlimited emails and create unlimited viewer records

**Fix:** Add Cloudflare Turnstile to both signup and gate forms. Turnstile is preferred over reCAPTCHA because:
- Free with no usage caps (vs reCAPTCHA's 1M/month)
- No Google tracking (privacy win for compliance-conscious viewers)
- Invisible by default (no "I'm not a robot" checkbox)
- Same API for both client-side widget and server-side verification

---

## Things Done Correctly

- ✅ `session_token` validation includes `presentation_id` everywhere — no cross-presentation token reuse
- ✅ Session tokens use `crypto.randomUUID()` / `gen_random_uuid()` — no predictability
- ✅ Gate response does NOT leak `session_token` to the client
- ✅ View endpoint correctly gates content behind `sessionVerified` check
- ✅ `viewer_events` uses `ON DELETE CASCADE` on `presentation_id` — no orphaned events on delete
- ✅ Zod validation on all input boundaries
- ✅ Fire-and-forget tracking doesn't block playback
- ✅ Already-verified viewer path returns success without duplicate email
- ✅ Dedup reuses existing viewer record on resubmission (fixes duplicate emails in dashboard)
- ✅ `email_sent: false` is properly surfaced in CombinedGateDialog and EmailSentScreen
- ✅ Gate state is persisted in `sessionStorage` — survives page refresh

---

## Immediate Action Items (Before Next Launch Attempt)

| # | Action | File changes | Est. effort |
|---|---|---|---|
| 1 | Use `createAdminClient()` in verify/track/gate routes to bypass RLS | 4 files | 15 min |
| 2 | Strip session token from URL after verify redirect + store in sessionStorage | `view/[shareToken]/page.tsx` | 5 min |
| 3 | Add `email_verified` check to track endpoint | `track/route.ts` | 1 line |
| 4 | Add UNIQUE constraint on `(presentation_id, viewer_email)` + switch to upsert | Migration + `gate/route.ts` | 10 min |
| 5 | Add `verification_sent_at` + enforce 15-min expiry | Migration + `verify/route.ts` | 15 min |
| 6 | Use static email subject | `gate/route.ts` | 1 line |
| 7 | Replace fetch with sendBeacon for close tracking | `ViewPlayer.tsx` | 10 min |
| 8 | Add rate limiting to gate endpoint (at minimum) | `gate/route.ts` | 20 min |
| 9 | Add Cloudflare Turnstile to gate form + server-side verification | `CombinedGateDialog.tsx`, `gate/route.ts`, `.env.example` | 30 min |
