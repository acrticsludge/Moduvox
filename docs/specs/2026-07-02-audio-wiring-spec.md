# Audio Bar Wiring — Spec

**Date:** 2026-07-02
**Goal:** Wire real audio playback and tracking to the view page audio bar.

## Architecture

### Audio Flow
```
ViewAudioBar
  │
  ├── HTMLAudioElement ←── /api/presentations/[id]/audio/combined?session=<token>
  │                              (public endpoint, auth via session_token)
  │
  ├── timeupdate → progress bar, time display
  ├── play/pause → audio.play() / audio.pause()
  ├── playbackRate → audio.playbackRate
  ├── volume → audio.volume
  └── ended → send "completed" tracking event

Tracking Flow
  │
  ├── on mount → POST /api/view/[shareToken]/track { event: "opened" }
  ├── on tab close → sendBeacon → { event: "closed" }
  └── on audio end → POST → { event: "completed" }
```

### Changes Required

### 1. Combined Audio Endpoint — public auth via session_token

File: `frontend/app/api/presentations/[id]/audio/combined/route.ts`

- Accept optional `?session=<token>` query parameter
- When provided, bypass the auth check and look up viewer by session_token
- Validate viewer exists and is verified for this presentation
- Return audio stream as before

### 2. View API — add presentation_id to verified response

File: `frontend/app/api/view/[shareToken]/route.ts`

- Add `id: presentation.id` and `session_token` to the verified response

### 3. ViewAudioBar — real audio + tracking

File: `frontend/components/view/ViewAudioBar.tsx`

New props:
- `audioUrl?: string` — URL for the combined audio
- `shareToken: string` — for tracking endpoint
- `sessionToken: string` — for auth + tracking
- `viewerId: string` — for tracking
- `presentationId: string` — for constructing audio URL

Internal changes:
- Create `useRef<HTMLAudioElement>` and wire to audio URL
- `timeupdate` handler → update currentTime state
- `loadedmetadata` → set duration state
- `ended` → send completed tracking
- Play/Pause button → audio.play()/pause()
- Progress slider → audio.currentTime = value
- Speed pill → audio.playbackRate = value
- Volume button → audio.volume, audio.muted
- Skip ±10s → audio.currentTime ±= 10

Tracking:
- On mount: POST `/api/view/[shareToken]/track` with `{ event_type: "opened", session_token }`
- On visibilitychange hidden: sendBeacon with `{ event_type: "closed" }`
- On ended: POST `{ event_type: "completed", progress_pct: 100 }`

### 4. page.tsx — pass data to ViewAudioBar

- Add `presentationId` and `sessionToken` to the `verified` PageState type
- Construct audio URL: `/api/presentations/${presentationId}/audio/combined?session=${sessionToken}`
- Pass all props to ViewAudioBar
