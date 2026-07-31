"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Pause, Play, Loader2 } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

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

  const handleSeek = useCallback((value: number[]) => {
    const t = value[0]
    if (audioRef.current) audioRef.current.currentTime = t
    setCurrentTime(t)
  }, [])

  const ready = !loading && !error && !!playbackUrl

  if (!resolvedUrl) return null

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
        Failed to load audio. Try generating audio again.
      </div>
    )
  }

  return (
    <>
      <div className={fullscreen ? "border-t border-white/10 bg-[#18181B]" : "rounded-xl border border-zinc-200 bg-white shadow-sm"}>
        <div className={cn("mx-auto flex max-w-[1400px] items-center gap-3 px-3 py-2.5 sm:px-4", fullscreen && "text-white")}>
          {/* Play/Pause */}
          <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={togglePlay} disabled={!ready}
            className="touch-target shrink-0 rounded-full bg-[#18181B] text-white transition-colors hover:bg-[#27272A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          </button>

          {/* Time label */}
          <span className={cn("shrink-0 whitespace-nowrap text-xs font-medium tabular-nums", fullscreen ? "text-white/60" : "text-zinc-500")}>
            {formatTime(currentTime)}
          </span>

          {/* Progress slider */}
          <div className="min-w-0 flex-1">
            <Slider
              value={[Math.min(currentTime, duration || 1)]}
              max={duration || 1}
              step={1}
              disabled={!ready}
              onValueChange={handleSeek}
              aria-label="Audio progress"
              className={fullscreen ? "[&_[data-orientation='horizontal']]:bg-white/20 [&_[data-orientation='horizontal']>span]:bg-white" : undefined}
            />
          </div>

          {/* Duration label */}
          <span className={cn("shrink-0 whitespace-nowrap text-xs font-medium tabular-nums", fullscreen ? "text-white/60" : "text-zinc-500")}>
            {formatTime(duration)}
          </span>
        </div>
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
    </>
  )
}
