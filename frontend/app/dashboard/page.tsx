"use client"

import { useEffect, useState } from "react"
import { Plus, FolderKanban, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Project } from "@/lib/validations/project"
import dynamic from "next/dynamic"
import { ProjectCard } from "@/components/dashboard/ProjectCard"

const CreateProjectModal = dynamic(() => import("@/components/dashboard/CreateProjectModal").then(mod => mod.CreateProjectModal), { ssr: false })

type DashboardState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "ready"; projects: Project[] }

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState>({ status: "loading" })
  const [showCreate, setShowCreate] = useState(false)

  async function loadProjects() {
    setState({ status: "loading" })
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setState({ status: "empty" })
        return
      }

      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (data && data.length > 0) {
        setState({ status: "ready", projects: data as Project[] })
      } else {
        setState({ status: "empty" })
      }
    } catch {
      setState({ status: "empty" })
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  if (state.status === "loading") {
    return (
      <div className="flex-1 px-6 py-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-200 bg-white">
              <div className="h-1 rounded-t-xl bg-zinc-100" />
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-zinc-100 animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-4 w-28 rounded bg-zinc-100 animate-pulse" />
                      <div className="h-3 w-20 rounded bg-zinc-100 animate-pulse" />
                    </div>
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-zinc-100 animate-pulse" />
                </div>
                <div className="mt-3 h-4 w-24 rounded bg-zinc-100 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
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

      {state.status === "empty" ? (
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
            {state.projects.map((project) => (
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
