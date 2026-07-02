"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Loader2 } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const

type ViewAudioBarProps = {
  shareToken: string
  sessionToken: string
  viewerId: string
  presentationId: string
  totalDurationMs?: number
}

export function ViewAudioBar({ shareToken, sessionToken, viewerId, presentationId, totalDurationMs }: ViewAudioBarProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const liveRef = useRef<HTMLDivElement>(null)
  const isSeeking = useRef(false)
  const trackedOpened = useRef(false)

  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(totalDurationMs ? Math.floor(totalDurationMs / 1000) : 0)
  const [speedIndex, setSpeedIndex] = useState(1)
  const [volume, setVolume] = useState(80)
  const [muted, setMuted] = useState(false)
  const [showTimeRemaining, setShowTimeRemaining] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)

  const audioUrl = `/api/presentations/${presentationId}/audio/combined?session=${sessionToken}`

  // Native audio event handlers
  function onPlay() { setPlaying(true) }
  function onPause() { setPlaying(false) }
  function onTimeUpdate() {
    if (isSeeking.current) return
    const a = audioRef.current
    if (a) setCurrentTime(Math.floor(a.currentTime))
  }
  function onLoadedMeta() {
    const a = audioRef.current
    if (!a) return
    const d = totalDurationMs ? Math.floor(totalDurationMs / 1000) : Math.floor(a.duration)
    setDuration(d)
    setReady(true)
  }
  function onCanPlay() {
    setReady(true)
  }
  function onEnded() {
    setPlaying(false)
    sendTracking("completed", 100)
  }
  function onError() {
    console.error("Audio failed to load, falling back to controls")
    setReady(true) // Show controls even if audio fails
  }

  // Track "opened" once
  useEffect(() => {
    if (trackedOpened.current) return
    trackedOpened.current = true
    sendTracking("opened")
  }, [])

  // Track "closed" on tab close
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "hidden") {
        const body = JSON.stringify({ session_token: sessionToken, event_type: "closed" })
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

  async function sendTracking(eventType: string, progressPct?: number) {
    try {
      await fetch(`/api/view/${shareToken}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token: sessionToken, event_type: eventType, progress_pct: progressPct }),
      })
    } catch { /* fire-and-forget */ }
  }

  function togglePlay() {
    const a = audioRef.current
    if (!a) return
    if (a.paused) {
      a.play().catch(() => {})
    } else {
      a.pause()
    }
  }

  function skipSeconds(offset: number) {
    const a = audioRef.current
    if (!a) return
    const newTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + offset))
    a.currentTime = newTime
    setCurrentTime(Math.floor(newTime))
  }

  function handleSeekStart() { isSeeking.current = true }
  function handleSeek(value: number[]) { setCurrentTime(value[0]) }
  function handleSeekEnd(value: number[]) {
    const a = audioRef.current
    if (!a) return
    a.currentTime = value[0]
    setCurrentTime(value[0])
    isSeeking.current = false
  }

  function cycleSpeed() {
    const a = audioRef.current
    if (!a) return
    const nextIndex = (speedIndex + 1) % SPEEDS.length
    setSpeedIndex(nextIndex)
    a.playbackRate = SPEEDS[nextIndex]
  }

  function handleVolume(value: number[]) {
    const a = audioRef.current
    if (!a) return
    setVolume(value[0])
    a.volume = value[0] / 100
    a.muted = false
    setMuted(false)
  }

  function toggleMute() {
    const a = audioRef.current
    if (!a) return
    a.muted = !a.muted
    setMuted(a.muted)
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

  if (!ready) {
    return (
      <div className="flex items-center justify-center gap-2 border-t border-zinc-200 bg-white px-4 py-3">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
        <span className="text-xs text-zinc-400">Preparing audio…</span>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="border-t border-zinc-200 bg-white">
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          onPlay={onPlay}
          onPause={onPause}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMeta}
          onCanPlay={onCanPlay}
          onEnded={onEnded}
          onError={onError}
        />

        <div className="mx-auto flex max-w-[1400px] items-center gap-1.5 px-4 py-2.5">
          {/* Skip back 10s */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Skip back 10 seconds" onClick={() => skipSeconds(-10)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300">
                <SkipBack className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Back 10s</TooltipContent>
          </Tooltip>

          {/* Play/Pause */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={togglePlay}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#18181B] text-white transition-colors hover:bg-[#27272A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2">
                {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{playing ? "Pause" : "Play"}</TooltipContent>
          </Tooltip>

          {/* Skip forward 10s */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Skip forward 10 seconds" onClick={() => skipSeconds(10)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300">
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
              onFocus={handleSeekStart}
              onBlur={() => { isSeeking.current = false }}
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
              <button type="button" aria-label={`Playback speed. Current: ${currentSpeed}x`} onClick={cycleSpeed}
                className="flex h-7 items-center rounded-md px-2 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300">
                {currentSpeed}x
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Speed</TooltipContent>
          </Tooltip>

          {/* Volume */}
          <div className="relative flex items-center gap-1"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}>
            <button type="button" aria-label={muted ? "Unmute" : "Mute"} onClick={toggleMute}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300">
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            {showVolumeSlider && (
              <div className="w-20">
                <Slider value={[muted ? 0 : volume]} max={100} step={1} onValueChange={handleVolume} aria-label="Volume" />
              </div>
            )}
          </div>
        </div>

        {/* ARIA live region */}
        <div ref={liveRef} role="status" aria-live="polite" aria-atomic="true" className="sr-only" />
      </div>
    </TooltipProvider>
  )
}
