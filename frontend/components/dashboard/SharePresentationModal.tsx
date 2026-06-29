"use client"

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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-zinc-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-[#18181B]">
            Share & Track
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto space-y-6 p-6">
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
