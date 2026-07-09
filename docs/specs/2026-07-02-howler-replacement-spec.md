# Howler.js Audio Replacement — Spec

**Goal:** Replace raw `<audio>` element with Howler.js for reliable cross-browser audio playback.

## Why Howler.js

- `html5: true` mode streams large WAV files without loading into memory
- Consistent seek/play/pause across all browsers (fixes Safari/iOS issues)
- `onloaderror` gives specific error codes (404, format, CORS) instead of silent failure
- Handles AudioContext suspension and mobile autoplay policies automatically
- Pool-based instance management prevents element lifecycle bugs

## Architecture

### Howl Instance Lifecycle

```
Mount → new Howl({ src, html5: true }) → on('load') → ready=true
                                            → on('loaderror') → ready=true, show error
                                            → on('play') → playing=true
                                            → on('pause') → playing=false  
                                            → on('end') → playing=false, send completed
                                            → on('seek') → update currentTime

Unmount → howl.unload() → cleanup
```

### Howl API Mapping

| Current (HTMLAudioElement) | Howler.js |
|---------------------------|-----------|
| `new Audio(url)` | `new Howl({ src: [url], html5: true })` |
| `audio.play()` | `howl.play()` |
| `audio.pause()` | `howl.pause()` |
| `audio.currentTime = X` | `howl.seek(X)` |
| `audio.currentTime` | `howl.seek()` (getter) |
| `audio.duration` | `howl.duration()` |
| `audio.playbackRate = X` | `howl.rate(X)` |
| `audio.volume = X` | `howl.volume(X)` |
| `audio.muted = X` | `howl.mute(X)` |
| `onTimeUpdate` | Poll with requestAnimationFrame or use `on('seek')` |
| `onLoadedMetadata` | `on('load')` |
| `onCanPlay` | `on('load')` |
| `onEnded` | `on('end')` |
| `onError` | `on('loaderror', id, errorCode)` |
| `audio.pause(); src = ""` | `howl.unload()` |

### Note on timeupdate

Howler.js does NOT fire a continuous `timeupdate` event like HTMLAudioElement. We need to:
- Use `requestAnimationFrame` to poll `howl.seek()` while playing
- OR use Howler's `on('play')` to start polling, `on('pause')`/`on('end')` to stop
- The `on('seek')` event fires when seek completes (for slider release)

### Props (unchanged)

```typescript
type ViewAudioBarProps = {
  shareToken: string
  sessionToken: string
  viewerId: string
  presentationId: string
  totalDurationMs?: number
}
```

### Audio URL (unchanged)

```typescript
const audioUrl = `/api/presentations/${presentationId}/audio/combined?session=${sessionToken}`
```

## Required Changes

### 1. ViewAudioBar.tsx — Full rewrite using Howler.js

- Remove `<audio>` JSX element
- Add `Howl` instance via useRef
- On mount: `new Howl({ src: [audioUrl], html5: true, preload: true, ...events })`
- On unmount: `howl.unload()`
- RAF polling loop for time updates while playing
- All control handlers use Howl API
- Keep all existing UI (shadcn Slider, Tooltips, etc.)
- Keep all tracking (opened on mount, completed on end, closed on tab close)
- Keep keyboard shortcuts

### 2. page.tsx — No changes needed (props interface is identical)

### 3. Combined audio endpoint — No changes needed

### 4. wav-utils.ts — No changes needed
