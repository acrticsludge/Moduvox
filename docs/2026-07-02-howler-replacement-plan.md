# Howler.js Replacement — Plan

**Goal:** Replace HTMLAudioElement with Howler.js in ViewAudioBar.

**Files:**
- Rewrite: `frontend/components/view/ViewAudioBar.tsx`
- No changes: any other files

---

### Task 1: Rewrite ViewAudioBar with Howler.js

Rewrite the entire component. Keep the same props, same UI, same tracking. Replace only the audio engine.

**Howl initialization:**
```typescript
const howlRef = useRef<Howl | null>(null)

useEffect(() => {
  const howl = new Howl({
    src: [audioUrl],
    html5: true,
    preload: true,
    onload: () => {
      setDuration(totalDurationMs ? Math.floor(totalDurationMs / 1000) : Math.floor(howl.duration()))
      setReady(true)
    },
    onloaderror: (_id: number, errCode: number) => {
      console.error("Howler load error:", errCode)
      setReady(true) // Show controls even if load fails
    },
    onplay: () => {
      setPlaying(true)
      startPolling() // Start RAF loop for time sync
    },
    onpause: () => {
      setPlaying(false)
      stopPolling()
    },
    onend: () => {
      setPlaying(false)
      stopPolling()
      sendTracking("completed", 100)
    },
    onseek: () => {
      // Update display time when seek completes
      setCurrentTime(Math.floor(howl.seek() as number))
    },
  })
  howlRef.current = howl

  return () => {
    stopPolling()
    howl.unload()
    howlRef.current = null
  }
}, [audioUrl, totalDurationMs])
```

**RAF polling for time updates:**
```typescript
const rafRef = useRef<number>(0)

function startPolling() {
  function poll() {
    const howl = howlRef.current
    if (!howl || !howl.playing()) return
    if (!isSeeking.current) {
      setCurrentTime(Math.floor(howl.seek() as number))
    }
    rafRef.current = requestAnimationFrame(poll)
  }
  rafRef.current = requestAnimationFrame(poll)
}

function stopPolling() {
  cancelAnimationFrame(rafRef.current)
}
```

**Control handlers:**
```typescript
function togglePlay() {
  const howl = howlRef.current
  if (!howl) return
  if (howl.playing()) {
    howl.pause()
  } else {
    howl.play()
  }
}

function skipSeconds(offset: number) {
  const howl = howlRef.current
  if (!howl) return
  const newTime = Math.max(0, Math.min(howl.duration() || 0, (howl.seek() as number) + offset))
  howl.seek(newTime)
  setCurrentTime(Math.floor(newTime))
}

function handleSeek(value: number[]) { setCurrentTime(value[0]) }
function handleSeekEnd(value: number[]) {
  const howl = howlRef.current
  if (!howl) return
  howl.seek(value[0])
  setCurrentTime(value[0])
  isSeeking.current = false
}

function cycleSpeed() {
  const howl = howlRef.current
  if (!howl) return
  const nextIndex = (speedIndex + 1) % SPEEDS.length
  setSpeedIndex(nextIndex)
  howl.rate(SPEEDS[nextIndex])
}

function handleVolume(value: number[]) {
  const howl = howlRef.current
  if (!howl) return
  setVolume(value[0])
  howl.volume(value[0] / 100)
  howl.mute(false)
  setMuted(false)
}

function toggleMute() {
  const howl = howlRef.current
  if (!howl) return
  howl.mute(!howl.mute())
  setMuted(howl.mute())
}
```

**Remove:**
- `<audio>` JSX element
- All native audio event handlers (onPlay, onPause, onTimeUpdate, etc.)

**Keep unchanged:**
- All state declarations
- All UI (Tooltips, Sliders, buttons, layout)
- Tracking (sendTracking, visibilitychange for "closed", mount for "opened")
- Keyboard shortcuts (with Howl version of skipSeconds, togglePlay)
- Loading state
- FormatTime function

**Implementation checklist:**

- [ ] Write complete new file with Howler.js
- [ ] Run `npx tsc --noEmit` from `frontend/`
- [ ] Fix any TypeScript errors
- [ ] Exit code must be 0
