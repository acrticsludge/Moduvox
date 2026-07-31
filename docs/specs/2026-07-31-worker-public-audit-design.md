# Spec: Worker Audit Fixes + Public-to-Restricted Gate

**Date:** 2026-07-31
**Branch:** feat/worker-public-audit-fixes
**Status:** approved

## Part A: Worker Audit Implementation

Existing audit: `docs/architecture/worker-task-audit.md`

Three fixes to implement (priority order):

### A1: Combined Audio Rebuild → Worker (CRITICAL)

**Problem:** `POST /api/presentations/[id]/audio/rebuild` takes 17-42s (download all slide WAVs → concat → upload result). Guaranteed timeout on Vercel Hobby (10s).

**Fix:** Add `/rebuild-audio` endpoint on Render worker. Vercel route delegates heavy I/O to worker.

**Worker endpoint:** `POST /rebuild-audio`
- Auth: `Authorization: Bearer <API_KEY>` matching middleware
- Body: `{ userId, presentationId, slideKeys: string[], combinedKey: string, slideCount: number }`
- R2 keys already structured: `{userId}/audio/{presentationId}/slides/slide-{N}.wav`
- Worker: download all slide WAVs from R2 → validate each with `isValidWav()` → concat via `concatWavBuffers()` → upload to `combinedKey` (temp first, then atomic rename)
- Returns: `{ ok: true, size: number }`

**Worker dependencies to add:**
- `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (R2 S3-compatible)
- `@supabase/supabase-js` (to bump audio_version)

**Worker changes:**
1. `worker/lib/wav-utils.js` — ported from `frontend/lib/wav-utils.ts` (plain JS)
2. `worker/lib/r2.js` — R2 S3 client (plain JS, same env vars as frontend)
3. New `POST /rebuild-audio` route in `server.js`
4. `worker/.env.example` — add R2_* vars

**Frontend changes:** `POST /api/presentations/[id]/audio/rebuild`
- Quick ops stay on Vercel: validate auth, bump `audio_version` in DB
- Fire-and-forget `fetch()` to worker for the slow R2 I/O
- Return 202 Accepted immediately
- If worker call fails, audio_version is already bumped — client will see stale combined but correct slide count. Next rebuild request will fix it.

### A2: Lazy Wake for Email Queue (LOW)

**Problem:** Vercel Hobby ignores cron jobs. Worker sleeps after 15min inactivity. Emails may be delayed.

**Fix:** Every Vercel API route that inserts to `email_queue` also pings `${RENDER_WORKER_URL}/health` as a side effect.

**Files to change:**
- `frontend/lib/email.ts` — add `fetch(workerUrl + "/health").catch(() => {})` after queue insert

### A3: Image Descriptions → Worker (CONDITIONAL — architecture only)

**Problem:** 20 images at ~10s each = 70s total. Guaranteed timeout on Hobby. Also hits 4.5MB body limit.

**Fix (architecture only — no code change):**
- The existing code already handles this at the client level (images downscaled to 400px, sent immediately on slide load)
- Moving the full pipeline to worker requires major refactor (DB-backed job queue, client polling, Gemini/Nemotron SDKs on worker)
- **Decision:** Document the architecture in the audit doc. Not implementing the worker move at this time — the client-side batching is working for production.

### A4: Worker Env Vars

Required on Render:
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- Already set on Vercel, copy to Render

---

## Part B: Public-to-Restricted Gate Detection

**Audit findings:** When an owner enables password/email gate while a verified viewer is watching, the viewer continues uninterrupted. The polling loop (30s) tracks `audio_version`, `slide_count`, `total_duration_ms` but ignores `has_password` and `email_gate_enabled`.

**Fix: Add gate-change detection to polling loop.**

### B1: Detect gate changes in polling

In `frontend/app/view/[shareToken]/page.tsx`, polling `useEffect`:

1. Store initial `has_password` and `email_gate_enabled` in `viewDataRef.current`
2. Compare against new poll response
3. If gate changed from false → true:
   - Set `versionStatus` to a new "access_changed" state
   - Show a warning banner: "This presentation is now restricted. You will be asked to verify access on next visit."
4. Add a `revalidateAccess()` function: re-fetches view data without session token, checks gate status, transitions to `"gate"` state if gate is active

### B2: Gate-change banner in ViewAudioBar

Similar to "Changes detected — Refresh" banner but with different styling (amber/orange for access change vs yellow for content update):
- Text: "Access settings changed — Verify" 
- On click: calls `revalidateAccess()` which re-runs the validate flow

### B3: Revalidate flow

When viewer clicks "Verify" on the access-change banner:
1. Call `GET /api/view/{shareToken}` without session token
2. If gate active: transition to `"gate"` state (shows CombinedGateDialog)
3. If gate inactive: viewer can continue watching (false alarm, likely gate was toggled off again)
4. If archived/expired: transition to `"archived"`/`"expired"` state

### B4: Edge cases

| Scenario | Behavior |
|---|---|
| Gate enabled → disabled before poll | Banner shows briefly, revalidate sees no gate, no disruption |
| Gate enabled, viewer has valid session | Viewer goes to gate dialog, can verify to regain access |
| Gate enabled, viewer was public (no session) | Already at gate — no change needed |
| Gate enabled + archived simultaneously | Revalidate sees 410, shows "archived" state |
| Poll fails (network) | Silent — no false alarm |

---

## Implementation Order

1. Add R2 SDK + wav-utils to worker, add R2 env vars to `.env.example`
2. Create `POST /rebuild-audio` on worker
3. Update Vercel rebuild route to fire-and-forget to worker
4. Add lazy wake to email producer
5. Add gate-change detection to view page polling
6. Add "access changed" banner to ViewAudioBar
7. Add `revalidateAccess()` function
8. Update audit doc
9. Write test files
10. Verify nothing breaks

## Success Criteria

- [ ] Worker accepts `/rebuild-audio` with auth, downloads WAVs, concatenates, uploads result
- [ ] Vercel rebuild route returns 202, worker completes in background
- [ ] Email producer pings worker health on queue insert
- [ ] View page polling detects `has_password`/`email_gate_enabled` changes
- [ ] "Access changed" banner appears when gate is newly enabled
- [ ] Revalidate flow transitions viewer to gate dialog correctly
- [ ] No regressions: public viewers, existing verified viewers without gate changes, page reload
