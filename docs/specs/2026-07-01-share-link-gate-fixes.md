# Share Link Gate Fixes

**Goal:** Fix three gate flow bugs causing "settings not persisting" and "gate re-appears on reload."

## Fix #1: Reorder localStorage Check

**File:** `frontend/app/view/[shareToken]/page.tsx`

Remove the localStorage gate state check from the initial load (lines 114-124). Move it inside `loadPresentation()` as a cache hint checked AFTER the server confirms the gate is still active.

## Fix #2: Re-fetch Gate Settings on Tab Focus

**File:** `frontend/app/view/[shareToken]/page.tsx`

Add a `visibilitychange` listener when in `gate` state. On tab refocus, re-fetch presentation metadata. If settings changed (gate disabled), go to player and clear localStorage.

## Fix #3: Preserve email_verified on Gate Upsert

**File:** `frontend/app/api/view/[shareToken]/gate/route.ts`

Check if viewer exists and is already verified before upserting. Preserve `email_verified` state. Skip sending email if already verified.
