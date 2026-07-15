"use client"

import { useState, useEffect } from "react"
import { Loader2, TriangleAlert } from "lucide-react"
import { ErrorBanner } from "@/components/ui/ErrorBanner"
import type { Presentation } from "@/lib/validations/presentation"

export function DeletePresentationDialog({
  presentation,
  onClose,
  onDeleted,
}: {
  presentation: Presentation
  onClose: () => void
  onDeleted: () => void
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])
  const [confirmText, setConfirmText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (confirmText !== "DELETE") return

    setDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/presentations/${presentation.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        onDeleted()
        return
      }

      const json = await res.json()
      setError(typeof json.error === "string" ? json.error : "Something went wrong")
    } catch {
      setError("Something went wrong")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40 p-4">
      <div className={`w-full max-w-sm rounded-xl border bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto hide-scrollbar transition-all duration-300 ${
        error ? "border-red-300 shadow-[0_0_0_1px_#fca5a5]" : "border-zinc-200"
      }`}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <TriangleAlert className="h-6 w-6 text-red-600" />
        </div>

        <h2 className="mb-2 text-center text-lg font-semibold">
          Delete &ldquo;{presentation.title}&rdquo;?
        </h2>

        <p className="mb-6 text-center text-sm text-zinc-500">
          This will permanently delete this presentation and its narration data.
          This action cannot be undone.
        </p>

        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Type <span className="font-semibold text-red-600">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            autoFocus
          />
        </div>

        {error && (
          <div className="mb-4 space-y-2">
            <ErrorBanner message={error} />
            <button
              type="button"
              onClick={handleDelete}
              className="text-sm font-medium text-red-700 underline hover:text-red-800"
            >
              Try again
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={confirmText !== "DELETE" || deleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
