"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Pause, Play, Loader2 } from "lucide-react"

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
}: {
  audioUrl: string | null
  presentationId?: string
  slideNumber?: number | null
  onEnded?: () => void
  onError?: () => void
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [seeking, setSeeking] = useState(false)
  const [error, setError] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)

  // Build per-slide URL when slideNumber/presentationId are provided
  const resolvedUrl =
    audioUrl && presentationId && slideNumber != null
      ? `/api/presentations/${presentationId}/audio/slide/${slideNumber}`
      : audioUrl

  // Reset when resolvedUrl changes
  useEffect(() => {
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setLoading(true)
    setError(false)
  }, [resolvedUrl])

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current && !seeking) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }, [seeking])

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
      setLoading(false)
    }
  }, [])

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
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {
        // Browser blocked autoplay or network error — keep playing=false
      })
    }
  }, [playing, resolvedUrl])

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!progressRef.current || !audioRef.current || !duration) return
    const rect = progressRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audioRef.current.currentTime = ratio * duration
    setCurrentTime(ratio * duration)
  }

  if (!resolvedUrl) return null

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
        Failed to load audio. Try generating audio again.
      </div>
    )
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
      {/* Play/Pause */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={loading}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#18181B] text-white transition-colors hover:bg-[#27272A] disabled:opacity-50"
        aria-label={playing ? "Pause" : "Play"}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : playing ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </button>

      {/* Time / Seek bar */}
      <div className="flex flex-1 items-center gap-2">
        <span className="w-8 text-right text-[11px] tabular-nums text-[#71717A]">
          {formatTime(currentTime)}
        </span>
        <div
          ref={progressRef}
          onClick={handleSeek}
          className="relative flex-1 cursor-pointer"
        >
          <div className="h-1.5 rounded-full bg-zinc-200">
            <div
              className="h-1.5 rounded-full bg-[#18181B] transition-[width] duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Hidden seek thumb for accessibility */}
          <div
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[#18181B] opacity-0 transition-opacity group-hover:opacity-100"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>
        <span className="w-8 text-left text-[11px] tabular-nums text-[#71717A]">
          {formatTime(duration)}
        </span>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={resolvedUrl}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => { setLoading(false); setError(true); onError?.() }}
      />
    </div>
  )
}
