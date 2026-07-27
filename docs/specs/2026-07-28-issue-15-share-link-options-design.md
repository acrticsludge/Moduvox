# Issue #15: Anyone With the Link or Custom Access Options

## Status
Not started — planning phase

## Root Cause
The share settings already support password protection, email gate, and expiration. However, the UX for setting access levels is unclear. The `ShareSettingsPanel.tsx` says "Anyone with the link can watch without verification" by default, but the user may want to set a specific access mode:

- **Anyone with link** (no verification, no password) — current default
- **Email required** (gate by email) — exists
- **Password required** — exists
- **Email + Password** — combination possible

The issue is that there's no clear "access level" selector that groups these settings into an understandable choice.

## Expected Behavior
- Clear toggle between "Public access" and "Restricted access"
- Under "Restricted": password, email gate, or both
- Settings panel clearly communicates the current access state

## Actual Behavior
- Individual settings (password, email gate, expiration) without a unified "access level"
- Users may not understand how these settings interact

## Files Affected
- `frontend/components/dashboard/ShareSettingsPanel.tsx` — redesign access level UX
- `frontend/lib/validations/share.ts` — update schemas if needed

## Edge Cases
1. Password + email gate both enabled → user must pass both
2. "Anyone with link" restored after having password → password_hash set to null
3. Expiration and access level interaction → expired link = no access regardless
4. Password reset → old links become invalid
5. Share link copied before settings change → old link still works (no invalidation mechanism)

## Acceptance Criteria
1. Share settings panel has clear "Access Level" section: Public / Restricted
2. Public = no password, no email gate (but expiration still works)
3. Restricted = password and/or email gate toggle
4. Settings show a summary of current configuration (e.g., "Password protected · Expires in 7 days")
5. No breaking changes to existing share link infrastructure
