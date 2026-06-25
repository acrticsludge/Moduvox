"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ChevronRight, FileText, Presentation } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Presentation as PresentationType } from "@/lib/validations/presentation"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function PresentationDetailPage() {
  const params = useParams<{ id: string }>()
  const [presentation, setPresentation] = useState<PresentationType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const supabase = createClient()

    supabase
      .from("presentations")
      .select("*")
      .eq("id", params.id)
      .single()
      .then(({ data, error: err }) => {
        if (err) {
          setError("Failed to load presentation")
        } else {
          setPresentation(data as PresentationType | null)
        }
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

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  if (!presentation) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <p className="text-sm text-[#71717A]">Presentation not found</p>
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
          <a
            href={`/dashboard/projects/${presentation.project_id}`}
            className="font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
          >
            Project
          </a>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          <span className="font-medium text-[#18181B]">{presentation.title}</span>
        </div>
      </div>

      {/* Presentation info */}
      <div className="border-b border-[var(--color-border-faint)] px-6 py-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
            <Presentation className="h-7 w-7 text-zinc-700" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#18181B]">{presentation.title}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-[#71717A]">
              <span className="capitalize">{presentation.status}</span>
              <span className="text-zinc-300">·</span>
              <span>Created {formatDate(presentation.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Empty editor state */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100">
            <FileText className="h-7 w-7 text-[#71717A]" />
          </div>
          <h2 className="text-xl font-semibold text-[#18181B]">
            Ready for slides
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#71717A]">
            Upload a PPTX file to start building your narrated presentation.
          </p>
        </div>
      </div>
    </>
  )
}
