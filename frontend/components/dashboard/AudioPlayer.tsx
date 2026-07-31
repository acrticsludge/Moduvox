"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Pause, Play, Loader2, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const
const audioBlobCache = new Map<string, Promise<string | null>>()

export function preloadAudioUrl(url: string): Promise<string | null> {
  const existing = audioBlobCache.get(url)
  if (existing) return existing
  const request = fetch(url)
    .then(async (response) => {
      if (!response.ok) return null
      const blob = await response.blob()
      return URL.createObjectURL(blob)
    })
    .catch(() => null)
  audioBlobCache.set(url, request)
  return request
}

export function preloadAudioUrls(urls: string[]) {
  urls.forEach((url) => { void preloadAudioUrl(url) })
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function AudioPlayer({
  audioUrl,
  presentationId,
  slideNumber,
  onEnded,
  onError,
  fullscreen,
  initialCurrentTime = 0,
  initialPlaying = false,
  onTimeUpdate: onTimeUpdateProp,
}: {
  audioUrl: string | null
  presentationId?: string
  slideNumber?: number | null
  onEnded?: () => void
  onError?: () => void
  fullscreen?: boolean
  initialCurrentTime?: number
  initialPlaying?: boolean
  onTimeUpdate?: (time: number, playing: boolean) => void
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState(false)
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  const initialSeekDone = useRef(false)

  // Speed, volume, elapsed/remaining state
  const [speed, setSpeed] = useState(1)
  const [volume, setVolume] = useState(100)
  const [muted, setMuted] = useState(false)
  const [showRemaining, setShowRemaining] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)

  // Build per-slide URL when slideNumber/presentationId are provided
  const resolvedUrl =
    audioUrl && presentationId && slideNumber != null
      ? `/api/presentations/${presentationId}/audio/slide/${slideNumber}`
      : audioUrl

  // Reset when resolvedUrl changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let active = true
    initialSeekDone.current = false
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setLoading(true)
    setError(false)
    setPlaybackUrl(null)

    if (!resolvedUrl) {
      setLoading(false)
      return () => { active = false }
    }

    preloadAudioUrl(resolvedUrl).then((cachedUrl) => {
      if (active) setPlaybackUrl(cachedUrl ?? resolvedUrl)
    })

    return () => { active = false }
  }, [resolvedUrl])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Apply speed to audio element
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed])

  // Apply volume to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume / 100
    }
  }, [volume, muted])

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      const t = audioRef.current.currentTime
      setCurrentTime(t)
      onTimeUpdateProp?.(t, playing)
    }
  }, [playing, onTimeUpdateProp])

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
      setLoading(false)
    }
  }, [])

  // Initial seek: when the audio is ready and an initial position was passed
  useEffect(() => {
    const el = audioRef.current
    if (!el || loading || duration === 0 || initialCurrentTime <= 0 || initialSeekDone.current) return
    initialSeekDone.current = true
    el.currentTime = initialCurrentTime
    setCurrentTime(initialCurrentTime)
    if (initialPlaying) {
      el.play().then(() => setPlaying(true)).catch(() => { /* autoplay blocked */ })
    }
  }, [loading, duration, initialCurrentTime, initialPlaying])

  const handleEnded = useCallback(() => {
    setPlaying(false)
    setCurrentTime(0)
    if (audioRef.current) audioRef.current.currentTime = 0
    onEnded?.()
  }, [onEnded])

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !resolvedUrl) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {})
    }
  }, [playing, resolvedUrl])

  const skipSeconds = useCallback((delta: number) => {
    if (!audioRef.current || !duration) return
    const next = Math.max(0, Math.min(duration, audioRef.current.currentTime + delta))
    audioRef.current.currentTime = next
    setCurrentTime(next)
  }, [duration])

  const handleSeek = useCallback((value: number[]) => {
    const t = value[0]
    if (audioRef.current) audioRef.current.currentTime = t
    setCurrentTime(t)
  }, [])

  const cycleSpeed = useCallback(() => {
    setSpeed((s) => {
      const idx = SPEEDS.indexOf(s as typeof SPEEDS[number])
      return idx >= 0 ? SPEEDS[(idx + 1) % SPEEDS.length] : 1
    })
  }, [])

  const toggleMute = useCallback(() => setMuted((m) => !m), [])

  const ready = !loading && !error && !!playbackUrl
  const timeLabel = (() => {
    if (showRemaining) {
      const rem = Math.max(0, duration - currentTime)
      return `-${formatTime(rem)} / ${formatTime(duration)}`
    }
    return `${formatTime(currentTime)} / ${formatTime(duration)}`
  })()

  if (!resolvedUrl) return null

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
        Failed to load audio. Try generating audio again.
      </div>
    )
  }

  // Dark wrapper in fullscreen mode; light border-card in normal mode
  const darkOverrides = "[&_[data-orientation='horizontal']]:bg-white/20 [&_[data-orientation='horizontal']>span]:bg-white [&_span.border-primary]:border-white [&_[class*='ring-offset-background']]:ring-offset-[#18181B]"

  const controls = (
    <div className={cn("mx-auto flex max-w-[1400px] flex-wrap items-center gap-1.5 px-3 py-2.5 sm:flex-nowrap sm:px-4", fullscreen && "text-white")}>
      {/* Skip back 10s */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label="Skip back 10 seconds" onClick={() => skipSeconds(-10)} disabled={!ready}
            className={cn(
              "touch-target-sm touch-manipulation shrink-0 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:opacity-30 disabled:pointer-events-none",
              fullscreen ? "text-white/50 hover:bg-white/10 hover:text-white" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            )}>
            <SkipBack className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Back 10s</TooltipContent>
      </Tooltip>

      {/* Play/Pause */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={togglePlay} disabled={!ready}
            className="touch-target touch-manipulation shrink-0 rounded-full bg-[#18181B] text-white transition-colors hover:bg-[#27272A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{playing ? "Pause" : "Play"}</TooltipContent>
      </Tooltip>

      {/* Skip forward 10s */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label="Skip forward 10 seconds" onClick={() => skipSeconds(10)} disabled={!ready}
            className={cn(
              "touch-target-sm touch-manipulation shrink-0 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:opacity-30 disabled:pointer-events-none",
              fullscreen ? "text-white/50 hover:bg-white/10 hover:text-white" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            )}>
            <SkipForward className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Forward 10s</TooltipContent>
      </Tooltip>

      {/* Progress slider */}
      <div className={cn(
        "order-last flex basis-full items-center gap-3 sm:order-none sm:min-w-0 sm:flex-1 sm:basis-auto",
        fullscreen && darkOverrides
      )}>
        <Slider
          value={[Math.min(currentTime, duration || 1)]}
          max={duration || 1}
          step={1}
          disabled={!ready}
          onValueChange={handleSeek}
          aria-label="Audio progress"
        />
        <button type="button" onClick={() => setShowRemaining((r) => !r)}
          aria-label={showRemaining ? "Elapsed time" : "Remaining time"}
          className={cn(
            "shrink-0 whitespace-nowrap text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 rounded px-1",
            fullscreen ? "text-white/60 hover:text-white" : "text-zinc-500 hover:text-zinc-700"
          )}>
          {timeLabel}
        </button>
      </div>

      {/* Speed */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label={`Playback speed. Current: ${speed}x`} onClick={cycleSpeed} disabled={!ready}
            className={cn(
              "touch-target-sm rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:opacity-30 disabled:pointer-events-none",
              fullscreen ? "text-white/60 hover:bg-white/10 hover:text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
            )}>
            {speed}x
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Speed</TooltipContent>
      </Tooltip>

      {/* Volume */}
      <div className="relative flex items-center gap-1"
        onMouseEnter={() => setShowVolumeSlider(true)}
        onMouseLeave={() => setShowVolumeSlider(false)}>
        <button type="button" aria-label={muted ? "Unmute" : "Mute"}
          onClick={() => { toggleMute(); setShowVolumeSlider(!showVolumeSlider); }} disabled={!ready}
          className={cn(
            "touch-target-sm shrink-0 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:opacity-30 disabled:pointer-events-none",
            fullscreen ? "text-white/50 hover:bg-white/10 hover:text-white" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          )}>
          {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        {showVolumeSlider && (
          <div className={cn("w-20", fullscreen && darkOverrides)}>
            <Slider value={[muted ? 0 : volume]} max={100} step={1} onValueChange={([v]) => setVolume(v)} aria-label="Volume" />
          </div>
        )}
      </div>
    </div>
  )

  return (
    <TooltipProvider delayDuration={300}>
      <div className={fullscreen ? "border-t border-white/10 bg-[#18181B]" : "rounded-xl border border-zinc-200 bg-white shadow-sm"}>
        {controls}
      </div>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={playbackUrl ?? undefined}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => { setLoading(false); setError(true); onError?.() }}
      />
    </TooltipProvider>
  )
}
