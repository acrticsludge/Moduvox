"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const

type ViewAudioBarProps = {
  shareToken: string
  sessionToken: string
  viewerId: string
  presentationId: string
}

export function ViewAudioBar({ shareToken, sessionToken, viewerId, presentationId }: ViewAudioBarProps) {
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speedIndex, setSpeedIndex] = useState(1)
  const [volume, setVolume] = useState(80)
  const [muted, setMuted] = useState(false)
  const [showTimeRemaining, setShowTimeRemaining] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const liveRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const audioUrl = `/api/presentations/${presentationId}/audio/combined?session=${sessionToken}`

  useEffect(() => {
    const audio = new Audio(audioUrl)
    audio.preload = "auto"
    audioRef.current = audio

    const onTimeUpdate = () => setCurrentTime(Math.floor(audio.currentTime))
    const onLoadedMeta = () => setDuration(Math.floor(audio.duration))
    const onEnded = () => { setPlaying(false); sendTracking("completed", 100) }

    audio.addEventListener("timeupdate", onTimeUpdate)
    audio.addEventListener("loadedmetadata", onLoadedMeta)
    audio.addEventListener("ended", onEnded)

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate)
      audio.removeEventListener("loadedmetadata", onLoadedMeta)
      audio.removeEventListener("ended", onEnded)
      audio.pause()
      audio.src = ""
    }
  }, [audioUrl])

  useEffect(() => {
    sendTracking("opened")
  }, [])

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

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return
      switch (e.key) {
        case " ":
          e.preventDefault()
          togglePlay()
          break
        case "ArrowLeft":
          skipBack(10)
          break
        case "ArrowRight":
          skipForward(10)
          break
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [playing])

  useEffect(() => {
    if (liveRef.current) {
      liveRef.current.textContent = playing ? "Playing" : "Paused"
    }
  }, [playing])

  async function sendTracking(eventType: string, progressPct?: number) {
    try {
      await fetch(`/api/view/${shareToken}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_token: sessionToken,
          event_type: eventType,
          progress_pct: progressPct,
        }),
      })
    } catch { /* fire-and-forget */ }
  }

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
    setPlaying(!playing)
  }

  function skipBack(seconds = 10) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, audio.currentTime - seconds)
  }

  function skipForward(seconds = 10) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + seconds)
  }

  function handleSeek(value: number[]) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value[0]
  }

  function cycleSpeed() {
    const audio = audioRef.current
    if (!audio) return
    const nextIndex = (speedIndex + 1) % SPEEDS.length
    setSpeedIndex(nextIndex)
    audio.playbackRate = SPEEDS[nextIndex]
  }

  function handleVolumeChange(value: number[]) {
    const audio = audioRef.current
    if (!audio) return
    setVolume(value[0])
    audio.volume = value[0] / 100
    audio.muted = false
    setMuted(false)
  }

  function toggleMute() {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !audio.muted
    setMuted(audio.muted)
  }

  function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return "0:00"
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const displayTime = showTimeRemaining
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
              <button
                type="button"
                aria-label="Skip back 10 seconds"
                onClick={() => skipBack(10)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
              >
                <SkipBack className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Back 10s</TooltipContent>
          </Tooltip>

          {/* Play/Pause */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={playing ? "Pause" : "Play"}
                onClick={togglePlay}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#18181B] text-white transition-colors hover:bg-[#27272A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{playing ? "Pause" : "Play"}</TooltipContent>
          </Tooltip>

          {/* Skip forward 10s */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Skip forward 10 seconds"
                onClick={() => skipForward(10)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Forward 10s</TooltipContent>
          </Tooltip>

          {/* Progress slider */}
          <div className="flex flex-1 items-center gap-3">
            <Slider
              value={[currentTime]}
              max={duration || 1}
              step={1}
              onValueChange={handleSeek}
              aria-label="Presentation progress"
              className="cursor-pointer"
            />
            {/* Time display */}
            <button
              type="button"
              onClick={() => setShowTimeRemaining((r) => !r)}
              aria-label={showTimeRemaining ? "Elapsed time" : "Remaining time"}
              className="shrink-0 whitespace-nowrap text-xs font-medium tabular-nums text-zinc-500 transition-colors hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 rounded px-1"
            >
              {displayTime}
            </button>
          </div>

          {/* Playback speed */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`Playback speed. Current: ${currentSpeed}x`}
                onClick={cycleSpeed}
                className="flex h-7 items-center rounded-md px-2 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
              >
                {currentSpeed}x
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Speed</TooltipContent>
          </Tooltip>

          {/* Volume */}
          <div
            className="relative flex items-center gap-1"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              type="button"
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={toggleMute}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
            >
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            {showVolumeSlider && (
              <div className="w-20">
                <Slider
                  value={[muted ? 0 : volume]}
                  max={100}
                  step={1}
                  onValueChange={handleVolumeChange}
                  aria-label="Volume"
                />
              </div>
            )}
          </div>
        </div>

        {/* ARIA live region */}
        <div
          ref={liveRef}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />
      </div>
    </TooltipProvider>
  )
}
