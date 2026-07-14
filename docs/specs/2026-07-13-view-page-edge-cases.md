# Spec: View Page Edge Cases

## Issue 1: Audio timing not re-synced after regeneration

**Problem:** When audio is regenerated (slide durations change), the view page's `applyChanges` relies on the 30s polling to have already updated `viewDataRef.current` with new `slide_timings`. This race condition can leave stale timing data in the AudioBar.

**Fix:** `applyChanges` fetches the view API directly to get fresh `slide_timings`, `total_duration_ms`, and `audio_url` before remounting the AudioBar.

## Issue 2: Gate can be bypassed when enabled after sharing

**Problem:** A viewer verified before gate was enabled has a stored session token. On next load, `validateAndLoad` verifies the session against the verify endpoint (which checks session_token validity, not gate status) and enters "verified" state without re-checking gate requirements.

**Fix:** After successful verification in `validateAndLoad`, check if the server now requires a gate (has_password or email_gate_enabled). If so, redirect to gate instead of proceeding to verified.

## Issue 3: Email sent screen stuck when gate disabled after sharing

**Problem:** A viewer on the "email_sent" screen when the owner disables the gate has no auto-proceed mechanism. The visibilitychange handler only covers the "gate" state.

**Fix:** Add a polling mechanism or extend the visibilitychange handler to cover "email_sent" state, auto-proceeding when the gate is removed.

## Files Changed

| File | Changes |
|------|---------|
| `frontend/app/view/[shareToken]/page.tsx` | Fix all 3 issues |

## Detailed Changes

### Fix 1: applyChanges re-fetches view data
Replace the simple `fetchSlides(tok, shareToken)` call with a full re-fetch of the view API to get fresh timing data, then apply it before remounting.

### Fix 2: Re-check gate in validateAndLoad
After `viewRes` returns successfully (line 274-283), check `viewJson.data.has_password` or `viewJson.data.email_gate_enabled`. If either is true, clear session/gate state and redirect to gate via `loadPresentation()`.

### Fix 3: Auto-proceed from email_sent
Add a `useEffect` for the "email_sent" state that periodically checks gate status (every 10s) or on visibilitychange, and auto-proceeds if the gate is no longer required.
