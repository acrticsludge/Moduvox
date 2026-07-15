"use client"

import { useState, useEffect } from "react"
import { X, Loader2, Check } from "lucide-react"
import { ErrorBanner } from "@/components/ui/ErrorBanner"
import { COLOR_PALETTE, ICON_SET, type Project, type ProjectColor, type ProjectIcon } from "@/lib/validations/project"

import {
  FolderKanban, BookOpen, GraduationCap, Shield,
  FileText, Presentation, Notebook, ClipboardList,
} from "lucide-react"

const ICON_COMPONENTS: Record<string, React.ReactNode> = {
  FolderKanban: <FolderKanban className="h-5 w-5" />,
  BookOpen: <BookOpen className="h-5 w-5" />,
  GraduationCap: <GraduationCap className="h-5 w-5" />,
  Shield: <Shield className="h-5 w-5" />,
  FileText: <FileText className="h-5 w-5" />,
  Presentation: <Presentation className="h-5 w-5" />,
  Notebook: <Notebook className="h-5 w-5" />,
  ClipboardList: <ClipboardList className="h-5 w-5" />,
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
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description)
  const [color, setColor] = useState<ProjectColor | null>(project.color as ProjectColor)
  const [icon, setIcon] = useState<ProjectIcon | null>(project.icon as ProjectIcon)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError("")

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          color: color ?? undefined,
          icon: icon ?? undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Something went wrong")
        return
      }
      onSaved()
    } catch {
      setError("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`w-full max-w-md rounded-xl border bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto hide-scrollbar transition-all duration-300 ${
        error ? "border-red-300 shadow-[0_0_0_1px_#fca5a5]" : "border-zinc-200"
      }`}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#18181B]">Edit Project</h2>
          <button type="button" onClick={onClose} className="text-[#71717A] hover:text-[#18181B]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-[#18181B]">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Security Training Q3"
              maxLength={100}
              required
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#18181B]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              maxLength={500}
              rows={2}
              className="mt-1 w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#18181B]">Color</label>
            <div className="mt-1.5 flex gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c as ProjectColor)}
                  className="flex h-10 w-10 items-center justify-center rounded-full transition-all hover:scale-110"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="h-3.5 w-3.5 text-[#18181B]" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#18181B]">Icon</label>
            <div className="mt-1.5 grid grid-cols-4 gap-2">
              {ICON_SET.map((ico) => (
                <button
                  key={ico}
                  type="button"
                  onClick={() => setIcon(ico as ProjectIcon)}
                  className={`flex items-center justify-center rounded-lg border p-3 min-h-[44px] min-w-[44px] transition-all ${
                    icon === ico
                      ? "border-[#18181B] bg-zinc-100"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  {ICON_COMPONENTS[ico]}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="space-y-2">
              <ErrorBanner message={error} />
              <button
                type="button"
                onClick={handleSubmit}
                className="text-sm font-medium text-red-700 underline hover:text-red-800"
              >
                Try again
              </button>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
                className="rounded-lg border border-zinc-200 px-4 py-2.5 min-h-[44px] text-sm font-medium text-[#71717A] hover:text-[#18181B]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || saving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#18181B]/70 bg-[#18181B] px-4 py-2.5 min-h-[44px] text-sm font-medium text-white transition-all hover:border-[#18181B] hover:bg-[#27272A] disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
