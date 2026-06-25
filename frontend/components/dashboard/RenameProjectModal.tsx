import { useState } from "react"
import { X, Loader2, Check } from "lucide-react"
import {
  COLOR_PALETTE,
  ICON_SET,
  type Project,
  type ProjectColor,
  type ProjectIcon,
} from "@/lib/validations/project"
import {
  FolderKanban,
  BookOpen,
  GraduationCap,
  Shield,
  FileText,
  Presentation,
  Notebook,
  ClipboardList,
} from "lucide-react"

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FolderKanban,
  BookOpen,
  GraduationCap,
  Shield,
  FileText,
  Presentation,
  Notebook,
  ClipboardList,
}

export function RenameProjectModal({
  project,
  onClose,
  onSaved,
}: {
  project: Project
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description)
  const [color, setColor] = useState<ProjectColor | undefined>(project.color)
  const [icon, setIcon] = useState<ProjectIcon | undefined>(project.icon)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          icon,
        }),
      })

      if (res.ok) {
        onSaved()
        return
      }

      if (res.status === 422) {
        const body = await res.json()
        const details =
          body.details
            ?.map((d: { message: string }) => d.message)
            .join(", ") ?? ""
        setError(`Validation failed${details ? ": " + details : ""}`)
      } else {
        setError("Something went wrong")
      }
    } catch {
      setError("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40">
      <div className="w-full max-w-md rounded-xl border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Rename Project</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="e.g. Security Training Q3"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="What is this project about?"
              className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              Color
            </label>
            <div className="flex gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(color === c ? undefined : c)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border transition hover:scale-110"
                  style={{ backgroundColor: c }}
                >
                  {color === c && (
                    <Check className="h-4 w-4 text-zinc-700" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              Icon
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ICON_SET.map((i) => {
                const IconComp = ICON_MAP[i]
                const selected = icon === i
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIcon(selected ? undefined : i)}
                    className={`flex items-center justify-center rounded-lg border p-2 transition ${
                      selected
                        ? "border-[#18181B] bg-zinc-100"
                        : "border-zinc-200 hover:border-zinc-400"
                    }`}
                  >
                    {IconComp && <IconComp className="h-5 w-5 text-zinc-700" />}
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="flex items-center gap-2 rounded-lg bg-[#18181B] px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
