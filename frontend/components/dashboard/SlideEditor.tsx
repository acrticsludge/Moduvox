"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type SlideData = {
  id: string
  number: number
  title: string
  bullets: string[]
  narrationText: string
}

const SLIDE_ACCENTS = ["#DC2626", "#2563EB", "#16A34A"]

const MOCK_SLIDES: SlideData[] = [
  {
    id: "1",
    number: 1,
    title: "Security Awareness: Protecting Company Data",
    bullets: [
      "Always use strong, unique passwords for every work account — never reuse personal passwords.",
      "Report suspicious emails, unexpected attachments, or unknown senders to IT immediately.",
      "Lock your workstation (Win+L / Ctrl+Cmd+Q) whenever you step away, even briefly.",
      "Share sensitive information only through approved, encrypted channels — never via personal email.",
    ],
    narrationText: "",
  },
  {
    id: "2",
    number: 2,
    title: "Code of Conduct: Building a Respectful Workplace",
    bullets: [
      "Treat all colleagues with dignity and respect — every interaction matters.",
      "Disclose any outside relationships or financial interests that could create a conflict.",
      "Protect proprietary and personal information as if it were your own.",
      "Speak up — report any observed policy violations through your manager or HR.",
    ],
    narrationText: "",
  },
  {
    id: "3",
    number: 3,
    title: "Data Privacy: Handling Customer Information",
    bullets: [
      "Collect only the data you genuinely need — minimize what you store and process.",
      "Encrypt customer data at rest and in transit using company-approved tools.",
      "Access customer records only when necessary to perform your role — no exceptions.",
      "Follow data retention schedules: purge records when the retention period expires.",
    ],
    narrationText: "",
  },
]

export function SlideEditor({ voiceSelected }: { voiceSelected: boolean }) {
  const [slides, setSlides] = useState<SlideData[]>(MOCK_SLIDES)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [audioGenerated, setAudioGenerated] = useState(false)

  const current = slides[currentIndex]
  const total = slides.length

  if (!current) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-[#71717A]">No slides loaded</p>
      </div>
    )
  }

  function updateNarration(text: string) {
    setSlides((prev) =>
      prev.map((s) => (s.id === current.id ? { ...s, narrationText: text } : s)),
    )
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

        {/* Slide preview card */}
        <div className="relative w-full max-w-[780px] overflow-hidden rounded-xl border-2 border-zinc-200 bg-white shadow-sm">
          {/* Accent bar */}
          <div
            className="absolute left-0 right-0 top-0 h-1"
            style={{ backgroundColor: SLIDE_ACCENTS[currentIndex % SLIDE_ACCENTS.length] }}
          />
          <div className="flex flex-col justify-center p-8 pt-10">
            <h2 className="text-xl font-bold tracking-tight text-[#18181B] md:text-2xl">
              {current.title}
            </h2>
            <hr className="mb-5 mt-4 border-zinc-100" />
            <ul className="space-y-3">
              {current.bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-400" />
                  <span className="text-sm leading-relaxed text-[#71717A] md:text-base">
                    {bullet}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-1.5">
          {slides.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                i === currentIndex ? "bg-[#18181B]" : "bg-zinc-300",
              )}
            />
          ))}
        </div>
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
            value={current.narrationText}
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
            audioGenerated
              ? "max-h-24 opacity-100"
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
