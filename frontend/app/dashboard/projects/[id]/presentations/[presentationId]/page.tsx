"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronRight, Trash2, Pencil, Archive, RotateCcw, Loader2 } from "lucide-react"
import { toastSuccess, toastError } from "@/components/ui/CustomToast"
import { createClient } from "@/lib/supabase/client"
import type { SlideImage, SlideComment } from "@/lib/pptx-renderer"
import { parsePptxText } from "@/lib/pptx-renderer"
import type { Presentation as PresentationType } from "@/lib/validations/presentation"
import { CreatePageSidebar } from "@/components/dashboard/CreatePageSidebar"
import { MobileActionDock } from "@/components/dashboard/MobileActionDock"
import { useSidebar } from "@/app/dashboard/layout"
import { PptxUploadZone } from "@/components/dashboard/PptxUploadZone"
import { SlideEditor } from "@/components/dashboard/SlideEditor"
import dynamic from "next/dynamic"
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary"
import { Skeleton } from "@/components/ui/skeleton"

const DeletePresentationDialog = dynamic(() => import("@/components/dashboard/DeletePresentationDialog").then(mod => mod.DeletePresentationDialog), { ssr: false })
const RenamePresentationDialog = dynamic(() => import("@/components/dashboard/RenamePresentationDialog").then(mod => mod.RenamePresentationDialog), { ssr: false })
const ConfirmArchiveDialog = dynamic(() => import("@/components/dashboard/ConfirmArchiveDialog").then(mod => mod.ConfirmArchiveDialog), { ssr: false })

type ImageDesc = { index: number; description: string; error?: string }
type SlideDataItem = {
  number?: number
  title: string
  bullets: string[]
  notes?: string | null
  comments?: SlideComment[]
  images?: SlideImage[]
  rawText?: string
}

