"use client"

import { useState } from "react"
import { Loader2, ChevronDown, ChevronRight, CheckCircle2, XCircle, X } from "lucide-react"
import type { ParsedSlide } from "@/lib/pptx-renderer"

export type RegenStep = "review" | "generating" | "complete"

export function RegenerateModal({
  slides,
  changedSlides,
  voiceChangedSinceAudio,
  onNavigate,
  onConfirm,
  onCancel,
  step,
  generationError,
  audioGenProgress,
  generationSummary,
  onRetry,
}: {
  slides: ParsedSlide[]
  changedSlides: number[]
  voiceChangedSinceAudio?: boolean
  onNavigate: (slideNumber: number) => void
  onConfirm: () => void
  onCancel: () => void
  step: RegenStep
  generationError: string | null
  audioGenProgress: { current: number; total: number; slideTitle?: string } | null
  generationSummary: { success: number; failed: number } | null
  onRetry: () => void
}) {
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null)
  const affectedSlides = voiceChangedSinceAudio
    ? slides
    : slides.filter((s) => new Set(changedSlides).has(s.number))

  function toggleExpand(num: number) {
    setExpandedSlide(expandedSlide === num ? null : num)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40 p-4">
      <div className="flex w-full max-w-lg flex-col rounded-xl border border-zinc-200 bg-white shadow-xl max-h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="text-base font-semibold text-[#18181B]">
            {step === "review" && "Regenerate Audio"}
            {step === "generating" && "Generating Audio..."}
            {step === "complete" && "Done"}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={step === "generating"}
            className="text-sm text-[#71717A] hover:text-[#18181B] disabled:opacity-30"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Review Step ── */}
        {step === "review" && (
          <>
            {voiceChangedSinceAudio && (
              <div className="flex-shrink-0 mx-6 mt-4 mb-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                Voice settings changed. All slides will be regenerated with the new voice.
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-6 py-4 hide-scrollbar">
              {affectedSlides.length === 0 ? (
                <p className="text-sm text-[#71717A]">No modified slides to regenerate.</p>
              ) : (
                <div className="space-y-1">
                  {affectedSlides.map((slide) => (
                    <div key={slide.number} className="overflow-hidden rounded-lg border border-zinc-100">
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => toggleExpand(slide.number)}
                          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-[#18181B]"
                          title="View parsed text"
                        >
                          {expandedSlide === slide.number ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigate(slide.number)}
                          className="flex flex-1 items-center gap-2 text-left"
                        >
                          <span className="w-7 flex-shrink-0 text-xs font-medium text-zinc-400">
                            #{slide.number}
                          </span>
                          <span className="flex-1 break-words text-sm text-[#18181B]">
                            {slide.title}
                          </span>
                          <span className="flex-shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            Modified
                          </span>
                        </button>
                      </div>
                      {expandedSlide === slide.number && (
                        <div className="border-t border-zinc-100 px-3 pb-2.5 pt-2">
                          {slide.bullets.length > 0 ? (
                            <ul className="space-y-1">
                              {slide.bullets.map((b, i) => (
                                <li key={i} className="flex gap-2 text-sm text-[#71717A]">
                                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-300" />
                                  <span className="break-words leading-relaxed">{b}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-[#71717A]">No additional content.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-shrink-0 border-t border-zinc-100 px-6 py-4">
              <button
                type="button"
                onClick={onConfirm}
                disabled={affectedSlides.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#18181B] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#27272A] disabled:opacity-50"
              >
                Regenerate Audio for {affectedSlides.length} slide(s)
              </button>
            </div>
          </>
        )}

        {/* ── Generating Step ── */}
        {step === "generating" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 py-12 min-h-[280px]">
            <Loader2 className="h-8 w-8 animate-spin text-[#18181B]" />
            <p className="text-sm font-medium text-[#18181B]">Generating audio...</p>
            {audioGenProgress && (
              <>
                <p className="text-xs text-[#71717A]">
                  Slide {audioGenProgress.current} of {audioGenProgress.total}
                  {audioGenProgress.slideTitle ? `: ${audioGenProgress.slideTitle}` : ""}
                </p>
                <div className="h-1.5 w-48 rounded-full bg-zinc-200">
                  <div
                    className="h-1.5 rounded-full bg-[#18181B] transition-all duration-300"
                    style={{ width: `${(audioGenProgress.current / audioGenProgress.total) * 100}%` }}
                  />
                </div>
              </>
            )}
            {generationError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span>{generationError}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-[#71717A] hover:text-[#18181B]"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── Complete Step ── */}
        {step === "complete" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-12 min-h-[280px]">
            {generationSummary && generationSummary.failed === 0 ? (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
            ) : (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-7 w-7 text-red-600" />
              </div>
            )}
            <h2 className="text-lg font-semibold text-[#18181B]">
              {generationSummary && generationSummary.failed === 0
                ? "Generation Complete"
                : "Partial Failure"}
            </h2>
            <p className="text-sm text-[#71717A] text-center max-w-xs">
              {generationSummary && generationSummary.failed === 0
                ? `${generationSummary.success} slide(s) regenerated successfully.`
                : `${generationSummary?.failed || 0} slide(s) failed out of ${(generationSummary?.success || 0) + (generationSummary?.failed || 0)}.`}
            </p>
            {generationSummary && generationSummary.failed > 0 && (
              <button
                type="button"
                onClick={onRetry}
                disabled={false}
                className="rounded-lg bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#27272A] disabled:opacity-50"
              >
                Retry Failed
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
