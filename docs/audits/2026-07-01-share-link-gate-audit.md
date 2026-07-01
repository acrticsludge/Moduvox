# Share Link Gate Flow — Audit & Fix Report

**Date:** 2026-07-01
**Branch:** `feat/share-link-improvements`
**Files Audited:** 11 files, ~1560 lines

---

## Executive Summary

Three agents debated the gate flow issues. **Consensus: one root cause + two compounding bugs** are responsible for both observed symptoms ("settings not persisting" and "gate re-appears on reload").

| Symptom | Root Cause | Fix Priority |
|---------|-----------|-------------|
| Disabled password still asked | `#3` Gate dialog never re-checks server state after initial render | **Critical** |
| Gate shows again after reload | `#1` localStorage gate state checked BEFORE server — stale data short-circuits | **Critical** |
| Resend de-verifies users | `#2` Gate upsert resets `email_verified = false` even for already-verified viewers | High |

---

## Bug #1: localStorage Gate State Blocks Server Fetch (Critical)

**File:** `frontend/app/view/[shareToken]/page.tsx` — lines 114-124

### The Bug

On page load, the `useEffect` checks localStorage gate state **before** fetching from the server:

```typescript
// Line 115-124 — EARLY RETURN, never hits server
const gateState = loadGateState(shareToken)
if (gateState) {
  setState({ type: "email_sent", ...gateState })
  return  // ← HARD RETURN. Server never consulted.
}
// Line 127 — only reached if no localStorage state
loadPresentation()
```

**This means:** If a viewer previously submitted the gate (storing `moduvox_gate_<token>` in localStorage), on every subsequent page load they see "Check your inbox" — EVEN IF:
- The owner disabled the email gate
- The owner removed the password
- The owner archived the presentation
- The presentation expired

The server is never contacted. The stale state never self-heals.

### Root Cause Design Error

localStorage is treated as **authoritative state** instead of **write-only cache**. The server should always be the source of truth for gate settings.

### The Fix

Remove the localStorage gate check from the initial load flow. Always call `loadPresentation()` first. Use localStorage only as a hint *after* the server confirms the gate is still active:

```typescript
// In the initial load useEffect — DELETE lines 114-124 entirely
// The flow becomes:
// 1. URL has session? → validateAndLoad
// 2. localStorage has session? → validateAndLoad (falls back gracefully)
// 3. Always → loadPresentation() — SERVER IS SOURCE OF TRUTH
```

Then inside `loadPresentation()`, after the server responds, check localStorage as a cache hint:

```typescript
async function loadPresentation() {
  // ... fetch from server ...
  
  if (data.has_password || data.email_gate_enabled) {
    // Gate still required — check localStorage as cache hint
    const gateState = loadGateState(shareToken)
    if (gateState) {
      setState({ type: "email_sent", ...gateState })
      return
    }
    setState({ type: "gate", meta: data })
    return
  }

  // No gate — clear stale localStorage, go to player
  clearGateState(shareToken)
  loadPlayerFromFullData(data)
}
```

Additionally, clear stale gate state on error responses (404, 410) so archived/expired presentations don't leave ghost state.

---

## Bug #3: Gate Dialog Never Re-Checks Server State (Critical)

**File:** `frontend/components/view/CombinedGateDialog.tsx` + `page.tsx`

### The Bug

When `loadPresentation()` returns `gate` state, the `CombinedGateDialog` renders with the metadata snapshot from that API call. If the owner changes settings in another tab (e.g., disables password), the already-rendered dialog still shows the password field.

```typescript
// page.tsx — gate is set once from server response
if (data.has_password || data.email_gate_enabled) {
  setState({ type: "gate", meta: data })  // ← Snapshot frozen at mount
}
```

The dialog never re-checks. The user must refresh the page.

### The Fix

Add a `visibilitychange` listener when in `gate` state that re-fetches presentation metadata:

```typescript
// In page.tsx — add when state.type === "gate"
useEffect(() => {
  if (state.type !== "gate") return
  
  function handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      // Re-fetch gate settings
      fetch(`/api/view/${shareToken}`)
        .then(res => res.json())
        .then(json => {
          if (json.data && !json.data.has_password && !json.data.email_gate_enabled) {
            clearGateState(shareToken)
            loadPlayerFromFullData(json.data)
          } else if (json.data) {
            setState({ type: "gate", meta: json.data })
          }
        })
        .catch(() => {})
    }
  }
  
  document.addEventListener("visibilitychange", handleVisibilityChange)
  return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
}, [state.type, shareToken])
```

