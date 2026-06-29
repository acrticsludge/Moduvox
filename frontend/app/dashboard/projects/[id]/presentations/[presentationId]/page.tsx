"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronRight, MoreHorizontal, Trash2, Pencil } from "lucide-react"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import type { Presentation as PresentationType } from "@/lib/validations/presentation"
import { CreatePageSidebar } from "@/components/dashboard/CreatePageSidebar"
import { PptxUploadZone } from "@/components/dashboard/PptxUploadZone"
import { SlideEditor } from "@/components/dashboard/SlideEditor"
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary"
import { DeletePresentationDialog } from "@/components/dashboard/DeletePresentationDialog"
import { RenamePresentationDialog } from "@/components/dashboard/RenamePresentationDialog"

type EditorState = {
  selectedVoiceId?: string
  controlInstructions?: string
  ultimateMode?: boolean
  currentSlide?: number
  narrations?: Record<number, string>
  audioGenerated?: boolean
  audioStoragePath?: string
  storagePath?: string
  slideData?: { title: string; bullets: string[] }[]
  changedSlides?: number[]
  slideCount?: number
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
  const router = useRouter()
  const [presentation, setPresentation] = useState<PresentationType | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<"upload" | "editor">("upload")
  const [selectedVoiceId, setSelectedVoiceId] = useState("")
  const [controlInstructions, setControlInstructions] = useState("")
  const [ultimateMode, setUltimateMode] = useState(false)
  const [narrations, setNarrations] = useState<Record<number, string>>({})
  const [audioGenerated, setAudioGenerated] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioStoragePath, setAudioStoragePath] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [storagePath, setStoragePath] = useState("")
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slideData, setSlideData] = useState<{ title: string; bullets: string[] }[]>([])
  const [changedSlides, setChangedSlides] = useState<number[]>([])
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleFileAccepted(file: File) {
    setUploadedFile(file)
    setMode("editor")
  }

  function handleChangedSlidesChange(slides: number[]) {
    setChangedSlides(slides)
    // Immediately persist changedSlides so it survives page reload
    fetch(`/api/presentations/${params.presentationId}/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changedSlides: slides.length > 0 ? slides : undefined }),
    }).catch(() => {})
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
          if (saved.audioStoragePath) {
            setAudioStoragePath(saved.audioStoragePath)
            // Fetch a fresh signed URL for the saved audio
            fetch(`/api/presentations/${params.presentationId}/audio`).then(async (res) => {
              const json = await res.json()
              if (json.data?.audioUrl) setAudioUrl(json.data.audioUrl)
            }).catch(() => {})
          }
          if (saved.currentSlide !== undefined) setCurrentSlide(saved.currentSlide)
          if (saved.slideData) setSlideData(saved.slideData)
          if (saved.changedSlides) setChangedSlides(saved.changedSlides)
        }
      }
      setLoading(false)
    })
  }, [params.presentationId, params.id])

  // Auto-save with 2s debounce
  const saveState = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus("saving")
    saveTimer.current = setTimeout(() => {
      const state: EditorState = {
        selectedVoiceId,
        controlInstructions,
        ultimateMode,
        narrations,
        audioGenerated,
        audioStoragePath: audioStoragePath ?? undefined,
        storagePath,
        currentSlide,
        slideData,
        changedSlides: changedSlides.length > 0 ? changedSlides : undefined,
        slideCount: slideData.length > 0 ? slideData.length : undefined,
      }
      fetch(`/api/presentations/${params.presentationId}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      })
        .then((res) => {
          if (res.ok) { setSaveStatus("saved"); toast.success("Changes saved", { id: "editor-save" }) }
          else { setSaveStatus("error"); toast.error("Failed to save changes", { id: "editor-save" }) }
        })
        .catch(() => { setSaveStatus("error"); toast.error("Failed to save changes", { id: "editor-save" }) })
    }, 2000)
  }, [selectedVoiceId, controlInstructions, ultimateMode, narrations, audioGenerated, storagePath, currentSlide, slideData, changedSlides, params.presentationId])

  // Trigger auto-save when any editor state changes
  useEffect(() => {
    if (loading) return
    saveState()
  }, [saveState, loading])

  // Warn on navigate away with unsaved narration edits
  useEffect(() => {
    const hasContent = Object.keys(narrations).length > 0
    if (!hasContent) return
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [narrations])

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
          <div className="flex items-center gap-2">
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                Saving…
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1.5 text-xs text-green-600">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Saved
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1.5 text-xs text-red-500">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Save failed
              </span>
            )}

            {/* Action buttons */}
            <div className="ml-4 flex items-center gap-1 border-l border-zinc-200 pl-4">
              <button
                type="button"
                onClick={() => setShowRename(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-zinc-100 hover:text-[#18181B]"
                aria-label="Rename"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {mode === "upload" ? (
          <PptxUploadZone onFileAccepted={handleFileAccepted} />
        ) : (
          <ErrorBoundary>
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
              slideData={slideData}
              onSlideDataChange={setSlideData}
              changedSlides={changedSlides}
              onChangedSlidesChange={handleChangedSlidesChange}
              voiceDescription={controlInstructions}
              audioUrl={audioUrl}
              onAudioUrlChange={setAudioUrl}
              audioStoragePath={audioStoragePath}
              onAudioStoragePathChange={setAudioStoragePath}
              onRemovePpt={() => { setMode("upload"); setStoragePath(""); setAudioUrl(null); setAudioStoragePath(null) }}
            />
          </ErrorBoundary>
        )}
      </div>

      {showRename && presentation && (
        <RenamePresentationDialog
          presentation={presentation}
          onClose={() => setShowRename(false)}
          onSaved={(updated) => {
            setPresentation(updated)
            setShowRename(false)
          }}
        />
      )}

      {showDelete && presentation && (
        <DeletePresentationDialog
          presentation={presentation}
          onClose={() => setShowDelete(false)}
          onDeleted={() => {
            router.push(`/dashboard/projects/${params.id}`)
            toast.success("Presentation deleted")
          }}
        />
      )}
    </>
  )
}
