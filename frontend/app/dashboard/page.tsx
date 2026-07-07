"use client"

import { useEffect, useState } from "react"
import { Plus, FolderKanban, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Project } from "@/lib/validations/project"
import dynamic from "next/dynamic"
import { ProjectCard } from "@/components/dashboard/ProjectCard"

const CreateProjectModal = dynamic(() => import("@/components/dashboard/CreateProjectModal").then(mod => mod.CreateProjectModal), { ssr: false })

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  async function loadProjects() {
    setLoading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (data) {
      setProjects(data as Project[])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadProjects()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-[var(--color-border-faint)] bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-[#18181B]">All Projects</h1>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#71717A] transition-colors duration-150 hover:text-[#18181B]"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="mx-auto max-w-sm text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100">
              <FolderKanban className="h-7 w-7 text-[#71717A]" />
            </div>
            <h2 className="text-xl font-semibold text-[#18181B]">
              No projects yet
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#71717A]">
              Create a project to organize your narrated presentations.
            </p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#71717A] transition-colors duration-150 hover:text-[#18181B]"
            >
              <Plus className="h-4 w-4" />
              Create your first project
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 px-6 py-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            loadProjects()
          }}
        />
      )}
    </>
  )
}
