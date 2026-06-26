"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ChevronRight, Presentation } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Presentation as PresentationType } from "@/lib/validations/presentation"
import { CreatePageSidebar } from "@/components/dashboard/CreatePageSidebar"
import { PptxUploadZone } from "@/components/dashboard/PptxUploadZone"
import { SlideEditor } from "@/components/dashboard/SlideEditor"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function PresentationCreatePage() {
  const params = useParams<{ id: string; presentationId: string }>()
  const [presentation, setPresentation] = useState<PresentationType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<"upload" | "editor">("upload")
  const [selectedVoiceId, setSelectedVoiceId] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  function handleFileAccepted(file: File) {
    setUploadedFile(file)
    setMode("editor")
  }

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("presentations")
      .select("*")
      .eq("id", params.presentationId)
      .single()
      .then(({ data, error: err }) => {
        if (err) {
          setError("Failed to load presentation")
        } else {
          setPresentation(data as PresentationType | null)
        }
        setLoading(false)
      })
  }, [params.presentationId])

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
      {/* Sidebar — absolute within main, spans from below navbar to above footer */}
      <CreatePageSidebar
        className="absolute bottom-0 left-0 top-0 z-30"
        selectedVoiceId={selectedVoiceId}
        onVoiceChange={setSelectedVoiceId}
      />

      {/* Content offset by sidebar width */}
      <div className="ml-80 flex flex-1 flex-col">
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

        {/* Content — upload zone or editor */}
        {mode === "upload" ? (
          <PptxUploadZone onFileAccepted={handleFileAccepted} />
        ) : (
          <SlideEditor voiceSelected={!!selectedVoiceId} file={uploadedFile} />
        )}
      </div>
    </>
  )
}
