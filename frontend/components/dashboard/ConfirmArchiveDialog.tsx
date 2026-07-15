"use client"

import { useState, useEffect } from "react"
import { Archive, Loader2, X } from "lucide-react"
import { ErrorBanner } from "@/components/ui/ErrorBanner"
import type { Presentation } from "@/lib/validations/presentation"

export function ConfirmArchiveDialog({
  presentation,
  onClose,
  onArchive,
}: {
  presentation: Presentation
  onClose: () => void
  onArchive: () => void
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [onClose])
  const [archiving, setArchiving] = useState(false)
  const [error, setError] = useState("")

  async function handleArchive() {
    setArchiving(true)
    setError("")
    try {
      await onArchive()
    } catch {
      setError("Something went wrong")
    } finally {
      setArchiving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`w-full max-w-sm rounded-xl border bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto hide-scrollbar transition-all duration-300 ${
        error ? "border-red-300 shadow-[0_0_0_1px_#fca5a5]" : "border-zinc-200"
      }`}>
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={archiving}
          className="float-right flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-30 sm:h-6 sm:w-6"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <Archive className="h-6 w-6 text-amber-600" />
        </div>

        <h2 className="mb-2 text-lg font-semibold text-[#18181B]">
          Archive &ldquo;{presentation.title}&rdquo;?
        </h2>

        <p className="mb-6 text-sm leading-relaxed text-zinc-500">
          This presentation will no longer be accessible via its share link.
          You can restore it anytime from the project page.
        </p>

        {error && (
          <div className="mb-4 space-y-2">
            <ErrorBanner message={error} />
            <button
              type="button"
              onClick={handleArchive}
              className="text-sm font-medium text-red-700 underline hover:text-red-800"
            >
              Try again
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={archiving}
            className="flex-1 rounded-lg border border-zinc-200 px-4 py-2.5 min-h-[44px] text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={archiving}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 min-h-[44px] text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
          >
            {archiving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            {archiving ? "Archiving..." : "Archive"}
          </button>
        </div>
      </div>
    </div>
  )
}
