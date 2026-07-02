"use client"

import { useState, useEffect, useRef } from "react"
import { Howl } from "howler"
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
  const howlRef = useRef<Howl | null>(null)
  const liveRef = useRef<HTMLDivElement>(null)
  const isSeeking = useRef(false)
  const trackedOpened = useRef(false)
  const rafRef = useRef<number>(0)

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

  // Howler initialization
  useEffect(() => {
    const howl = new Howl({
      src: [audioUrl],
      html5: true,
      preload: true,
      onload: () => {
        const d = totalDurationMs ? Math.floor(totalDurationMs / 1000) : Math.floor(howl.duration())
        setDuration(d)
        setReady(true)
      },
      onloaderror: (_id: number, err: unknown) => {
        console.error("Howler load error:", err)
        setReady(true)
      },
      onplay: () => {
        setPlaying(true)
        startPolling()
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

  // RAF polling (replaces onTimeUpdate)
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
    const cur = howl.seek() as number
    const dur = howl.duration() || 0
    const newTime = Math.max(0, Math.min(dur, cur + offset))
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
              onFocus={() => { isSeeking.current = true }}
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
