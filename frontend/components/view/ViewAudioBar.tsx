"use client"

import { useState, useEffect, useRef } from "react"
import { Howl } from "howler"
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Loader2 } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const
const PROGRESS_INTERVAL_MS = 30_000

export type SlideTiming = { slideNumber: number; startMs: number; endMs: number }

export type SeekToSlideFn = (slideNumber: number) => void

type ViewAudioBarProps = {
  shareToken: string
  sessionToken: string
  viewerId: string
  presentationId: string
  totalDurationMs?: number
  audioUrl?: string
  versionStatus?: "synced" | "outdated" | null
  onRefresh?: () => void
  slideTimings?: SlideTiming[]
  onSlideChange?: (slideNumber: number) => void
  firstWatch?: boolean
  seekToSlideRef?: React.MutableRefObject<SeekToSlideFn | null>
  onDurationReady?: (durationSec: number) => void
}

export function ViewAudioBar({
  shareToken, sessionToken, viewerId, presentationId, totalDurationMs, audioUrl,
  versionStatus, onRefresh, slideTimings = [], onSlideChange, firstWatch = false,
  seekToSlideRef, onDurationReady,
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
  const onSlideChangeRef = useRef(onSlideChange)
  onSlideChangeRef.current = onSlideChange
  const slideTimingsRef = useRef(slideTimings)
  slideTimingsRef.current = slideTimings
  const firstWatchRef = useRef(firstWatch)
  firstWatchRef.current = firstWatch

  // Detect which slide a given time (in seconds) falls in and notify if changed
  function detectSlide(secs: number) {
    const ms = secs * 1000
    let match = 0
    for (const t of slideTimingsRef.current) {
      if (ms >= t.startMs && ms < t.endMs) { match = t.slideNumber; break }
    }
    if (match && match !== lastSlideRef.current) {
      lastSlideRef.current = match
      onSlideChangeRef.current?.(match)
    }
  }

  // Expose seekToSlide for the parent via the ref object prop
  const seekToSlide: SeekToSlideFn = (slideNumber: number) => {
    const howl = howlRef.current
    if (!howl || howl.state() !== "loaded") return
    const timing = slideTimingsRef.current.find((t) => t.slideNumber === slideNumber)
    if (!timing) return
    const targetSec = timing.startMs / 1000
    // On first watch, clamp to max watched position
    const clamped = firstWatchRef.current ? Math.min(targetSec, maxWatchedRef.current) : targetSec
    howl.seek(clamped)
    setCurrentTime(clamped)
    currentTimeRef.current = clamped
    // Notify slide change immediately (don't wait for onseek — it may fire late)
    lastSlideRef.current = slideNumber
    onSlideChangeRef.current?.(slideNumber)
  }
  if (seekToSlideRef) seekToSlideRef.current = seekToSlide

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
        if (!cancelled && json.data?.audioUrl) setResolvedUrl(json.data.audioUrl)
      })
      .catch((err) => { console.error("[ViewAudioBar] Audio fetch failed:", err) })

    return () => { cancelled = true }
  }, [resolvedUrl, presentationId, sessionToken])

  // Howler initialization
  useEffect(() => {
    if (!resolvedUrl) return
    const howl = new Howl({
      src: [resolvedUrl],
      format: ["wav"],
      html5: true,
      preload: true,
      onload: () => {
        // Use howl.duration() as source of truth — the API-computed
        // total_duration_ms may be stale if combined.wav wasn't rebuilt yet.
        const d = Math.floor(howl.duration())
        setDuration(d)
        durationRef.current = d
        setReady(true)
        onDurationReady?.(d)
      },
      onloaderror: (_id: number, err: unknown) => {
        console.error("Howler load error:", err)
        setReady(true)
      },
      onplay: () => {
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
      },
      onseek: () => {
        const secs = Math.floor(howl.seek() as number)
        setCurrentTime(secs)
        currentTimeRef.current = secs
        // Backup slide detection — may fire late on some browsers
        detectSlide(secs)
      },
    })
    howlRef.current = howl

    // Fallback: show controls after 12s even if audio never loaded
    const fallbackTimer = setTimeout(() => setReady(true), 12000)

    return () => {
      clearTimeout(fallbackTimer)
      stopPolling()
      stopProgressInterval()
      howl.unload()
      howlRef.current = null
    }
  }, [resolvedUrl, totalDurationMs])

  // RAF polling (replaces onTimeUpdate) — also detects slide changes
  function startPolling() {
    function poll() {
      const howl = howlRef.current
      if (!howl || !howl.playing()) return
      if (!isSeeking.current) {
        const secs = Math.floor(howl.seek() as number)
        setCurrentTime(secs)
        currentTimeRef.current = secs
        // Track furthest position (for first-watch clamping)
        if (secs > maxWatchedRef.current) maxWatchedRef.current = secs
        // Detect slide change during playback
        detectSlide(secs)
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
  }, [])

  // Track "closed" on tab hide — uses sendBeacon (not fetch) so it survives page unload
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "hidden") {
        const total = durationRef.current || 1
        const current = currentTimeRef.current
        const pct = Math.min(100, Math.round((current / total) * 100))
        const body = JSON.stringify({
          session_token: sessionToken,
          event_type: "closed",
          progress_pct: pct,
          time_spent_seconds: current,
        })
        navigator.sendBeacon(`/api/view/${shareToken}/track`, body)
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [shareToken, sessionToken])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return
      switch (e.key) {
        case " ": e.preventDefault(); togglePlay(); break
        case "ArrowLeft": skipSeconds(-10); break
        case "ArrowRight": skipSeconds(10); break
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  })

  // ARIA live region
  useEffect(() => {
    if (liveRef.current) liveRef.current.textContent = playing ? "Playing" : "Paused"
  }, [playing])

  async function sendTracking(eventType: string, progressPct?: number, timeSpentSeconds?: number) {
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
      howl.play()
    }
  }

  function clampSeek(targetSec: number): number {
    if (!firstWatch) return Math.max(0, targetSec)
    // On first watch, can rewind anywhere but cannot skip ahead of furthest position
    return Math.min(Math.max(0, targetSec), maxWatchedRef.current)
  }

  function skipSeconds(offset: number) {
    const howl = howlRef.current
    if (!howl || howl.state() !== "loaded") return
    const cur = howl.seek() as number
    const dur = howl.duration() || 0
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
      <div className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center gap-1.5 px-4 py-2.5">
          {/* Skip back 10s */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Skip back 10 seconds" onClick={() => skipSeconds(-10)} disabled={!ready}
                className="touch-target-sm rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:opacity-30 disabled:pointer-events-none">
                <SkipBack className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Back 10s</TooltipContent>
          </Tooltip>

          {/* Play/Pause */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label={ready ? (playing ? "Pause" : "Play") : "Loading audio"} onClick={togglePlay}
                className="touch-target rounded-full bg-[#18181B] text-white transition-colors hover:bg-[#27272A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2">
                {!ready ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{playing ? "Pause" : "Play"}</TooltipContent>
          </Tooltip>

          {/* Skip forward 10s */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Skip forward 10 seconds" onClick={() => skipSeconds(10)} disabled={!ready}
                className="touch-target-sm rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:opacity-30 disabled:pointer-events-none">
                <SkipForward className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Forward 10s</TooltipContent>
          </Tooltip>

          {/* Progress slider */}
          <div className="flex flex-1 items-center gap-3">
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
                  <button type="button" onClick={onRefresh} className="underline decoration-dotted underline-offset-2 hover:decoration-solid leading-none">
                    Changes detected — Refresh
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
