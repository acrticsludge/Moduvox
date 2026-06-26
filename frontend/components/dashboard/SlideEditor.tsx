"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Play, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { renderPptx, type RenderedSlide } from "@/lib/pptx-renderer"

export function SlideEditor({
  voiceSelected,
  file,
}: {
  voiceSelected: boolean
  file: File | null
}) {
  const [slides, setSlides] = useState<RenderedSlide[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [audioGenerated, setAudioGenerated] = useState(false)
  const [rendering, setRendering] = useState(true)
  const [renderError, setRenderError] = useState("")

  // Narrations stored per slide
  const [narrations, setNarrations] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!file) {
      setRendering(false)
      setRenderError("No file provided")
      return
    }

    setRendering(true)
    setRenderError("")

    renderPptx(file)
      .then((rendered) => {
        setSlides(rendered)
        setCurrentIndex(0)
        setRendering(false)
      })
      .catch((err) => {
        console.error("PPTX render error:", err)
        setRenderError("Failed to render presentation. The file may be corrupted or incompatible.")
        setRendering(false)
      })
  }, [file])

  const current = slides[currentIndex]
  const total = slides.length

  function updateNarration(text: string) {
    if (!current) return
    setNarrations((prev) => ({ ...prev, [current.number]: text }))
  }

  function handleGenerate() {
    setGenerating(true)
    setTimeout(() => {
      setAudioGenerated(true)
      setGenerating(false)
    }, 1200)
  }

  function goPrev() {
    setCurrentIndex((i) => Math.max(0, i - 1))
  }

  function goNext() {
    setCurrentIndex((i) => Math.min(total - 1, i + 1))
  }

  // Loading state
  if (rendering) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#71717A]" />
        <p className="text-sm text-[#71717A]">Rendering slides...</p>
      </div>
    )
  }

  // Error state
  if (renderError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-sm text-red-600">{renderError}</p>
      </div>
    )
  }

  // No slides
  if (!current) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-sm text-[#71717A]">No slides found in this presentation.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8 lg:flex-row lg:items-start">
      {/* Left column — slide preview */}
      <div className="flex flex-1 flex-col items-center gap-4">
        {/* Navigation arrows + counter */}
        <div className="flex items-center gap-4 text-sm text-[#71717A]">
          <button
            type="button"
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-zinc-100 hover:text-[#18181B] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="font-medium text-[#18181B]">
            Slide {current.number} of {total}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={currentIndex === total - 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-zinc-100 hover:text-[#18181B] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Slide preview — canvas-rendered screenshot */}
        {current.imageDataUrl ? (
          <img
            src={current.imageDataUrl}
            alt={`Slide ${current.number}`}
            className="w-full max-w-[780px] rounded-xl border-2 border-zinc-200 shadow-sm"
            style={{ aspectRatio: "16/9" }}
          />
        ) : (
          <div className="flex w-full max-w-[780px] items-center justify-center rounded-xl border-2 border-zinc-200 bg-white shadow-sm" style={{ aspectRatio: "16/9" }}>
            <p className="text-sm text-[#71717A]">Failed to render slide</p>
          </div>
        )}

      </div>

      {/* Right column — controls */}
      <div className="flex w-full flex-col gap-5 lg:w-[380px] lg:flex-shrink-0 lg:overflow-y-auto lg:sticky lg:top-8 lg:max-h-[calc(100vh-10rem)]">
        {/* Slide number */}
        <p className="text-sm font-medium text-[#71717A]">
          Slide {current.number} of {total}
        </p>

        {/* Narration textarea */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[#18181B]">
            Narration Script
          </label>
          <Textarea
            value={narrations[current.number] ?? ""}
            onChange={(e) => updateNarration(e.target.value)}
            placeholder="AI-generated narration will appear here..."
            className="min-h-[140px] resize-none"
          />
        </div>

        {/* Global Generate button */}
        {!audioGenerated && (
          <div className="space-y-1">
            <Button
              onClick={handleGenerate}
              disabled={generating || !voiceSelected}
              className="w-full"
            >
              {generating ? "Generating audio for all slides..." : "Generate Narration"}
            </Button>
            {!voiceSelected && (
              <p className="text-xs text-[#71717A]">
                Select a voice in the sidebar to enable generation.
              </p>
            )}
          </div>
        )}

        {audioGenerated && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            Audio generated for all {total} slides
          </div>
        )}

        {/* Audio player — shows per slide after global generation */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-500",
            audioGenerated ? "max-h-24 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#18181B] text-white transition-colors hover:bg-[#27272A]"
            >
              <Play className="h-4 w-4" />
            </button>
            <div className="flex flex-1 items-center gap-2">
              <span className="text-xs text-[#71717A]">0:00</span>
              <div className="flex-1">
                <div className="h-1.5 rounded-full bg-zinc-200">
                  <div className="h-1.5 w-0 rounded-full bg-[#18181B]" />
                </div>
              </div>
              <span className="text-xs text-[#71717A]">0:00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
