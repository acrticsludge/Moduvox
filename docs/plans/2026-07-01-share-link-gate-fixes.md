# Share Link Gate Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** Fix 3 gate flow bugs in the share link viewer.

---

### Task 1: Reorder localStorage gate check (Fix #1)

**Files:**
- Modify: `frontend/app/view/[shareToken]/page.tsx`

**Context:** The gate state stored in `moduvox_gate_<token>` localStorage is checked BEFORE the server fetch. On every page load where no URL session or localStorage session exists, `loadPresentation()` must ALWAYS be called first. Then, if the server confirms the gate is still active, localStorage can be consulted as a cache hint to show `EmailSentScreen` instead of re-submitting.

**Changes:**
1. Delete the localStorage gate check block (lines 114-124) from the initial `useEffect`
2. Move it inside `loadPresentation()` — after the server responds with gate required, check localStorage
3. If server responds with no gate, clear stale localStorage gate state

**Expected behaviors after fix:**
- Owner disables gate → next page load skips straight to player
- Owner archives presentation → next page load shows "Archived" screen (not "Check your inbox")
- Viewer with active gate who previously submitted → sees "Check your inbox" (same as before, but now correctly cached)

---

### Task 2: Re-fetch gate settings on visibility change (Fix #3)

**Files:**
- Modify: `frontend/app/view/[shareToken]/page.tsx`

**Context:** When the gate dialog is shown, its settings (has_password, email_gate_enabled) are a snapshot from the initial `loadPresentation()` call. If the owner changes settings in another tab, the dialog never updates.

**Changes:**
- Add a `useEffect` that triggers when `state.type === "gate"`
- Listens to `visibilitychange` events
- On tab refocus, re-fetches `GET /api/view/${shareToken}`
- If gate is no longer required → clear localStorage, go to player
- If gate settings changed (e.g., password removed) → update the dialog's meta state

**Expected behaviors after fix:**
- Owner opens share link → sees gate with password field
- Owner switches to dashboard tab → disables password
- Owner switches back to view tab → gate dialog updates (password field gone)
- Owner switches to dashboard → disables email gate entirely
- Owner switches back → gate dialog disappears → player loads

---

### Task 3: Preserve email_verified on gate upsert (Fix #2)

**Files:**
- Modify: `frontend/app/api/view/[shareToken]/gate/route.ts`

**Context:** Every gate submission sets `email_verified: false` via upsert. This de-verifies already-verified viewers when they click "Resend." A verified viewer who re-submits the gate should stay verified.

**Changes:**
1. Before upsert, check if a viewer with this email + presentation already exists and is `email_verified === true`
2. If already verified, skip the email send and return success with `already_verified: true`
3. If not verified, preserve the current `email_verified` value (don't force to false)

**Expected behaviors after fix:**
- Viewer submits gate → email sent → clicks magic link → `email_verified = true`
- Viewer refreshes → sees "Check your inbox" (from localStorage gate state)
- Viewer clicks "Resend" → gate API checks existing state → sees already verified → returns success without re-sending email → preserves `email_verified = true`
