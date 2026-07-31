# Plan: Worker Audit Fixes + Public-to-Restricted Gate

**Date:** 2026-07-31
**Branch:** feat/worker-public-audit-fixes
**Spec:** docs/specs/2026-07-31-worker-public-audit-design.md

## Phase 1: Worker R2 Infrastructure

### 1.1 Copy env vars to worker
- **File:** `worker/.env.example` — add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WORKER_AUTH_API_KEY
- **Verify:** file contains all new vars

### 1.2 Install R2 SDK deps
- **Cmd:** `cd worker && npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
- **Verify:** package.json has new deps

### 1.3 Port wav-utils to worker
- **New file:** `worker/lib/wav-utils.js`
- Port `findDataOffset`, `isValidWav`, `concatWavBuffers` from `frontend/lib/wav-utils.ts`
- Convert TS to plain JS (remove types, use JSDoc comments)
- **Verify:** functions work with Node.js Buffer

### 1.4 Create R2 client for worker
- **New file:** `worker/lib/r2.js`
- S3 client configured for R2 endpoint: `https://{ACCOUNT_ID}.r2.cloudflarestorage.com`
- Exports: `getObject(Bucket, Key)`, `putObject(Bucket, Key, Body, ContentType)`, `deleteObject(Bucket, Key)`, `copyObject(Bucket, CopySource, Key)`
- **Verify:** R2 env vars loaded correctly

## Phase 2: Worker Rebuild Endpoint

### 2.1 Add /rebuild-audio route to worker
- **File:** `worker/server.js`
- Route: `POST /rebuild-audio` — auth middleware required
- Body validation (manual, no zod needed): userId, presentationId, slideCount
- Logic:
  1. Construct slide keys: `{userId}/audio/{presentationId}/slides/slide-{1..slideCount}.wav`
  2. Download all slide WAVs in parallel via r2.getObject
  3. Validate each with isValidWav
  4. Concatenate via concatWavBuffers
  5. Upload to temp key: `{userId}/audio/{presentationId}/combined-rebuild.wav`
  6. Delete old combined.wav if exists
  7. Copy temp to combined.wav via copyObject
  8. Delete temp
  9. Return `{ ok: true, size: combinedSize }`
- **Verify:** curl test with valid auth and test WAVs

## Phase 3: Vercel Rebuild Route Update

### 3.1 Update rebuild route to delegate to worker
- **File:** `frontend/app/api/presentations/[id]/audio/rebuild/route.ts`
- Changes:
  1. Keep existing: validate auth, verify presentation ownership
  2. Keep: bump `audio_version` in DB (quick DB op)
  3. **Replace** R2 download+concat+upload block with fire-and-forget fetch to worker
  4. Return `{ data: { queued: true } }` with 202 status
  5. Fire-and-forget: `fetch(workerUrl + "/rebuild-audio", { method: "POST", headers: { "Authorization": ..., "Content-Type": "application/json" }, body: JSON.stringify({ userId, presentationId, slideCount }) }).catch(() => {})`
- **Verify:** rebuild request returns immediately; combined.wav appears after worker processing

## Phase 4: Email Lazy Wake

### 4.1 Add health ping to email producer
- **File:** `frontend/lib/email.ts`
- After `supabase.from("email_queue").insert(...)`, add:
  ```ts
  if (process.env.RENDER_WORKER_URL) {
    fetch(`${process.env.RENDER_WORKER_URL}/health`).catch(() => {})
  }
  ```
- **Verify:** email send triggers worker wake

## Phase 5: View Page Gate Detection

### 5.1 Store gate state in ref
- **File:** `frontend/app/view/[shareToken]/page.tsx`
- Add refs: `gateRef = useRef({ hasPassword: false, emailGateEnabled: false })`
- Populate on initial verified load from `viewDataRef.current`

### 5.2 Add gate comparison in polling
- In the 30s polling `useEffect`, after checking content changes:
  ```ts
  const newHasPassword = json.data.has_password ?? false
  const newEmailGate = json.data.email_gate_enabled ?? false
  const prevGate = gateRef.current
  const gateChanged = newHasPassword !== prevGate.hasPassword || newEmailGate !== prevGate.emailGateEnabled
  if (gateChanged && (newHasPassword || newEmailGate)) {
    setVersionStatus("access_changed")
  }
  gateRef.current = { hasPassword: newHasPassword, emailGateEnabled: newEmailGate }
  ```

### 5.3 Add revalidateAccess function
- New function in view page:
  ```ts
  async function revalidateAccess() {
    const res = await fetch(`/api/view/${shareToken}`)
    if (!res.ok) {
      if (res.status === 410) { /* archived/no_content */ }
      else { setState({ type: "not_found" }) }
      return
    }
    const json = await res.json()
    if (json.data.has_password || json.data.email_gate_enabled) {
      clearGateState(shareToken)
      setState({ type: "gate", meta: json.data })
    } else {
      setVersionStatus("synced")
    }
  }
  ```

### 5.4 Add access-changed banner to ViewAudioBar
- **File:** `frontend/components/view/ViewAudioBar.tsx`
- New `versionStatus` value: `"access_changed"`
- Banner styling: amber/orange (different from yellow "outdated")
- Text: "Access changed — Verify"
- onClick: calls `onRevalidateAccess` prop
- Add `onRevalidateAccess?: () => void` to props

### 5.5 Wire revalidateAccess to ViewAudioBar
- Pass `revalidateAccess` as `onRevalidateAccess` prop

### 5.6 Handle public viewers (no session)
- No change needed — public viewers don't poll, they always hit the gate on page load
- Verified field is already correct

## Phase 6: Audit Document Updates

### 6.1 Mark worker audit items as complete
- **File:** `docs/architecture/worker-task-audit.md`
- Items 1 (combined audio) → DONE
- Items 3 (lazy wake) → DONE
- Item 4 (audio gen) → STILL PENDING (not breaking on Hobby, leave until it does)

## Phase 7: Tests

### 7.1 Worker endpoint test
- **File:** `worker/test/rebuild-audio.test.js`
- Test with mocked R2 client
- Verify: downloads correct keys, validates WAVs, concatenates, uploads to correct key
- Verify: error handling for missing slides, invalid WAVs

### 7.2 View page polling test
- **File:** `frontend/__tests__/view-gate-detection.test.ts`
- Mock fetch responses
- Verify: gate change sets versionStatus to "access_changed"
- Verify: no false alarm when gate doesn't change
- Verify: revalidateAccess transitions to gate state

### 7.3 Integration smoke test
- Run `npm run build` in frontend
- Run `node server.js` in worker (if possible locally)
- Manual test: rebuild audio via dashboard, verify 202 response
