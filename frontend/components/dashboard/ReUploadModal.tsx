"use client"

import { AlertTriangle, FileText, Info, ArrowRight } from "lucide-react"
import type { SlideDiff } from "@/lib/pptx-renderer"

export function ReUploadModal({
  diff,
  onApply,
  onCancel,
  parsing,
}: {
  diff: SlideDiff
  onApply: () => void
  onCancel: () => void
  parsing: boolean
}) {
  const isReplacement = diff.type === "replacement"
  const isIdentical = diff.type === "identical"

  // Only show slides that aren't unchanged
  const activeChanges = diff.changes.filter((c) => c.status !== "unchanged")
  const unchangedCount = diff.changes.filter((c) => c.status === "unchanged").length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
        <div
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
            isReplacement ? "bg-red-50" : isIdentical ? "bg-zinc-50" : "bg-amber-50"
          }`}
        >
          {isReplacement ? (
            <AlertTriangle className="h-6 w-6 text-red-500" />
          ) : isIdentical ? (
            <Info className="h-6 w-6 text-zinc-500" />
          ) : (
            <FileText className="h-6 w-6 text-amber-500" />
          )}
        </div>

        <h2 className="text-center text-base font-semibold text-[#18181B]">
          {isReplacement ? "Replace all slides?" : isIdentical ? "No changes detected" : "Slides updated"}
        </h2>

        <p className="mt-2 text-center text-sm text-[#71717A]">
          {isReplacement
            ? "This appears to be a completely different presentation. All existing slides, narration, and voice settings will be replaced."
            : isIdentical
              ? "This file is identical to the current version. No changes needed."
              : diff.message}
        </p>

        {!isReplacement && !isIdentical && activeChanges.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Per-slide changes</p>
            <div className="max-h-[40vh] overflow-y-auto space-y-1 hide-scrollbar">
              {activeChanges.map((c) => (
                <div key={c.number} className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-400 w-6 flex-shrink-0">#{c.number}</span>
                  {c.status === "modified" && <span className="text-amber-600">~ modified</span>}
                  {c.status === "added" && <span className="text-green-600">+ added</span>}
                  {c.status === "reordered" && (
                    <span className="flex items-center gap-1 text-blue-600">
                      ↔ reordered from #{c.oldNumber}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {unchangedCount > 0 && (
              <p className="text-xs text-zinc-400">{unchangedCount} slide(s) unchanged — not listed</p>
            )}
          </div>
        )}

        {!isReplacement && !isIdentical && activeChanges.length === 0 && unchangedCount > 0 && (
          <div className="mt-4 text-center text-sm text-zinc-500">All slides unchanged.</div>
        )}

        {isReplacement && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs text-red-700">
              This action cannot be undone. All narration text and voice settings will be lost.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={parsing}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-[#71717A] hover:text-[#18181B] disabled:opacity-50"
          >
            {isIdentical ? "OK" : "Cancel"}
          </button>
          {!isIdentical && (
            <button
              type="button"
              onClick={onApply}
              disabled={parsing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#18181B]/70 bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#27272A] disabled:opacity-50"
            >
              {parsing ? "Processing..." : isReplacement ? "Replace All" : "Apply Changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
