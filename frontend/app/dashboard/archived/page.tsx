"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import {
  Archive,
  FileText,
  Presentation,
  RotateCcw,
  ChevronRight,
  FolderKanban,
  Loader2,
} from "lucide-react"

type ArchivedPresentation = {
  id: string
  project_id: string
  title: string
  status: string
  created_at: string
  updated_at: string
}

export default function ArchivedPage() {
  const router = useRouter()
  const [presentations, setPresentations] = useState<ArchivedPresentation[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<Set<string>>(new Set())

  const fetchArchived = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from("presentations")
        .select("id, project_id, title, status, created_at, updated_at")
        .eq("user_id", user.id)
        .eq("status", "archived")
        .order("updated_at", { ascending: false })

      setPresentations((data ?? []) as ArchivedPresentation[])
    } catch {
      // Data fetch failed — empty state shows
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchArchived() }, [fetchArchived])

  async function handleRestore(id: string) {
    setRestoring((prev) => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/presentations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      })
      if (res.ok) {
        setPresentations((prev) => prev.filter((p) => p.id !== id))
      }
    } catch { toast.error("Failed to restore presentation") }
    setRestoring((prev) => { const next = new Set(prev); next.delete(id); return next })
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col px-6 py-6">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-zinc-100 animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-24 rounded bg-zinc-100 animate-pulse" />
              <div className="h-4 w-36 rounded bg-zinc-100 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3">
                <div className="h-10 w-10 rounded-lg bg-zinc-100 animate-pulse" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-zinc-100 animate-pulse" />
                  <div className="h-3 w-32 rounded bg-zinc-100 animate-pulse" />
                </div>
                <div className="h-8 w-20 rounded-lg bg-zinc-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

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
          <span className="font-medium text-[#18181B]">Archived</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <Archive className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#18181B]">Archived</h1>
              <p className="text-sm text-[#71717A]">
                {presentations.length}{" "}
                {presentations.length === 1 ? "presentation" : "presentations"} archived
              </p>
            </div>
          </div>

          {presentations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
                <Archive className="h-7 w-7 text-[#71717A]" />
              </div>
              <h2 className="text-lg font-semibold text-[#18181B]">No archived presentations</h2>
              <p className="mt-1 text-sm text-[#71717A]">
                Archive a presentation to keep it without deleting it.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {presentations.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                    <Presentation className="h-5 w-5 text-zinc-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => {
                        // Navigate to the project page — we need the project_id
                        router.push(`/dashboard/projects/${p.project_id}/presentations/${p.id}`)
                      }}
                      className="truncate text-sm font-semibold text-[#18181B] transition-colors hover:text-blue-600 text-left"
                    >
                      {p.title}
                    </button>
                    <p className="text-xs text-[#71717A]">
                      Archived ·{" "}
                      {new Date(p.updated_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestore(p.id)}
                    disabled={restoring.has(p.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-[#18181B] transition-colors hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {restoring.has(p.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
