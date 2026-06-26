"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type SlideData = {
  id: string
  number: number
  narrationText: string
  audioGenerated: boolean
}

const MOCK_SLIDES: SlideData[] = [
  { id: "1", number: 1, narrationText: "", audioGenerated: false },
  { id: "2", number: 2, narrationText: "", audioGenerated: false },
  { id: "3", number: 3, narrationText: "", audioGenerated: false },
]

export function SlideEditor() {
  const [slides, setSlides] = useState<SlideData[]>(MOCK_SLIDES)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [generating, setGenerating] = useState(false)

  const current = slides[currentIndex]
  const total = slides.length

  function updateNarration(text: string) {
    setSlides((prev) =>
      prev.map((s) => (s.id === current.id ? { ...s, narrationText: text } : s)),
    )
  }

  function handleGenerate() {
    setGenerating(true)
    setTimeout(() => {
      setSlides((prev) =>
        prev.map((s) =>
          s.id === current.id ? { ...s, audioGenerated: true } : s,
        ),
      )
      setGenerating(false)
    }, 800)
  }

  function goPrev() {
    setCurrentIndex((i) => Math.max(0, i - 1))
  }

  function goNext() {
    setCurrentIndex((i) => Math.min(total - 1, i + 1))
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="flex w-full max-w-2xl flex-col items-center gap-6">
        {/* Navigation */}
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

        {/* Slide preview */}
        <div className="flex aspect-video w-full max-w-xl items-center justify-center rounded-xl border-2 border-zinc-200 bg-white shadow-sm">
          <span className="text-4xl font-semibold text-zinc-300">
            Slide {current.number}
          </span>
        </div>

        {/* Narration textarea */}
        <div className="w-full space-y-2">
          <label className="text-sm font-semibold text-[#18181B]">
            Narration Script
          </label>
          <Textarea
            value={current.narrationText}
            onChange={(e) => updateNarration(e.target.value)}
            placeholder="AI-generated narration will appear here..."
            className="min-h-[100px] resize-none"
          />
        </div>

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={generating || current.audioGenerated}
          className="w-full"
        >
          {generating
            ? "Generating..."
            : current.audioGenerated
              ? "Generated"
              : "Generate Narration"}
        </Button>

        {/* Audio player */}
        <div
          className={cn(
            "w-full overflow-hidden transition-all duration-500",
            current.audioGenerated
              ? "max-h-20 opacity-100"
              : "max-h-0 opacity-0",
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
