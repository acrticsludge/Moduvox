"use client"

import { useEffect } from "react"
import { X } from "lucide-react"
import { ShareSettingsPanel } from "./ShareSettingsPanel"
import { ViewerTable } from "./ViewerTable"

export function SharePresentationModal({
  presentationId,
  onClose,
}: {
  presentationId: string
  onClose: () => void
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#18181B]/40 sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-t-xl border border-zinc-200 bg-white shadow-xl sm:rounded-xl sm:max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-lg font-semibold text-[#18181B]">
            Share & Track
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 sm:p-1"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto space-y-6 p-4 sm:p-6 hide-scrollbar">
          {/* Share Settings */}
          <ShareSettingsPanel presentationId={presentationId} />

          {/* Divider */}
          <div className="border-t border-zinc-100" />

          {/* Viewer Table */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-[#18181B]">
              Viewer Tracking
            </h3>
            <ViewerTable presentationId={presentationId} />
          </div>
        </div>
      </div>
    </div>
  )
}
