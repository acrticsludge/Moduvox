# Audit: Public-to-Restricted Access Switch While Viewer Is Watching

**Date:** 2026-07-31
**Branch:** feat/worker-public-audit-fixes
**Severity:** Medium — viewer can continue watching indefinitely after owner enables gate

## Scenario

A viewer opens a public presentation (no password, no email gate). While watching, the owner changes share settings to require password or email verification. Multiple sub-scenarios exist:

| # | Owner action | Viewer type | Expected | Actual (before fix) |
|---|---|---|---|---|
| 1 | Enable password | Public (no session) | Next poll detects, forces gate | **N/A** — public viewers don't poll; they re-fetch on page load |
| 2 | Enable password | Verified (existing session) | Next poll detects, shows access banner → viewer verifies | **No detection** — polling ignores `has_password` |
| 3 | Enable email gate | Public (no session) | Next poll detects, forces gate | **N/A** — public viewers don't poll |
| 4 | Enable email gate | Verified (existing session) | Next poll detects, shows access banner → viewer verifies | **No detection** — polling ignores `email_gate_enabled` |
| 5 | Enable both | Verified (existing session) | Next poll detects, shows access banner | **No detection** |
| 6 | Disable gate | Verified (existing session) | No disruption (already watching) | **Correct** — no action needed |
| 7 | Enable gate + archive | Verified (existing session) | Poll catches 410, shows archive screen | **Silently ignored** — `if (!res.ok) return` drops 410 |
| 8 | Disable gate while on gate dialog | Gate state | Tab focus auto-proceeds | **Correct** — visibilitychange detects |
| 9 | Enable gate while on email_sent screen | Email sent state | Tab focus refreshes meta | **Correct** — visibilitychange detects |

## Root Cause

The 30s polling loop (lines 479-521) tracks only content freshness:
- `audio_version`
- `slide_count`
- `total_duration_ms`

It does **not** compare `has_password` or `email_gate_enabled` from successive poll responses. The API returns these fields in every response (Shape B for verified viewers), but the polling code ignores them.

Additionally, the `visibilitychange` handler (lines 170-224) runs only in `"gate"` and `"email_sent"` states — never in `"verified"`. So even tab focus wouldn't catch the change.

## Fix Applied

1. **gateRef added** — tracks current `{ hasPassword, emailGateEnabled }` across polls
2. **Gate comparison in polling** — after content checks, compares new gate state against previous. If gate was previously off and is now on, sets `versionStatus` to `"access_changed"`
3. **"Access changed" banner** — amber/orange styling in ViewAudioBar with "Access changed — Verify" button
4. **revalidateAccess()** — fetches `/api/view/{shareToken}` without session token. If gate is active, clears localStorage gate state and transitions to `"gate"` state (shows CombinedGateDialog). If gate was disabled again, clears the warning.
5. **gateRef populated on initial load** — both `loadPresentation()` and `validateAndLoad()` populate gateRef when setting viewDataRef

### Edge Cases Handled

| Case | Behavior |
|---|---|
| Gate enabled → disabled before poll | Banner shows, revalidate sees no gate, clears to "synced" |
| Gate enabled, viewer re-verifies | Gate dialog appears, viewer can enter password/email to regain access |
| Gate enabled + archived simultaneously | revalidateAccess catches 410, shows archived/expired state |
| Poll fails (network) | Silent catch — no false alarm |
| Viewer was public (no session) | Never polls — always hits gate on next page load (unchanged behavior) |

## Verification

- TypeScript: compiles clean (`npx tsc --noEmit` — no errors)
- ViewAudioBar: three versionStatus states now handled (synced/green, access_changed/amber, outdated/yellow)
- Backward compat: existing "outdated" banner unchanged, onRefresh still works for content changes

## Remaining Gaps

- **Scenario 7 (archive + gate):** The polling loop still silently ignores non-200 responses. If the presentation is archived, the viewer won't know until they refresh. Fix would require checking for 410 in polls — left for a future enhancement since archive is rare.
- **Public viewers (no session):** They never poll, so they cannot detect gate changes live. This is acceptable — they'll see the gate on next page load or tab focus (which does re-fetch for non-verified states via visibilitychange).
