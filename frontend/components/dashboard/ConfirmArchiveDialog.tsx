import { Archive, X } from "lucide-react"
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="float-right flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
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

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onArchive}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
          >
            <Archive className="h-4 w-4" />
            Archive
          </button>
        </div>
      </div>
    </div>
  )
}
