import { useState } from "react"
import { Loader2, Pencil } from "lucide-react"
import type { Presentation } from "@/lib/validations/presentation"

export function RenamePresentationDialog({
  presentation,
  onClose,
  onSaved,
}: {
  presentation: Presentation
  onClose: () => void
  onSaved: (updated: Presentation) => void
}) {
  const [title, setTitle] = useState(presentation.title)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const trimmed = title.trim()
    if (!trimmed) {
      setError("Title is required")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/presentations/${presentation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      })

      const json = await res.json()

      if (res.ok && json.data) {
        onSaved(json.data as Presentation)
        return
      }

      setError(typeof json.error === "string" ? json.error : "Something went wrong")
    } catch {
      setError("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40">
      <div className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto thin-scrollbar">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <Pencil className="h-6 w-6 text-blue-600" />
        </div>

        <h2 className="mb-2 text-center text-lg font-semibold">
          Rename presentation
        </h2>

        <p className="mb-6 text-center text-sm text-zinc-500">
          Update the title of this presentation.
        </p>

        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
            autoFocus
          />
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#18181B] px-4 py-2 text-sm font-medium text-white hover:bg-[#27272A] disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
