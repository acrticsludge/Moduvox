"use client"

import { AlertTriangle, FileText, Info } from "lucide-react"
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40">
      <div className="mx-4 w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
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

        {!isReplacement && !isIdentical && (
          <div className="mt-4 space-y-1.5 text-sm">
            {diff.added > 0 && <p className="text-green-600">+ {diff.added} slide(s) added</p>}
            {diff.removed > 0 && <p className="text-red-600">- {diff.removed} slide(s) removed</p>}
            {diff.changed > 0 && <p className="text-amber-600">~ {diff.changed} slide(s) changed</p>}
            {diff.unchanged > 0 && <p className="text-zinc-500">{diff.unchanged} slide(s) unchanged</p>}
          </div>
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
