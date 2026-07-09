# Audio Bar Wiring — Plan

**Goal:** Wire real audio playback and viewer tracking to the view page.

---

### Task 1: Combined audio endpoint — session_token auth

**File:** Modify `frontend/app/api/presentations/[id]/audio/combined/route.ts`

Add a public auth path via `?session=<token>` so public viewers can access combined audio.

- [ ] Read the current file
- [ ] Add `createAdminClient` import if missing
- [ ] After the existing auth check, add: if `session` query param present, lookup viewer by `(session_token, presentation_id)`, check `email_verified`. If valid, skip the auth gate.
- [ ] Run `npx tsc --noEmit`, fix errors, commit

---

### Task 2: View API — add presentation_id and viewer_id to verified response

**File:** Modify `frontend/app/api/view/[shareToken]/route.ts`

- [ ] Add `id: presentation.id` to the verified response
- [ ] Also include `viewer_id` from the viewerData when session is verified

---

### Task 3: Wire ViewAudioBar with real audio and tracking

**File:** Rewrite `frontend/components/view/ViewAudioBar.tsx`

New props interface:
```typescript
type ViewAudioBarProps = {
  shareToken: string
  sessionToken: string
  viewerId: string
  presentationId: string
}
```

The component should:
- Construct audio URL: `/api/presentations/${presentationId}/audio/combined?session=${sessionToken}`
- Create an HTMLAudioElement via useRef
- Wire timeupdate → slider + time display
- Wire ended → send completed tracking
- Wire loadedmetadata → set duration
- On mount: send "opened" tracking event
- On tab close: sendBeacon "closed"
- Play/pause/skip/speed/volume all control the real audio element
- Use the same UI layout from the existing ViewAudioBar (shadcn Slider, Tooltips, etc.)

Run `npx tsc --noEmit`, fix errors, commit

---

### Task 4: Wire page.tsx to pass data to ViewAudioBar

**File:** Modify `frontend/app/view/[shareToken]/page.tsx`

- [ ] Add `presentationId` and `sessionToken` to the `verified` PageState type
- [ ] Store `viewer_id` from verify/gate response in the verified state
- [ ] Pass all required props to ViewAudioBar
- [ ] Run `npx tsc --noEmit`, fix errors, commit
