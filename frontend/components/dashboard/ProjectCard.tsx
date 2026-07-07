"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderKanban,
  BookOpen,
  GraduationCap,
  Shield,
  FileText,
  Presentation,
  Notebook,
  ClipboardList,
} from "lucide-react"
import type { Project } from "@/lib/validations/project"
import { RenameProjectModal } from "./RenameProjectModal"
import { DeleteProjectDialog } from "./DeleteProjectDialog"

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function ProjectCard({ project }: { project: Project }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [presentationCount, setPresentationCount] = useState<number | null>(null)

  const IconComp = ICON_MAP[project.icon] ?? FolderKanban

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("presentations")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id)
      .then(({ count }) => {
        if (count !== null) setPresentationCount(count)
      })
  }, [project.id])

  function handleNavigate() {
    router.push(`/dashboard/projects/${project.id}`)
  }

  return (
    <>
      <div
        className="group relative cursor-pointer rounded-xl border border-zinc-200 bg-white hover:shadow-sm"
        onClick={handleNavigate}
      >
        <div
          className="h-1 rounded-t-xl"
          style={{ backgroundColor: project.color }}
        />

        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: project.color }}
              >
                <IconComp className="h-5 w-5 text-zinc-700" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#18181B]">
                  {project.name}
                </h3>
                <p className="text-xs text-[#71717A]">
                  {presentationCount !== null
                    ? `${presentationCount} ${presentationCount === 1 ? "presentation" : "presentations"}`
                    : "..."}
                </p>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen((v) => !v)
                }}
                className="rounded-lg touch-target-sm text-zinc-400 max-md:opacity-100 md:opacity-0 transition hover:bg-zinc-100 md:group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpen(false)
                        setShowRename(true)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#18181B] hover:bg-zinc-50"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpen(false)
                        setShowDelete(true)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {project.description && (
            <p className="mt-3 line-clamp-2 text-sm text-[#71717A]">
              {project.description}
            </p>
          )}

          <p className="mt-3 text-xs text-zinc-400">
            {formatDate(project.created_at)}
          </p>
        </div>
      </div>

      {showRename && (
        <RenameProjectModal
          project={project}
          onClose={() => setShowRename(false)}
          onSaved={() => {
            setShowRename(false)
            router.refresh()
          }}
        />
      )}

      {showDelete && (
        <DeleteProjectDialog
          project={project}
          onClose={() => setShowDelete(false)}
          onDeleted={() => {
            setShowDelete(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
