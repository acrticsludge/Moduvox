"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronRight, MoreHorizontal, Trash2, Pencil, Archive, RotateCcw, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import type { Presentation as PresentationType } from "@/lib/validations/presentation"
import { CreatePageSidebar } from "@/components/dashboard/CreatePageSidebar"
import { PptxUploadZone } from "@/components/dashboard/PptxUploadZone"
import { SlideEditor } from "@/components/dashboard/SlideEditor"
import dynamic from "next/dynamic"
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary"

const DeletePresentationDialog = dynamic(() => import("@/components/dashboard/DeletePresentationDialog").then(mod => mod.DeletePresentationDialog), { ssr: false })
const RenamePresentationDialog = dynamic(() => import("@/components/dashboard/RenamePresentationDialog").then(mod => mod.RenamePresentationDialog), { ssr: false })
const ConfirmArchiveDialog = dynamic(() => import("@/components/dashboard/ConfirmArchiveDialog").then(mod => mod.ConfirmArchiveDialog), { ssr: false })

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
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
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
  const [dirty, setDirty] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleFileAccepted(file: File) {
    setUploadedFile(file)
    setMode("editor")
  }

  function handleVoiceChange(id: string) { setSelectedVoiceId(id); setDirty(true) }
  function handleControlInstructionsChange(v: string) { setControlInstructions(v); setDirty(true) }
  function handleUltimateModeChange(v: boolean) { setUltimateMode(v); setDirty(true) }
  function handleNarrationsChange(n: Record<number, string>) { setNarrations(n); setDirty(true) }

  async function handleArchive() {
    try {
      const res = await fetch(`/api/presentations/${params.presentationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      })
      if (!res.ok) throw new Error()
      setShowArchiveConfirm(false)
      toast.success("Presentation archived")
      router.push(`/dashboard/projects/${params.id}`)
    } catch {
      toast.error("Failed to archive presentation")
    }
  }

  async function handleRestore() {
    setRestoring(true)
    try {
      const res = await fetch(`/api/presentations/${params.presentationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error()
      if (json.data) setPresentation(json.data)
      toast.success("Presentation restored")
    } catch {
      toast.error("Failed to restore presentation")
    } finally {
      setRestoring(false)
    }
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
          if (saved.audioGenerated) {
            // The combine endpoint reads all per-slide WAVs on demand
            setAudioUrl(`/api/presentations/${params.presentationId}/audio/combined`)
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
          if (res.ok) { setSaveStatus("saved"); setDirty(false); toast.success("Changes saved", { id: "editor-save" }) }
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

  // Warn on navigate away with unsaved changes
  useEffect(() => {
    if (!dirty) return
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [dirty])

  if (loading) {
    return (
      <>
        <div className="absolute bottom-0 left-0 top-0 z-30 w-80 animate-pulse border-r border-[var(--color-border-faint)] bg-white p-5">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-4 w-12 rounded bg-zinc-200" />
              <div className="h-9 w-full rounded-lg bg-zinc-100" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-zinc-200" />
              <div className="h-[100px] w-full rounded-lg bg-zinc-100" />
            </div>
          </div>
        </div>
        <div className="ml-80 mr-[380px] flex flex-1 flex-col">
          <div className="flex animate-pulse items-center justify-between border-b border-[var(--color-border-faint)] bg-white px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-20 rounded bg-zinc-200" />
              <div className="h-3.5 w-3.5 rounded bg-zinc-200" />
              <div className="h-4 w-24 rounded bg-zinc-200" />
              <div className="h-3.5 w-3.5 rounded bg-zinc-200" />
              <div className="h-4 w-28 rounded bg-zinc-200" />
            </div>
          </div>
          <div className="flex flex-1 animate-pulse items-center justify-center bg-zinc-100">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          </div>
        </div>
        <div className="absolute bottom-0 right-0 top-0 z-20 w-[380px] animate-pulse border-l border-[var(--color-border-faint)] bg-white p-6">
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-10 rounded bg-zinc-200" />
                <div className="h-6 w-12 rounded border border-zinc-200 bg-zinc-50" />
                <div className="h-4 w-16 rounded bg-zinc-200" />
              </div>
              <div className="flex gap-1">
                <div className="h-7 w-7 rounded bg-zinc-100" />
                <div className="h-7 w-7 rounded bg-zinc-100" />
              </div>
            </div>
            <div className="h-10 w-full rounded-lg bg-zinc-100" />
            <div className="space-y-2">
              <div className="h-4 w-28 rounded bg-zinc-200" />
              <div className="h-[120px] w-full rounded-lg bg-zinc-100" />
            </div>
            <div className="h-9 w-full rounded-lg bg-zinc-100" />
          </div>
        </div>
      </>
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
        onVoiceChange={handleVoiceChange}
        controlInstructions={controlInstructions}
        onControlInstructionsChange={handleControlInstructionsChange}
        ultimateMode={ultimateMode}
        onUltimateModeChange={handleUltimateModeChange}
      />

      {/* Content */}
      <div className="ml-80 mr-[380px] flex flex-1 flex-col">
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
              {presentation?.status === "archived" ? (
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={restoring}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-zinc-100 hover:text-[#18181B] disabled:opacity-40"
                  aria-label="Restore"
                >
                  {restoring ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowArchiveConfirm(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-zinc-100 hover:text-[#18181B]"
                  aria-label="Archive"
                >
                  <Archive className="h-4 w-4" />
                </button>
              )}
              {presentation?.status !== "archived" && (
                <button
                  type="button"
                  onClick={() => setShowDelete(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {presentation?.status === "archived" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
            <div className="mx-auto max-w-md rounded-lg border border-amber-200 bg-amber-50 px-6 py-5 text-center">
              <h3 className="text-sm font-semibold text-amber-800">Presentation Archived</h3>
              <p className="mt-1 text-sm text-amber-700">
                This presentation is archived. Restore it to make changes.
              </p>
              <button
                type="button"
                onClick={handleRestore}
                disabled={restoring}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#27272A] disabled:opacity-50"
              >
                {restoring ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                {restoring ? "Restoring..." : "Restore Presentation"}
              </button>
            </div>
          </div>
        ) : mode === "upload" ? (
          <PptxUploadZone onFileAccepted={handleFileAccepted} />
        ) : (
          <ErrorBoundary>
            <SlideEditor
              voiceSelected={!!selectedVoiceId}
              file={uploadedFile}
              presentationId={params.presentationId}
              narrations={narrations}
              onNarrationsChange={handleNarrationsChange}
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
              selectedVoiceId={selectedVoiceId || null}
              voiceDescription={controlInstructions}
              ultimateMode={ultimateMode}
              audioUrl={audioUrl}
              onAudioUrlChange={setAudioUrl}
              audioStoragePath={audioStoragePath}
              onAudioStoragePathChange={setAudioStoragePath}
              onRemovePpt={() => { setMode("upload"); setStoragePath(""); setAudioUrl(null); setAudioStoragePath(null) }}
            />
          </ErrorBoundary>
        )}
      </div>

      {showArchiveConfirm && presentation && (
        <ConfirmArchiveDialog
          presentation={presentation}
          onClose={() => setShowArchiveConfirm(false)}
          onArchive={handleArchive}
        />
      )}

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
