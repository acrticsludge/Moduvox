"use client"

import { useState, useEffect, useRef } from "react"
import { Howl } from "howler"
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Loader2 } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const
const PROGRESS_INTERVAL_MS = 30_000

export type SlideTiming = { slideNumber: number; startMs: number; endMs: number }

export type SeekToSlideFn = (slideNumber: number, force?: boolean) => void

type ViewAudioBarProps = {
  shareToken: string
  sessionToken: string
  viewerId: string
  presentationId: string
  slideCount?: number
  totalDurationMs?: number
  audioUrl?: string
  versionStatus?: "synced" | "outdated" | null
  onRefresh?: () => void
  refreshing?: boolean
  slideTimings?: SlideTiming[]
  onSlideChange?: (slideNumber: number) => void
  firstWatch?: boolean
  seekToSlideRef?: React.MutableRefObject<SeekToSlideFn | null>
  onDurationReady?: (durationSec: number) => void
  trackingEnabled?: boolean
  fullscreen?: boolean
}

export function ViewAudioBar({
  shareToken, sessionToken, presentationId, slideCount = 0, totalDurationMs, audioUrl,
  versionStatus, onRefresh, slideTimings = [], onSlideChange,
  seekToSlideRef, onDurationReady, refreshing = false, trackingEnabled = true,
  fullscreen = false,
}: ViewAudioBarProps) {
  const howlRef = useRef<Howl | null>(null)
  const liveRef = useRef<HTMLDivElement>(null)
  const isSeeking = useRef(false)
  const trackedOpened = useRef(false)
  const rafRef = useRef<number>(0)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentTimeRef = useRef(0)
  const durationRef = useRef(0)
  const maxWatchedRef = useRef(0)
  const lastSlideRef = useRef(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const onSlideChangeRef = useRef(onSlideChange)
  const slideTimingsRef = useRef(slideTimings)
  const slideCountRef = useRef(slideCount)
  const sessionTokenRef = useRef(sessionToken)
  const trackingEnabledRef = useRef(trackingEnabled)
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const togglePlayRef = useRef(togglePlay)
  const skipSecondsRef = useRef(skipSeconds)

  useEffect(() => {
    onSlideChangeRef.current = onSlideChange
    slideTimingsRef.current = slideTimings
    slideCountRef.current = slideCount
    sessionTokenRef.current = sessionToken
    trackingEnabledRef.current = trackingEnabled
    togglePlayRef.current = togglePlay
    skipSecondsRef.current = skipSeconds
  // The keyboard handlers use refs so they do not get rebound on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSlideChange, slideTimings, slideCount, sessionToken, trackingEnabled])

  /** Convert a time in seconds to the slide number it falls within. */
  function timeToSlide(secs: number): number {
    const ms = secs * 1000

    // Primary: use precise per-slide timings from WAV durations
    const timings = slideTimingsRef.current
    if (timings.length > 0) {
      for (const t of timings) {
        if (ms >= t.startMs && ms < t.endMs) return t.slideNumber
      }
      // Past the very end — show last slide
      const last = timings[timings.length - 1]
      if (ms >= last.endMs) return last.slideNumber
    }

    // Fallback: evenly distribute slides when timing data unavailable
    const durationMs = durationRef.current * 1000 || 0
    const count = slideCountRef.current || timings.length
    if (durationMs > 0 && count > 0) {
      const slideDurationMs = durationMs / count
      const slideIndex = Math.floor(ms / slideDurationMs)
      return Math.min(slideIndex + 1, count)
    }

    return 0
  }

  // Detect which slide a given time (in seconds) falls in and notify if changed
  function detectSlide(secs: number) {
    const match = timeToSlide(secs)
    if (match && match !== lastSlideRef.current) {
      lastSlideRef.current = match
      onSlideChangeRef.current?.(match)
    }
  }

  /** Get the start time (in seconds) for a given slide number. */
  function getSlideStartSec(slideNumber: number): number | null {
    // Primary: use precise per-slide timings
    const timings = slideTimingsRef.current
    const timing = timings.find((t) => t.slideNumber === slideNumber)
    if (timing) return timing.startMs / 1000

    // Fallback: estimate from even distribution
    const durationMs = durationRef.current * 1000 || 0
    const count = slideCountRef.current || timings.length
    if (durationMs > 0 && count > 0 && slideNumber >= 1 && slideNumber <= count) {
      return ((slideNumber - 1) * (durationMs / count)) / 1000
    }

    return null
  }

  // Expose seekToSlide for the parent via the ref object prop
  const seekToSlide: SeekToSlideFn = (slideNumber: number) => {
    const howl = howlRef.current
    if (!howl || howl.state() !== "loaded") return
    const targetSec = getSlideStartSec(slideNumber)
    if (targetSec === null) return
    maxWatchedRef.current = Math.max(maxWatchedRef.current, targetSec)
    howl.seek(targetSec)
    setCurrentTime(targetSec)
    currentTimeRef.current = targetSec
    // Notify slide change immediately (don't wait for onseek — it may fire late)
    lastSlideRef.current = slideNumber
    onSlideChangeRef.current?.(slideNumber)
  }
  useEffect(() => {
    if (seekToSlideRef) seekToSlideRef.current = seekToSlide
    return () => {
      if (seekToSlideRef) seekToSlideRef.current = null
    }
  // seekToSlide closes over refs and is intentionally refreshed through this ref.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekToSlideRef])

  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(totalDurationMs ? Math.floor(totalDurationMs / 1000) : 0)
  const [speedIndex, setSpeedIndex] = useState(1)
  const [volume, setVolume] = useState(80)
  const [muted, setMuted] = useState(false)
  const [showTimeRemaining, setShowTimeRemaining] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(audioUrl)
  const [audioPreload, setAudioPreload] = useState<{
    sourceUrl: string | undefined
    blobUrl: string | null
  }>({ sourceUrl: undefined, blobUrl: null })
  const [starting, setStarting] = useState(false)

  // If audioUrl wasn't provided (combined.wav doesn't exist yet), call ensure endpoint
  useEffect(() => {
    if (resolvedUrl) return
    if (!presentationId) return // no presentation to fetch audio for

    let cancelled = false
    fetch(`/api/presentations/${presentationId}/audio/ensure?session=${sessionToken}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Ensure returned ${r.status}`)
        const text = await r.text()
        let json: unknown
        try { json = JSON.parse(text) } catch { throw new Error("Ensure returned non-JSON") }
        return json as { data?: { audioUrl?: string } }
      })
      .then((json) => {
        if (!cancelled) {
          if (json.data?.audioUrl) {
            setResolvedUrl(json.data.audioUrl)
          } else {
            setLoadError("Audio is not available yet — it may still be generating.")
          }
        }
      })
      .catch((err) => {
        console.error("[ViewAudioBar] Audio fetch failed:", err)
        setLoadError("Failed to load audio. Try refreshing.")
      })

    return () => { cancelled = true }
  }, [resolvedUrl, presentationId, sessionToken])

  // Download the combined audio once and let Howler consume the local blob.
  // This avoids a second network request when playback is first started.
  useEffect(() => {
    if (!resolvedUrl) return
    let cancelled = false
    let objectUrl: string | null = null
    fetch(resolvedUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Audio returned ${response.status}`)
        return response.blob()
      })
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setAudioPreload({ sourceUrl: resolvedUrl, blobUrl: objectUrl })
      })
      .catch(() => {
        if (!cancelled) setAudioPreload({ sourceUrl: resolvedUrl, blobUrl: null })
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [resolvedUrl])

  // Howler initialization
  useEffect(() => {
    if (!resolvedUrl || audioPreload.sourceUrl !== resolvedUrl) return
    const sourceUrl = audioPreload.blobUrl || resolvedUrl
    const howl = new Howl({
      src: [sourceUrl],
      format: ["wav"],
      html5: true,
      preload: true,
      onload: () => {
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current)
          fallbackTimerRef.current = null
        }
        const d = Math.floor(howl.duration())
        setDuration(d)
        durationRef.current = d
        setReady(true)
        setLoadError(null)
        onDurationReady?.(d)
      },
      onloaderror: (_id: number, err: unknown) => {
        console.error("Howler load error:", err)
        const msg = (err as { message?: string })?.message || ""
        if (msg.includes("404") || msg.includes("not found")) {
          setLoadError("Audio not available yet — it may still be generating.")
        } else if (msg.includes("format") || msg.includes("codec")) {
          setLoadError("Audio format not supported by your browser.")
        } else {
          setLoadError("Failed to load audio. Try refreshing.")
        }
      },
      onplay: () => {
        setStarting(false)
        setPlaying(true)
        startPolling()
        startProgressInterval()
      },
      onpause: () => {
        setPlaying(false)
        stopPolling()
        stopProgressInterval()
      },
      onend: () => {
        setPlaying(false)
        stopPolling()
        stopProgressInterval()
        const secs = Math.round(currentTimeRef.current)
        sendTracking("completed", 100, secs)
        const lastSlide = slideCountRef.current
        if (lastSlide > 0 && lastSlideRef.current !== lastSlide) {
          lastSlideRef.current = lastSlide
          onSlideChangeRef.current?.(lastSlide)
        }
      },
      onseek: () => {
        // HTML5 audio quirk: onseek may fire with a stale position.
        // Only update if the returned position is AT or AHEAD of the current ref
        // to prevent the stale value from overwriting the correct seek target.
        const secs = Math.floor(howl.seek() as number)
        if (secs >= currentTimeRef.current) {
          setCurrentTime(secs)
          currentTimeRef.current = secs
        }
      },
    })
    howlRef.current = howl

    // Fallback: show controls after 12s even if audio never loaded
    fallbackTimerRef.current = setTimeout(() => {
      if (!howlRef.current || howlRef.current.state() !== "loaded") {
        setLoadError("Audio took too long to load. Try refreshing.")
      }
      setReady(true)
    }, 12000)

    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current)
        fallbackTimerRef.current = null
      }
      stopPolling()
      stopProgressInterval()
      howl.unload()
      howlRef.current = null
    }
  // These callbacks intentionally use the current Howler instance and refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedUrl, audioPreload, totalDurationMs])

  // RAF polling (replaces onTimeUpdate) — also detects slide changes
  function startPolling() {
    function poll() {
      const howl = howlRef.current
      if (!howl || !howl.playing()) return
      if (!isSeeking.current) {
        const preciseSecs = Number(howl.seek() as number) || 0
        const secs = Math.floor(preciseSecs)
        setCurrentTime(secs)
        currentTimeRef.current = preciseSecs
        // Track furthest position (for first-watch clamping)
        if (secs > maxWatchedRef.current) maxWatchedRef.current = secs
        // Detect slide change during playback
        detectSlide(preciseSecs)
      }
      rafRef.current = requestAnimationFrame(poll)
    }
    rafRef.current = requestAnimationFrame(poll)
  }

  function stopPolling() {
    cancelAnimationFrame(rafRef.current)
  }

  function startProgressInterval() {
    stopProgressInterval()
    progressIntervalRef.current = setInterval(() => {
      const total = durationRef.current || 1
      const current = currentTimeRef.current
      const pct = Math.min(100, Math.round((current / total) * 100))
      sendTracking("progress", pct, Math.round(current))
    }, PROGRESS_INTERVAL_MS)
  }

  function stopProgressInterval() {
    if (progressIntervalRef.current !== null) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }

  // Track "opened" once
  useEffect(() => {
    if (trackedOpened.current) return
    trackedOpened.current = true
    sendTracking("opened", 0, 0)
  // Tracking is intentionally fire-once; it must not repeat when callback identities change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Track "closed" on tab hide — uses sendBeacon (not fetch) so it survives page unload
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "hidden" && trackingEnabledRef.current) {
        const total = durationRef.current || 1
        const current = currentTimeRef.current
        const pct = Math.min(100, Math.round((current / total) * 100))
        const body = JSON.stringify({
          session_token: sessionTokenRef.current,
          event_type: "closed",
          progress_pct: pct,
          time_spent_seconds: current,
        })
        navigator.sendBeacon(`/api/view/${shareToken}/track`, body)
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [shareToken])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return
      switch (e.key) {
        case " ": e.preventDefault(); togglePlayRef.current(); break
        case "ArrowLeft": skipSecondsRef.current(-10); break
        case "ArrowRight": skipSecondsRef.current(10); break
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [])

  // ARIA live region
  useEffect(() => {
    if (liveRef.current) liveRef.current.textContent = playing ? "Playing" : "Paused"
  }, [playing])

  async function sendTracking(eventType: string, progressPct?: number, timeSpentSeconds?: number) {
    if (!trackingEnabled) return
    try {
      await fetch(`/api/view/${shareToken}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_token: sessionToken,
          event_type: eventType,
          progress_pct: progressPct,
          time_spent_seconds: timeSpentSeconds,
        }),
      })
    } catch (err) { console.error("[ViewAudioBar] Tracking failed:", err) }
  }

  function togglePlay() {
    const howl = howlRef.current
    if (!howl || howl.state() !== "loaded") return
    if (howl.playing()) {
      howl.pause()
    } else {
      setStarting(true)
      howl.play()
    }
  }

  function clampSeek(targetSec: number): number {
    const max = durationRef.current
    if (max > 0) return Math.min(Math.max(0, targetSec), max)
    return Math.max(0, targetSec)
  }

  function skipSeconds(offset: number) {
    const howl = howlRef.current
    if (!howl || howl.state() !== "loaded") return
    const cur = howl.seek() as number
    const newTime = clampSeek(cur + offset)
    howl.seek(newTime)
    setCurrentTime(Math.floor(newTime))
    currentTimeRef.current = Math.floor(newTime)
    detectSlide(Math.floor(newTime))
  }

  function handleSeek(value: number[]) {
    isSeeking.current = true
    setCurrentTime(value[0])
  }
  function handleSeekEnd(value: number[]) {
    const howl = howlRef.current
    if (!howl || howl.state() !== "loaded") return
    const clamped = clampSeek(value[0])
    howl.seek(clamped)
    setCurrentTime(clamped)
    currentTimeRef.current = clamped
    isSeeking.current = false
    detectSlide(clamped)
  }

  function cycleSpeed() {
    const howl = howlRef.current
    if (!howl || howl.state() !== "loaded") return
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

  function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return "0:00"
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const timeLabel = showTimeRemaining
    ? `-${formatTime(duration - currentTime)} / ${formatTime(duration)}`
    : `${formatTime(currentTime)} / ${formatTime(duration)}`
  const currentSpeed = SPEEDS[speedIndex]

  return (
    <TooltipProvider delayDuration={300}>
      <div className={fullscreen ? "border-t border-white/10 bg-[#18181B] text-white" : "border-t border-zinc-200 bg-white"}>
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-1.5 px-3 py-2.5 sm:flex-nowrap sm:px-4">
          {/* Skip back 10s */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Skip back 10 seconds" onClick={() => skipSeconds(-10)} disabled={!ready}
                className="touch-target-sm touch-manipulation shrink-0 rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:opacity-30 disabled:pointer-events-none">
                <SkipBack className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Back 10s</TooltipContent>
          </Tooltip>

          {/* Play/Pause */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label={loadError ? "Audio error" : starting ? "Starting audio" : ready ? (playing ? "Pause" : "Play") : "Loading audio"} onClick={togglePlay} disabled={!!loadError}
                className="touch-target touch-manipulation shrink-0 rounded-full bg-[#18181B] text-white transition-colors hover:bg-[#27272A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : loadError ? <Play className="ml-0.5 h-4 w-4" /> : !ready ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{playing ? "Pause" : "Play"}</TooltipContent>
          </Tooltip>

          {/* Skip forward 10s */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Skip forward 10 seconds" onClick={() => skipSeconds(10)} disabled={!ready}
                className="touch-target-sm touch-manipulation shrink-0 rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:opacity-30 disabled:pointer-events-none">
                <SkipForward className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Forward 10s</TooltipContent>
          </Tooltip>

          {/* Progress slider */}
          <div className="order-last flex basis-full items-center gap-3 sm:order-none sm:min-w-0 sm:flex-1 sm:basis-auto">
            <Slider
              value={[Math.min(currentTime, duration || 1)]}
              max={duration || 1}
              step={1}
              disabled={!ready}
              onValueChange={handleSeek}
              onValueCommit={handleSeekEnd}
              aria-label="Presentation progress"
            />
            {/* Time display */}
              <button type="button" onClick={() => setShowTimeRemaining((r) => !r)}
              aria-label={showTimeRemaining ? "Elapsed time" : "Remaining time"}
              className="shrink-0 whitespace-nowrap text-xs font-medium tabular-nums text-zinc-500 transition-colors hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 rounded px-1">
              {timeLabel}
            </button>
          </div>

          {/* Playback speed */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label={`Playback speed. Current: ${currentSpeed}x`} onClick={cycleSpeed} disabled={!ready}
                className="touch-target-sm rounded-md px-2 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:opacity-30 disabled:pointer-events-none">
                {currentSpeed}x
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Speed</TooltipContent>
          </Tooltip>

          {/* Volume */}
          <div className="relative flex items-center gap-1"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}>
            <button type="button" aria-label={muted ? "Unmute" : "Mute"} onClick={() => { toggleMute(); setShowVolumeSlider(!showVolumeSlider); }} disabled={!ready}
              className="touch-target-sm shrink-0 rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:opacity-30 disabled:pointer-events-none">
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            {showVolumeSlider && (
              <div className="w-20">
                <Slider value={[muted ? 0 : volume]} max={100} step={1} onValueChange={handleVolume} aria-label="Volume" />
              </div>
            )}
          </div>

          {/* Version status badge — inline in the audio bar, vertically centered */}
          {versionStatus && (
            <div className="ml-auto flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-none"
              style={versionStatus === "synced"
                ? { borderColor: "#bbf7d0", backgroundColor: "#f0fdf4", color: "#166534" }
                : { borderColor: "#fde68a", backgroundColor: "#fffbeb", color: "#92400e" }}
            >
              {versionStatus === "synced" ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Up to date</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                  <button type="button" onClick={onRefresh} disabled={refreshing} className="underline decoration-dotted underline-offset-2 hover:decoration-solid leading-none disabled:opacity-50 disabled:cursor-not-allowed">
                    {refreshing ? "Refreshing..." : "Changes detected — Refresh"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Audio load error */}
          {loadError && (
            <div className="ml-auto flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] text-red-700 leading-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{loadError}</span>
              {onRefresh && (
                <>
                  <span className="text-red-300">·</span>
                  <button type="button" onClick={onRefresh} className="underline decoration-dotted underline-offset-2 hover:decoration-solid">
                    Retry
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ARIA live region */}
        <div ref={liveRef} role="status" aria-live="polite" aria-atomic="true" className="sr-only" />
      </div>
    </TooltipProvider>
  )
}
