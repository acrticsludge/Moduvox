"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Plus, ChevronRight, FileText, Pencil, FolderKanban, BookOpen, GraduationCap, Shield, Presentation, Notebook, ClipboardList } from "lucide-react"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import type { Project } from "@/lib/validations/project"
import type { Presentation as PresentationType } from "@/lib/validations/presentation"
import { RenameProjectModal } from "@/components/dashboard/RenameProjectModal"
import { CreatePresentationDialog } from "@/components/dashboard/CreatePresentationDialog"
import { PresentationCardActions } from "@/components/dashboard/PresentationCardActions"
import { RenamePresentationDialog } from "@/components/dashboard/RenamePresentationDialog"
import { DeletePresentationDialog } from "@/components/dashboard/DeletePresentationDialog"

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

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [presentations, setPresentations] = useState<PresentationType[]>([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showCreatePresentation, setShowCreatePresentation] = useState(false)
  const [renameTarget, setRenameTarget] = useState<PresentationType | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PresentationType | null>(null)
  const [archiving, setArchiving] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const [projectRes, presentationsRes] = await Promise.all([
      supabase.from("projects").select("*").eq("id", params.id).single(),
      supabase
        .from("presentations")
        .select("*")
        .eq("project_id", params.id)
        .order("created_at", { ascending: false }),
    ])
    setProject(projectRes.data)
    setPresentations(presentationsRes.data as PresentationType[])
  }, [params.id])

  useEffect(() => {
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  async function handleArchive(p: PresentationType) {
    setArchiving((prev) => new Set(prev).add(p.id))
    try {
      const res = await fetch(`/api/presentations/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      })
      if (res.ok) fetchData()
    } catch { toast.error("Failed to archive presentation") }
    setArchiving((prev) => { const next = new Set(prev); next.delete(p.id); return next })
  }

  async function handleRestore(p: PresentationType) {
    setArchiving((prev) => new Set(prev).add(p.id))
    try {
      const res = await fetch(`/api/presentations/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      })
      if (res.ok) fetchData()
    } catch { toast.error("Failed to restore presentation") }
    setArchiving((prev) => { const next = new Set(prev); next.delete(p.id); return next })
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <p className="text-sm text-[#71717A]">Project not found</p>
      </div>
    )
  }

  const IconComp = ICON_MAP[project.icon] ?? FolderKanban

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-faint)] bg-white px-6 py-4">
        <div className="flex items-center gap-2 text-sm">
          <a
            href="/dashboard"
            className="font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
          >
            All Projects
          </a>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          <span className="font-medium text-[#18181B]">{project.name}</span>
        </div>

        <button
          type="button"
          onClick={() => setShowCreatePresentation(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#71717A] transition-colors duration-150 hover:text-[#18181B]"
        >
          <Plus className="h-4 w-4" />
          New Presentation
        </button>
      </div>

      {/* Project info */}
      <div className="border-b border-[var(--color-border-faint)] px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: project.color }}
            >
              <IconComp className="h-7 w-7 text-zinc-700" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[#18181B]">{project.name}</h1>
              {project.description && (
                <p className="mt-0.5 text-sm text-[#71717A]">{project.description}</p>
              )}
              <div className="mt-1 flex items-center gap-3 text-sm text-[#71717A]">
                <span>{presentations.length} {presentations.length === 1 ? "presentation" : "presentations"}</span>
                <span className="text-zinc-300">·</span>
                <span>Created {formatDate(project.created_at)}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowEdit(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-zinc-100 hover:text-[#18181B]"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Presentations list or empty state */}
      {presentations.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="mx-auto max-w-sm text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100">
              <FileText className="h-7 w-7 text-[#71717A]" />
            </div>
            <h2 className="text-xl font-semibold text-[#18181B]">
              No presentations yet
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#71717A]">
              Upload a PPTX to create your first narrated presentation.
            </p>
            <button
              type="button"
              onClick={() => setShowCreatePresentation(true)}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#71717A] transition-colors duration-150 hover:text-[#18181B]"
            >
              <Plus className="h-4 w-4" />
              Create your first presentation
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 px-6 py-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {presentations.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/dashboard/projects/${params.id}/presentations/${p.id}`)}
                className="group relative cursor-pointer rounded-xl border border-zinc-200 bg-white p-4 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                    <Presentation className="h-5 w-5 text-zinc-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-[#18181B]">
                      {p.title}
                    </h3>
                    <p className="text-xs text-[#71717A]">
                      {p.status === "archived" ? "Archived" : p.status === "ready" ? "Ready" : "Draft"}
                      {" · "}{formatDate(p.created_at)}
                    </p>
                  </div>
                  <PresentationCardActions
                    presentation={p}
                    onRename={() => setRenameTarget(p)}
                    onArchive={() => handleArchive(p)}
                    onRestore={() => handleRestore(p)}
                    onDelete={() => setDeleteTarget(p)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreatePresentation && (
        <CreatePresentationDialog
          projectId={params.id}
          onClose={() => setShowCreatePresentation(false)}
        />
      )}

      {showEdit && project && (
        <RenameProjectModal
          project={project}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false)
            const supabase = createClient()
            supabase
              .from("projects")
              .select("*")
              .eq("id", params.id)
              .single()
              .then(({ data }) => {
                if (data) setProject(data)
              })
          }}
        />
      )}

      {renameTarget && (
        <RenamePresentationDialog
          presentation={renameTarget}
          onClose={() => setRenameTarget(null)}
          onSaved={() => {
            setRenameTarget(null)
            fetchData()
          }}
        />
      )}

      {deleteTarget && (
        <DeletePresentationDialog
          presentation={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null)
            fetchData()
          }}
        />
      )}
    </>
  )
}
