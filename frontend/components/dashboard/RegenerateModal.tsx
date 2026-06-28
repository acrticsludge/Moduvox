"use client"

import { useState } from "react"
import { Loader2, ChevronDown, ChevronRight } from "lucide-react"
import type { ParsedSlide } from "@/lib/pptx-renderer"

export function RegenerateModal({
  slides,
  changedSlides,
  generating,
  onNavigate,
  onConfirm,
  onCancel,
}: {
  slides: ParsedSlide[]
  changedSlides: number[]
  generating: boolean
  onNavigate: (slideNumber: number) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null)
  const changedSet = new Set(changedSlides)
  const displaySlides = slides.filter((s) => changedSet.has(s.number))

  function toggleExpand(num: number) {
    setExpandedSlide(expandedSlide === num ? null : num)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#18181B]/40 pt-24">
      <div className="mx-4 w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="text-base font-semibold text-[#18181B]">
            Regenerate Audio
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-[#71717A] hover:text-[#18181B]"
          >
            Cancel
          </button>
        </div>

        {/* Slide list */}
        <div className="max-h-[calc(100vh-12rem)] overflow-y-auto px-6 py-4">
          {displaySlides.length === 0 ? (
            <p className="text-sm text-[#71717A]">No modified slides to regenerate.</p>
          ) : (
            <div className="space-y-1">
              {displaySlides.map((slide) => (
                <div
                  key={slide.number}
                  className="overflow-hidden rounded-lg border border-zinc-100"
                >
                  {/* Slide row */}
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    {/* Expand toggle */}
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

                    {/* Slide info – clickable to navigate */}
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

                  {/* Expanded parsed text */}
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

        {/* Footer with confirm */}
        <div className="border-t border-zinc-100 px-6 py-4">
          <button
            type="button"
            onClick={onConfirm}
            disabled={displaySlides.length === 0 || generating}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#18181B] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#27272A] disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              `Regenerate Audio for ${displaySlides.length} slide(s)`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
