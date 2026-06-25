"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Plus, ChevronRight, FileText, Pencil, FolderKanban, BookOpen, GraduationCap, Shield, Presentation, Notebook, ClipboardList } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Project } from "@/lib/validations/project"
import { RenameProjectModal } from "@/components/dashboard/RenameProjectModal"

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
  const params = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    supabase
      .from("projects")
      .select("*")
      .eq("id", params.id)
      .single()
      .then(({ data }) => {
        setProject(data)
        setLoading(false)
      })
  }, [params.id])

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
          disabled
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
                <span>0 presentations</span>
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

      {/* Empty state */}
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
            disabled
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#71717A] transition-colors duration-150 hover:text-[#18181B]"
          >
            <Plus className="h-4 w-4" />
            Create your first presentation
          </button>
        </div>
      </div>

      {showEdit && project && (
        <RenameProjectModal
          project={project}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false)
            // Re-fetch project to show updated name/description/color/icon
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
    </>
  )
}