type EditorState = {
  parsedImageKeys?: Record<string, string>
  selectedVoiceId?: string
  controlInstructions?: string
  ultimateMode?: boolean
  narrations?: Record<number, string>
  audioGenerated?: boolean
  audioStoragePath?: string
  storagePath?: string
  currentSlide?: number
  slideData?: SlideDataItem[]
  changedSlides?: number[]
  slideCount?: number
  imageDescriptions?: Record<number, ImageDesc[]>
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
  const [parsedImageKeys, setParsedImageKeys] = useState<Record<string, string>>({})
  const [slideData, setSlideData] = useState<SlideDataItem[]>([])
  const [changedSlides, setChangedSlides] = useState<number[]>([])
  const [imageDescriptions, setImageDescriptions] = useState<Record<number, ImageDesc[]>>({})
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [dirty, setDirty] = useState(false)
  // Ref to avoid stale closure in handleChangedSlidesChange (narrations setState is async)
  const narrationsRef = useRef<Record<number, string>>({})
  useEffect(() => { narrationsRef.current = narrations }, [narrations])
  const [restoring, setRestoring] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const sidebar = useSidebar()

  useEffect(() => {
    if (!mobileSidebarOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileSidebarOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [mobileSidebarOpen])

  useEffect(() => {
    if (!mobileSidebarOpen) return
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [mobileSidebarOpen])

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
      toastSuccess("Presentation archived")
      router.push(`/dashboard/projects/${params.id}`)
    } catch {
      toastError("Failed to archive presentation")
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
      toastSuccess("Presentation restored")
    } catch {
      toastError("Failed to restore presentation")
    } finally {
      setRestoring(false)
    }
  }

  function handleChangedSlidesChange(slides: number[]) {
    setChangedSlides(slides)
    // Save full editor state immediately — sending only changedSlides would overwrite
    // and destroy all other fields (storagePath, slideData, narrations, etc.)
    const state: EditorState = {
      selectedVoiceId,
      controlInstructions,
      ultimateMode,
      narrations: narrationsRef.current,
      audioGenerated,
        audioStoragePath: audioStoragePath ?? undefined,
        storagePath,
        currentSlide,
        // Always include every field — never drop empty values to undefined.
        // The PATCH endpoint replaces the entire JSONB column, so dropping a
        // field permanently deletes it from the database.
        slideData,
        changedSlides: slides,
        slideCount: slideData.length,
        imageDescriptions,
        parsedImageKeys,
      }
    fetch(`/api/presentations/${params.presentationId}/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    }).catch(() => {})
  }

  const handleImageDescriptionsChange = useCallback((v: Record<number, ImageDesc[]>) => {
    setImageDescriptions((prev) => ({ ...prev, ...v }))
    setDirty(true)
  }, [])

  const handleResetImageDescriptions = useCallback(() => {
    setImageDescriptions({})
  }, [])

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
          } else if (typeof saved.storagePath === "string") {
            // storagePath exists but is empty string — still valid, treat as editor
            setStoragePath(saved.storagePath)
            setMode("editor")
          } else if ((p.slide_count ?? 0) > 0) {
            // Recovery: editor_state.storagePath was lost (e.g. corrupted by a prior
            // save bug) but the presentation still has per-slide PDFs in R2. Reconstruct
            // the conventional R2 key so processFile can poll for existing PDFs.
            console.log("[Recovery] storagePath missing but slide_count=", p.slide_count, "recovering editor")
            const recoveredPath = `${p.user_id}/${params.presentationId}.pptx`
            setStoragePath(recoveredPath)
            setMode("editor")
            // If slideData was also lost, re-download the original PPTX from R2
            // and re-parse it to recover text content.
            if (!saved.slideData?.length) {
              console.log("[Recovery] slideData also missing — re-downloading PPTX from R2 for", p.slide_count, "slides")
              fetch(`/api/presentations/${params.presentationId}/file`)
                .then(async (res) => {
                  const json = await res.json()
                  if (!json.data?.url) { console.warn("[Recovery] No PPTX download URL returned"); return }
                  const pptxRes = await fetch(json.data.url)
                  if (!pptxRes.ok) { console.warn("[Recovery] PPTX download failed"); return }
                  const blob = await pptxRes.blob()
                  const file = new File([blob], "presentation.pptx", {
                    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                  })
                  const parsed = await parsePptxText(file)
                  if (!parsed.length) { console.warn("[Recovery] Parsed 0 slides from PPTX"); return }
                  const data: SlideDataItem[] = parsed.map((s) => ({
                    number: s.number,
                    title: s.title,
                    bullets: s.bullets,
                    notes: s.notes ?? null,
                    comments: s.comments ?? [],
                    rawText: s.rawText || s.title + (s.bullets.length > 0 ? "\n" + s.bullets.join("\n") : ""),
                  }))
                  console.log("[Recovery] Re-parsed", data.length, "slides from PPTX")
                  setSlideData(data)
                })
                .catch((err) => console.warn("[Recovery] PPTX re-parse failed:", err))
            } else {
              console.log("[Recovery] slideData exists with", saved.slideData.length, "entries — reusing")
            }
          }
          if (saved.audioGenerated) {
            // The combine endpoint reads all per-slide WAVs on demand
            setAudioUrl(`/api/presentations/${params.presentationId}/audio/combined`)
          }
          if (saved.audioStoragePath) setAudioStoragePath(saved.audioStoragePath)
          if (saved.currentSlide !== undefined) setCurrentSlide(saved.currentSlide)
          if (saved.slideData?.length) setSlideData(saved.slideData)
          if (saved.changedSlides) setChangedSlides(saved.changedSlides)
          if (saved.imageDescriptions) setImageDescriptions(saved.imageDescriptions)
          if (saved.parsedImageKeys) setParsedImageKeys(saved.parsedImageKeys)
        }
      }
      setLoading(false)
    }).catch(() => {
      setError("Failed to load presentation")
      setLoading(false)
    })
  }, [params.presentationId, params.id])

  const persistState = useCallback((fresh?: { parsedImageKeys?: Record<string, string>; imageDescriptions?: Record<number, ImageDesc[]> }) => {
    const state: EditorState = {
      selectedVoiceId,
      controlInstructions,
      ultimateMode,
      narrations,
      audioGenerated,
      audioStoragePath: audioStoragePath ?? undefined,
      storagePath,
      currentSlide,
      // Always include every field — never drop empty values to undefined.
      // The PATCH endpoint replaces the entire JSONB column, so dropping a
      // field permanently deletes it from the database.
      slideData,
      changedSlides,
      slideCount: slideData.length,
      imageDescriptions: fresh?.imageDescriptions ?? imageDescriptions,
      parsedImageKeys: fresh?.parsedImageKeys ?? parsedImageKeys,
    }
    return fetch(`/api/presentations/${params.presentationId}/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    })
      .then((res) => {
        if (res.ok) { setSaveStatus("saved"); setDirty(false); toastSuccess("Changes saved", { id: "editor-save" }) }
        else { setSaveStatus("error"); toastError("Failed to save changes", { id: "editor-save" }) }
      })
      .catch(() => { setSaveStatus("error"); toastError("Failed to save changes", { id: "editor-save" }) })
  }, [selectedVoiceId, controlInstructions, ultimateMode, narrations, audioGenerated, audioStoragePath, storagePath, currentSlide, slideData, changedSlides, imageDescriptions, parsedImageKeys, params.presentationId])

  // Debounced save (2s) for normal edits.
  const saveState = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus("saving")
    saveTimer.current = setTimeout(() => persistState(), 2000)
  }, [persistState])

  // Immediate save — used when parsed image keys/descriptions land so refresh never loses them.
  const handleRequestPersist = useCallback((fresh?: { parsedImageKeys?: Record<string, string>; imageDescriptions?: Record<number, ImageDesc[]> }) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    persistState(fresh)
  }, [persistState])

  // Trigger auto-save when any editor state changes
  useEffect(() => {
    if (loading) return
    const timer = window.setTimeout(() => saveState(), 0)
    return () => window.clearTimeout(timer)
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
        <div className="hidden md:block">
          <div className="absolute bottom-0 left-0 top-0 z-30 w-80 border-r border-[var(--color-border-faint)] bg-white p-5">
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-[100px] w-full" />
              </div>
            </div>
          </div>
        </div>
      <div className="ml-0 mr-0 flex min-w-0 flex-1 flex-col md:ml-80 lg:mr-[380px]">
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border-faint)] bg-white px-4 py-3 md:flex-nowrap md:px-6 md:py-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3.5 w-3.5" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3.5 w-3.5" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center bg-zinc-100">
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <div className="hidden md:block">
          <div className="absolute bottom-0 right-0 top-0 z-20 w-[380px] border-l border-[var(--color-border-faint)] bg-white p-6">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <div className="flex gap-1">
                  <Skeleton className="h-7 w-7" />
                  <Skeleton className="h-7 w-7" />
                </div>
              </div>
              <Skeleton className="h-10 w-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-[120px] w-full" />
              </div>
              <Skeleton className="h-9 w-full" />
            </div>
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
      {/* Mobile sidebar drawer */}
      <div className={`fixed inset-0 z-50 md:hidden ${mobileSidebarOpen ? "" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${mobileSidebarOpen ? "bg-black/40 opacity-100" : "bg-black/40 opacity-0"}`}
          onClick={() => setMobileSidebarOpen(false)}
        />
        <div className={`absolute bottom-0 left-0 right-0 z-10 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-zinc-200 bg-white shadow-xl transition-transform duration-300 ${mobileSidebarOpen ? "translate-y-0 visible" : "translate-y-full invisible"}`}>
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
            <span className="text-sm font-semibold text-zinc-500">Voice Settings</span>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600"
              aria-label="Close voice settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="p-5">
            <CreatePageSidebar
              className=""
              selectedVoiceId={selectedVoiceId}
              onVoiceChange={handleVoiceChange}
              controlInstructions={controlInstructions}
              onControlInstructionsChange={handleControlInstructionsChange}
              ultimateMode={ultimateMode}
              onUltimateModeChange={handleUltimateModeChange}
            />
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <CreatePageSidebar
          className="absolute bottom-0 left-0 top-0 z-30"
          selectedVoiceId={selectedVoiceId}
          onVoiceChange={handleVoiceChange}
          controlInstructions={controlInstructions}
          onControlInstructionsChange={handleControlInstructionsChange}
          ultimateMode={ultimateMode}
          onUltimateModeChange={handleUltimateModeChange}
        />
      </div>

      {/* Content */}
      <div className="ml-0 mr-0 flex min-h-0 min-w-0 flex-1 flex-col pb-20 md:ml-80 lg:mr-[380px] lg:pb-0">
        {/* Top bar */}
        <div className="flex flex-wrap items-start gap-2 border-b border-[var(--color-border-faint)] bg-white px-4 py-3 md:flex-nowrap md:items-center md:px-6 md:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-sm md:gap-2">
            <a
              href="/dashboard"
              className="shrink-0 font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
            >
              All Projects
            </a>
            <ChevronRight className="h-3 w-3 shrink-0 text-zinc-300 md:h-3.5 md:w-3.5" />
            <a
              href={`/dashboard/projects/${presentation.project_id}`}
              className="shrink-0 truncate font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
            >
              {projectName || "Project"}
            </a>
            <ChevronRight className="h-3 w-3 shrink-0 text-zinc-300 md:h-3.5 md:w-3.5" />
            <span className="truncate font-medium text-[#18181B]">{presentation.title}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1 text-xs text-zinc-400 md:gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                <span className="hidden sm:inline">Saving…</span>
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1 text-xs text-green-600 md:gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="hidden sm:inline">Saved</span>
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1 text-xs text-red-500 md:gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span className="hidden sm:inline">Save failed</span>
              </span>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-1 border-l border-zinc-200 pl-2 md:ml-4 md:pl-4">
              <button
                type="button"
                onClick={() => setShowRename(true)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-zinc-100 hover:text-[#18181B] md:h-8 md:w-8"
                aria-label="Rename"
              >
                <Pencil className="h-4 w-4" />
              </button>
              {presentation?.status === "archived" ? (
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={restoring}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-zinc-100 hover:text-[#18181B] disabled:opacity-40 md:h-8 md:w-8"
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
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-zinc-100 hover:text-[#18181B] md:h-8 md:w-8"
                  aria-label="Archive"
                >
                  <Archive className="h-4 w-4" />
                </button>
              )}
              {presentation?.status !== "archived" && (
                <button
                  type="button"
                  onClick={() => setShowDelete(true)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-red-50 hover:text-red-600 md:h-8 md:w-8"
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
              parsedImageKeys={parsedImageKeys}
              onParsedImageKeysChange={setParsedImageKeys}
              imageDescriptions={imageDescriptions}
              onImageDescriptionsChange={handleImageDescriptionsChange}
              onRequestPersist={handleRequestPersist}
              onResetImageDescriptions={handleResetImageDescriptions}
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
              mobilePanelOpen={mobilePanelOpen}
              onMobilePanelOpenChange={setMobilePanelOpen}
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
            toastSuccess("Presentation deleted")
          }}
        />
      )}

      {/* Right panel placeholder — shown when SlideEditor isn't rendering yet */}
      {presentation?.status !== "archived" && mode === "upload" && (
        <div className="hidden lg:flex absolute bottom-0 right-0 top-0 z-20 w-[380px] flex-col items-center justify-center border-l border-[var(--color-border-faint)] bg-white px-6">
          <p className="text-center text-sm text-[#71717A]">
            Upload a presentation to access narration and audio tools
          </p>
        </div>
      )}

      {/* Mobile floating dock — left sidebar, voice info, narration script */}
      {presentation?.status !== "archived" && (
        <MobileActionDock
          onOpenSidebar={sidebar.open}
          onOpenVoice={() => setMobileSidebarOpen(true)}
          onOpenNarration={() => setMobilePanelOpen(true)}
        />
      )}
    </>
  )
}