---

## Bug #2: Gate Upsert Resets `email_verified` (High)

**File:** `frontend/app/api/view/[shareToken]/gate/route.ts` — line 106

### The Bug

Every gate submission sets `email_verified = false`:

```typescript
// line 106
email_verified: false,  // ← Always reset to false even for verified viewers
```

When a user clicks "Resend" or re-submits the gate, the `viewers` row is upserted on `(presentation_id, viewer_email)` conflict. The existing row's `email_verified` is **overwritten to false**, de-verifying an already-verified viewer.

### Reproduction

1. User submits gate → email sent → clicks magic link → `email_verified = true`
2. User refreshes the view page → sees `EmailSentScreen` (from localStorage gate state, Bug #1)
3. User clicks "Resend" → gate API upserts with `email_verified = false`
4. User is now **de-verified**. Must re-click magic link.

### The Fix

Check if the viewer already exists and is verified. If so, preserve the verified state:

```typescript
// Before upsert, check if viewer exists
const { data: existingViewer } = await supabase
  .from("viewers")
  .select("id, email_verified")
  .eq("presentation_id", presentationId)
  .eq("viewer_email", parsed.data.email)
  .maybeSingle()

// Set email_verified based on existing state
const alreadyVerified = existingViewer?.email_verified === true

const { data: viewer, error: viewerError } = await supabase
  .from("viewers")
  .upsert({
    presentation_id: presentationId,
    viewer_email: parsed.data.email,
    viewer_name: parsed.data.name,
    session_token: sessionToken,
    email_verified: alreadyVerified,  // ← Preserve verified state
    consent_granted: parsed.data.consent,
    ip_address: ip,
    user_agent: ua,
    verification_sent_at: new Date().toISOString(),
  }, { onConflict: "presentation_id, viewer_email" })
  .select()
  .single()
```

And skip sending the email if already verified:

```typescript
if (alreadyVerified) {
  // Already verified — just return success, don't re-send email
  return NextResponse.json({
    data: {
      viewer_id: existingViewer.id,
      viewer_name: parsed.data.name,
      viewer_email: parsed.data.email,
      email_sent: false,
      already_verified: true,
    },
  })
}
```

---

## Secondary Issues

### 4. Session Token Never Expires Server-Side (Medium)

`viewers.session_token` has no expiry check. A verified session token works indefinitely. The only protections are presentation-level (`expires_at`, `status = archived`).

**Fix:** Add `max-age` to session tokens. Either:
- Set `session_expires_at` column on `viewers` (30 days from creation)
- Check it in the view API and verify endpoint
- Clear expired sessions on read

### 5. Duplicate Verify Logic (Medium)

Both `verify/page.tsx` (Server Component) and `verify/route.ts` (API) have duplicate validation logic. They can diverge.

**Fix:** Make the Server Component delegate to the API route via a shared utility function.

### 6. ShareSettingsPanel Separate PATCH Calls (Low)

Each setting change (toggle email gate, set password, set expiry) makes an independent PATCH request. If one fails mid-sequence, the panel shows partial state.

**Fix:** Batch all pending changes into a single PATCH call. This is a UX polish, not a bug.

---

## Fix Priority Matrix

| # | Fix | Impact | Effort | Risk | File(s) |
|---|-----|--------|--------|------|---------|
| 1 | Reorder localStorage check (after server, not before) | **High** — fixes reload bug | Low | Low | `page.tsx` |
| 2 | Re-fetch gate settings on visibility change | **High** — fixes stale password | Low | Low | `page.tsx` |
| 3 | Preserve `email_verified` on gate upsert | High — fixes re-send bug | Low | Low | `gate/route.ts` |
| 4 | Add session token expiry | Medium — security hygiene | Low | Low | `view/route.ts`, `verify/route.ts` |
| 5 | Unify verify logic | Medium — consistency | Low | Low | `verify/page.tsx` + `route.ts` |
| 6 | Batch share settings PATCH | Low — UX polish | Low | Low | `ShareSettingsPanel.tsx` |

---

## Agent Verdict

After debate, all three agents agreed:
1. **Bug #1 is the root cause** of "settings not persisting" and "gate re-appears on reload." localStorage must never gate server contact.
2. **Bug #3 compounds it** — the gate dialog is a static snapshot with no live re-check.
3. **Bug #2 makes it worse** — resending the gate de-verifies users caught in the stale state trap.

Fixes #1 and #3 alone resolve both observed symptoms. Fix #2 prevents the de-verification spiral.
