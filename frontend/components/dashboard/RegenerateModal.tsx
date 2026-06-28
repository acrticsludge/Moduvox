"use client"

import { useState } from "react"
import { Loader2, Eye } from "lucide-react"
import type { ParsedSlide } from "@/lib/pptx-renderer"

export function RegenerateModal({
  slides,
  narrations,
  changedSlides,
  generating,
  onNavigate,
  onViewParsed,
  onConfirm,
  onCancel,
}: {
  slides: ParsedSlide[]
  narrations: Record<number, string>
  changedSlides: number[]
  generating: boolean
  onNavigate: (slideNumber: number) => void
  onViewParsed: (slideNumber: number) => void
  onConfirm: (selected: Set<number>) => void
  onCancel: () => void
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set(changedSlides))

  function toggleSlide(num: number) {
    const next = new Set(selected)
    if (next.has(num)) {
      next.delete(num)
    } else {
      next.add(num)
    }
    setSelected(next)
  }

  function handleConfirm() {
    if (selected.size === 0) return
    onConfirm(selected)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40">
      <div className="mx-4 flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border border-zinc-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="text-base font-semibold text-[#18181B]">Regenerate Audio</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-[#71717A] hover:text-[#18181B]"
          >
            Cancel
          </button>
        </div>

        {/* Slide list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-1">
            {slides.map((slide) => {
              const isModified = changedSlides.includes(slide.number)
              const hasNarration = !!narrations[slide.number]
              return (
                <div
                  key={slide.number}
                  className="flex items-center gap-3 rounded-lg border border-zinc-100 px-3 py-2.5 transition-colors hover:border-zinc-200"
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selected.has(slide.number)}
                    onChange={() => toggleSlide(slide.number)}
                    className="h-4 w-4 flex-shrink-0 accent-[#18181B]"
                  />

                  {/* Slide info – clickable to navigate */}
                  <button
                    type="button"
                    onClick={() => onNavigate(slide.number)}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <span className="text-xs font-medium text-zinc-400 w-7 flex-shrink-0">
                      #{slide.number}
                    </span>
                    <span className="flex-1 truncate text-sm text-[#18181B]">
                      {slide.title}
                    </span>
                    {isModified && (
                      <span className="flex-shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        Modified
                      </span>
                    )}
                    {!hasNarration && !isModified && (
                      <span className="flex-shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                        No script
                      </span>
                    )}
                  </button>

                  {/* View parsed text */}
                  <button
                    type="button"
                    onClick={() => onViewParsed(slide.number)}
                    className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-[#18181B]"
                    title="View parsed text"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer with confirm */}
        <div className="border-t border-zinc-100 px-6 py-4">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selected.size === 0 || generating}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#18181B] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#27272A] disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              `Regenerate Audio for ${selected.size} slide(s)`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
