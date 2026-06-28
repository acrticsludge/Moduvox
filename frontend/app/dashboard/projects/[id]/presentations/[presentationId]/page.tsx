"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import { ChevronRight, Presentation } from "lucide-react"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import type { Presentation as PresentationType } from "@/lib/validations/presentation"
import { CreatePageSidebar } from "@/components/dashboard/CreatePageSidebar"
import { PptxUploadZone } from "@/components/dashboard/PptxUploadZone"
import { SlideEditor } from "@/components/dashboard/SlideEditor"

type EditorState = {
  selectedVoiceId?: string
  controlInstructions?: string
  ultimateMode?: boolean
  currentSlide?: number
  narrations?: Record<number, string>
  audioGenerated?: boolean
  storagePath?: string
}

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
  const [projectName, setProjectName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<"upload" | "editor">("upload")
  const [selectedVoiceId, setSelectedVoiceId] = useState("")
  const [controlInstructions, setControlInstructions] = useState("")
  const [ultimateMode, setUltimateMode] = useState(false)
  const [narrations, setNarrations] = useState<Record<number, string>>({})
  const [audioGenerated, setAudioGenerated] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [storagePath, setStoragePath] = useState("")
  const [currentSlide, setCurrentSlide] = useState(0)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleFileAccepted(file: File) {
    setUploadedFile(file)
    setMode("editor")
  }

  function handleStoragePathChange(path: string) {
    setStoragePath(path)
  }

  // Load editor state from presentation DB record
  useEffect(() => {
    const supabase = createClient()

    Promise.all([
      supabase.from("presentations").select("*").eq("id", params.presentationId).single(),
      supabase.from("projects").select("name").eq("id", params.id).single(),
    ]).then(([presRes, projRes]) => {
      if (presRes.error) {
        setError("Failed to load presentation")
      } else {
        const p = presRes.data as PresentationType & { editor_state?: EditorState }
        setPresentation(p)
        if (projRes.data) setProjectName((projRes.data as { name: string }).name)

        // Restore saved editor state
        const saved = p.editor_state
        if (saved) {
          if (saved.selectedVoiceId) setSelectedVoiceId(saved.selectedVoiceId)
          if (saved.controlInstructions) setControlInstructions(saved.controlInstructions)
          if (saved.ultimateMode !== undefined) setUltimateMode(saved.ultimateMode)
          if (saved.narrations) setNarrations(saved.narrations)
          if (saved.audioGenerated) setAudioGenerated(saved.audioGenerated)
          if (saved.storagePath) {
            setStoragePath(saved.storagePath)
            setMode("editor")
          }
          if (saved.currentSlide !== undefined) setCurrentSlide(saved.currentSlide)
        }
      }
      setLoading(false)
    })
  }, [params.presentationId, params.id])

  // Auto-save with 2s debounce
  const saveState = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const state: EditorState = {
        selectedVoiceId,
        controlInstructions,
        ultimateMode,
        narrations,
        audioGenerated,
        storagePath,
        currentSlide,
      }
      fetch(`/api/presentations/${params.presentationId}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      })
        .then((res) => {
          if (res.ok) toast.success("Changes saved", { id: "editor-save" })
        })
        .catch(() => {})
    }, 2000)
  }, [selectedVoiceId, controlInstructions, ultimateMode, narrations, audioGenerated, storagePath, currentSlide, params.presentationId])

  // Trigger auto-save when any editor state changes
  useEffect(() => {
    if (loading) return
    saveState()
  }, [saveState, loading])

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
      {/* Sidebar */}
      <CreatePageSidebar
        className="absolute bottom-0 left-0 top-0 z-30"
        selectedVoiceId={selectedVoiceId}
        onVoiceChange={setSelectedVoiceId}
        controlInstructions={controlInstructions}
        onControlInstructionsChange={setControlInstructions}
        ultimateMode={ultimateMode}
        onUltimateModeChange={setUltimateMode}
      />

      {/* Content */}
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
              {projectName || "Project"}
            </a>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
            <span className="font-medium text-[#18181B]">{presentation.title}</span>
          </div>
        </div>

        {/* Content */}
        {mode === "upload" ? (
          <PptxUploadZone onFileAccepted={handleFileAccepted} />
        ) : (
          <SlideEditor
            voiceSelected={!!selectedVoiceId}
            file={uploadedFile}
            presentationId={params.presentationId}
            narrations={narrations}
            onNarrationsChange={setNarrations}
            audioGenerated={audioGenerated}
            onAudioGeneratedChange={setAudioGenerated}
            storagePath={storagePath}
            onStoragePathChange={handleStoragePathChange}
            currentSlide={currentSlide}
            onCurrentSlideChange={setCurrentSlide}
          />
        )}
      </div>
    </>
  )
}
