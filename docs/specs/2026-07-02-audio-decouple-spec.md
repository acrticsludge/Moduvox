# Audio Generation/Playback Decoupling — Spec

**Date:** 2026-07-02

## Problem

Playback controls are coupled with audio generation:
1. On play → API call → generates combined WAV → 13s delay
2. On seek → API call (Range request) → reprocesses audio → 13s delay
3. Every interaction triggers the generation pipeline

## Architecture

### Generation (one-time, decoupled from playback)

```
[Narration created] → [ensure endpoint] → [concat per-slide WAVs] → [upload combined.wav to storage] → [done]
                                                                         ↓
                                                                   [signed URL returned]
```

The `ensure` endpoint checks if `combined.wav` exists at `{userId}/audio/{presentationId}/combined.wav` in the `presentation-files` bucket. If not, it generates it from per-slide files, uploads it, and returns a signed URL. This is called **once per presentation lifetime**.

### Playback (zero API calls after URL is obtained)

```
[View API returns audio_url] → [Howler loads from CDN] → [play/pause/seek all client-side]
```

The view API includes `audio_url` in its verified response (a signed URL to the cached combined.wav). The frontend passes this URL to Howler.js once. All subsequent play/pause/seek/skip operations use the same Howl instance — **zero network requests**.

### Data Flow

```
page.tsx
  │
  ├── fetch /api/view/[shareToken]
  │     └── returns { ..., audio_url: "signed-url" }
  │
  └── ViewAudioBar receives audioUrl prop
        │
        ├── If audioUrl is null → call ensure endpoint → get URL
        │
        └── new Howl({ src: [audioUrl], html5: true })
              ├── play() → client-side only
              ├── seek(X) → client-side only
              ├── pause() → client-side only
              └── rate(X) → client-side only
```

### New Endpoint: POST /api/presentations/[id]/audio/ensure

- Auth: Supabase user session (dashboard) or `?session=<token>` (viewer)
- Logic:
  1. Look up presentation to get `user_id`
  2. Build path: `${user_id}/audio/${presentationId}/combined.wav`
  3. Try to create signed URL for existing file
  4. If exists → return `{ data: { audioUrl: signedUrl } }`
  5. If not → list per-slide files, download+concat, upload combined.wav, create signed URL, return
- Returns JSON (not audio bytes) — the URL for the frontend to load

### Modified View API: GET /api/view/[shareToken]

- Add `audio_url: string | null` to verified response
- If combined.wav exists → sign it → include in response
- If not → return null

### Modified ViewAudioBar

- Accept `audioUrl?: string` prop (from view API)
- If audioUrl is provided → create Howl once → never recreate
- If null → call ensure endpoint → get URL → create Howl
- All interactions use the same Howl instance
- No URL construction, no audio endpoint calls during playback

### Files to Change

1. **Create**: `frontend/app/api/presentations/[id]/audio/ensure/route.ts`
2. **Modify**: `frontend/app/api/view/[shareToken]/route.ts` — add audio_url
3. **Modify**: `frontend/components/view/ViewAudioBar.tsx` — use audioUrl prop, call ensure if null
4. **Modify**: `frontend/app/view/[shareToken]/page.tsx` — pass audioUrl to ViewAudioBar
5. **Remove** (cleanup): The old combined endpoint's generation logic lives on in the ensure endpoint
