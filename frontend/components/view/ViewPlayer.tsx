"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Play, Pause, SkipBack, SkipForward, Loader2 } from "lucide-react"

type Slide = {
  number: number
  title: string
  bullets: string[]
  narration: string
}

type Timing = {
  slideNumber: number
  durationMs: number
}

export function ViewPlayer({
  slides,
  combinedAudioUrl,
  timings,
  totalDurationMs,
  presentationId,
  viewerId,
  sessionToken,
  shareToken,
}: {
  slides: Slide[]
  combinedAudioUrl: string
  timings: Timing[]
  totalDurationMs: number
  presentationId: string
  viewerId: string
  sessionToken: string
  shareToken: string
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hasTrackedOpen = useRef(false)

  const total = slides.length
  const current = slides[currentIndex]

  // Map currentTime to the active slide based on cumulative timings
  const updateSlideFromTime = useCallback((timeMs: number) => {
    let cumulative = 0
    for (let i = 0; i < timings.length; i++) {
      cumulative += timings[i].durationMs
      if (timeMs < cumulative) {
        setCurrentIndex(i)
        return
      }
    }
    // Past the last timing — show last slide
    setCurrentIndex(timings.length - 1)
  }, [timings])

  // Track event helper
  const trackEvent = useCallback(async (eventType: string, extra?: Record<string, unknown>) => {
    try {
      await fetch(`/api/view/${shareToken}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_token: sessionToken,
          event_type: eventType,
          ...extra,
        }),
      })
    } catch {
      // Fire-and-forget — tracking failure shouldn't affect playback
    }
  }, [shareToken, sessionToken])

  // Track opened on first play
  useEffect(() => {
    if (playing && !hasTrackedOpen.current) {
      hasTrackedOpen.current = true
      trackEvent("opened", { progress_pct: 0 })
    }
  }, [playing, trackEvent])

  // Track slide viewed on slide change
  const lastTrackedSlide = useRef<number>(-1)
  useEffect(() => {
    if (current && current.number !== lastTrackedSlide.current && hasTrackedOpen.current) {
      lastTrackedSlide.current = current.number
      const progress = totalDurationMs > 0
        ? Math.round((currentIndex / Math.max(timings.length - 1, 1)) * 100)
        : 0
      trackEvent("slide_viewed", {
        slide_number: current.number,
        progress_pct: progress,
      })
    }
  }, [currentIndex, current, timings.length, totalDurationMs, trackEvent])

  // Handle audio time updates
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)

  const handleTimeUpdate = useCallback(() => {
    if (!audioElement) return
    const timeMs = audioElement.currentTime * 1000
    setCurrentTime(timeMs)
    updateSlideFromTime(timeMs)
  }, [audioElement, updateSlideFromTime])

  const handleEnded = useCallback(() => {
    setPlaying(false)
    trackEvent("completed", { progress_pct: 100, time_spent_seconds: Math.round(audioElement?.currentTime || 0) })
  }, [trackEvent, audioElement])

  const handleLoaded = useCallback(() => {
    setLoading(false)
  }, [])

  const handleError = useCallback(() => {
    setLoading(false)
    setError("Failed to load audio. Please try refreshing.")
  }, [])

  // Track close on page leave
  useEffect(() => {
    function handleBeforeUnload() {
      if (hasTrackedOpen.current && audioRef.current) {
        trackEvent("closed", {
          time_spent_seconds: Math.round(audioRef.current.currentTime),
          progress_pct: totalDurationMs > 0
            ? Math.round((audioRef.current.currentTime * 1000 / totalDurationMs) * 100)
            : 0,
        })
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [trackEvent, totalDurationMs])

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
      }
    }
  }, [])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play().catch(() => setError("Playback was blocked. Click play to start."))
    }
    setPlaying(!playing)
  }

  function seekToSlide(index: number) {
    const audio = audioRef.current
    if (!audio || !timings.length) return

    // Calculate cumulative time before the target slide
    let timeMs = 0
    for (let i = 0; i < index; i++) {
      timeMs += timings[i]?.durationMs || 0
    }
    audio.currentTime = timeMs / 1000
    setCurrentTime(timeMs)
    setCurrentIndex(index)

    if (!playing) {
      audio.play().catch(() => {})
      setPlaying(true)
    }
  }

  function goNext() {
    if (currentIndex < total - 1) seekToSlide(currentIndex + 1)
  }

  function goPrev() {
    if (currentIndex > 0) seekToSlide(currentIndex - 1)
  }

  // Progress as percentage
  const progressPct = totalDurationMs > 0
    ? Math.min(100, Math.round((currentTime / totalDurationMs) * 100))
    : 0

  // Format time
  function formatTime(ms: number) {
    const totalSec = Math.floor(ms / 1000)
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return `${min}:${sec.toString().padStart(2, "0")}`
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <p className="mb-4 text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#27272A]"
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col bg-white">
      {/* Audio element (hidden) */}
      <audio
        ref={audioRef}
        src={combinedAudioUrl}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onCanPlay={handleLoaded}
        onError={handleError}
        ref={(el) => setAudioElement(el)}
      />

      {/* Loading state */}
      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            <p className="text-sm text-zinc-500">Loading presentation...</p>
          </div>
        </div>
      )}

      {/* Main content */}
      {!loading && current && (
        <>
          {/* Slide display */}
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
            <div className="w-full max-w-2xl">
              {/* Slide number badge */}
              <div className="mb-4 flex items-center gap-3">
                <span className="inline-flex items-center rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                  Slide {current.number} of {total}
                </span>
                <div className="flex-1" />
              </div>

              {/* Title */}
              <h1 className="mb-6 text-2xl font-bold leading-tight text-[#18181B]">
                {current.title}
              </h1>

              {/* Bullets */}
              {current.bullets.length > 0 && (
                <ul className="space-y-3">
                  {current.bullets.map((b, i) => (
                    <li key={i} className="flex gap-3 text-base leading-relaxed text-zinc-700">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-300" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Narration text */}
              {current.narration && (
                <div className="mt-8 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
                  <p className="text-sm italic leading-relaxed text-zinc-500">
                    &ldquo;{current.narration}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Controls bar */}
          <div className="sticky bottom-0 border-t border-zinc-200 bg-white px-6 py-4">
            {/* Progress bar */}
            <div className="mb-3 h-1.5 w-full rounded-full bg-zinc-200">
              <div
                className="h-1.5 rounded-full bg-[#18181B] transition-all duration-150"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-[#18181B] disabled:opacity-30"
                  aria-label="Previous slide"
                >
                  <SkipBack className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#18181B] text-white transition-colors hover:bg-[#27272A]"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 pl-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={currentIndex >= total - 1}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-[#18181B] disabled:opacity-30"
                  aria-label="Next slide"
                >
                  <SkipForward className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span>{formatTime(currentTime)}</span>
                <span>/</span>
                <span>{formatTime(totalDurationMs)}</span>
              </div>
            </div>

            {/* Slide scrubber */}
            <div className="mt-3 flex items-center gap-1.5">
              {slides.map((slide, i) => (
                <button
                  key={slide.number}
                  type="button"
                  onClick={() => seekToSlide(i)}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-150 ${
                    i === currentIndex
                      ? "bg-[#18181B]"
                      : i < currentIndex
                        ? "bg-zinc-400"
                        : "bg-zinc-200 hover:bg-zinc-300"
                  }`}
                  aria-label={`Go to slide ${slide.number}`}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
