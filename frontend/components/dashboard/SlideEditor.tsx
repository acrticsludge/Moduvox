"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Play, Loader2, ExternalLink, FileText, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { parsePptxText, type ParsedSlide } from "@/lib/pptx-renderer"
import { compareSlides, type SlideDiff } from "@/lib/pptx-renderer"
import { ReUploadModal } from "./ReUploadModal"
import { RegenerateModal } from "./RegenerateModal"

export function SlideEditor({
  voiceSelected,
  file,
  presentationId,
  narrations: externalNarrations,
  onNarrationsChange,
  audioGenerated: externalAudioGenerated,
  onAudioGeneratedChange,
  storagePath: externalStoragePath,
  onStoragePathChange,
  currentSlide: externalCurrentSlide,
  onCurrentSlideChange,
  slideData: externalSlideData,
  onSlideDataChange,
  changedSlides: externalChangedSlides,
  onChangedSlidesChange,
}: {
  voiceSelected: boolean
  file: File | null
  presentationId: string
  narrations?: Record<number, string>
  onNarrationsChange?: (v: Record<number, string>) => void
  audioGenerated?: boolean
  onAudioGeneratedChange?: (v: boolean) => void
  storagePath?: string
  onStoragePathChange?: (v: string) => void
  currentSlide?: number
  onCurrentSlideChange?: (v: number) => void
  slideData?: { title: string; bullets: string[] }[]
  onSlideDataChange?: (v: { title: string; bullets: string[] }[]) => void
  changedSlides?: number[]
  onChangedSlidesChange?: (v: number[]) => void
}) {
  const [slides, setSlides] = useState<ParsedSlide[]>([])
  const [internalIndex, setInternalIndex] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [internalAudioGenerated, setInternalAudioGenerated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [baseViewerUrl, setBaseViewerUrl] = useState<string>("")
  const [slideInput, setSlideInput] = useState("")
  const [showSlideInfo, setShowSlideInfo] = useState(false)
  const [internalNarrations, setInternalNarrations] = useState<Record<number, string>>({})
  const [showReUpload, setShowReUpload] = useState(false)
  const [pendingDiff, setPendingDiff] = useState<SlideDiff | null>(null)
  const [pendingSlides, setPendingSlides] = useState<ParsedSlide[]>([])
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [reUploadParsing, setReUploadParsing] = useState(false)
  const [reUploading, setReUploading] = useState(false)
  const [internalChangedSlides, setInternalChangedSlides] = useState<number[]>([])
  const [showRegenModal, setShowRegenModal] = useState(false)

  // Use controlled props when provided, otherwise internal state
  const narrations = externalNarrations ?? internalNarrations
  const audioGenerated = externalAudioGenerated ?? internalAudioGenerated
  const currentIndex = externalCurrentSlide ?? internalIndex
  const changedSlides = externalChangedSlides ?? internalChangedSlides
  const total = slides.length

  useEffect(() => {
    let cancelled = false
    setLoadError("")

    async function processFile() {
      if (!file && !externalStoragePath) {
        if (!cancelled) { setLoading(false); setLoadError("No file provided") }
        return
      }
      // Clear any previous error
      setLoadError("")

      let path = ""

      if (file) {
        // Step 1: Upload new file via presigned URL
        try {
          const res = await fetch(`/api/presentations/${presentationId}/upload`, { method: "POST" })
          const json = await res.json()
          if (json.data?.presignedUrl) {
            path = json.data.path as string
            const uploadRes = await fetch(json.data.presignedUrl, {
              method: "PUT",
              body: file,
              headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
            })
            if (uploadRes.ok) {
              onStoragePathChange?.(path)
            }
          }
        } catch { /* upload failed */ }
      } else {
        path = externalStoragePath!
      }

      // Generate viewer URL from storage path
      let signedViewerUrl = ""
      if (path) {
        try {
          const confirmRes = await fetch(`/api/presentations/${presentationId}/upload/confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path }),
          })
          const confirmJson = await confirmRes.json()
          if (confirmJson.data?.viewerUrl) {
            signedViewerUrl = confirmJson.data.viewerUrl
            const encodedUrl = encodeURIComponent(signedViewerUrl)
            setBaseViewerUrl(encodedUrl)
            if (!cancelled) {
              const slideIdx = (externalCurrentSlide ?? 0) + 1
              setViewerUrl(`https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}&wdSlideIndex=${slideIdx}`)
            }
          }
        } catch { /* confirm failed */ }
      }

      // Extract text content for slides
      if (externalSlideData && externalSlideData.length > 0 && !file) {
        // Restore from saved editor state
        if (!cancelled) {
          setSlides(externalSlideData as ParsedSlide[])
          setInternalIndex(externalCurrentSlide ?? 0)
        }
      } else if (file) {
        // Parse from uploaded file
        try {
          const parsed = await parsePptxText(file!)
          if (!cancelled) {
            setSlides(parsed)
            onSlideDataChange?.(parsed)
            setInternalIndex(externalCurrentSlide ?? 0)
          }
        } catch {
          if (!cancelled) setLoadError("Failed to read presentation content.")
        }
      } else if (!file && signedViewerUrl) {
        // Fallback: download PPTX from signed URL and parse it
        try {
          const blobRes = await fetch(signedViewerUrl)
          const blob = await blobRes.blob()
          const parsed = await parsePptxText(new File([blob], "slides.pptx"))
          if (!cancelled) {
            setSlides(parsed)
            onSlideDataChange?.(parsed)
            setInternalIndex(externalCurrentSlide ?? 0)
          }
        } catch {
          // Fallback failed
        }
      }

      if (!cancelled) setLoading(false)
    }

    processFile()
    return () => { cancelled = true }
  }, [file, presentationId])

  const current = slides[currentIndex]

  function updateNarration(text: string) {
    if (!current) return
    const next = { ...narrations, [current.number]: text }
    setInternalNarrations(next)
    onNarrationsChange?.(next)
  }

  function handleGenerate(selectedSlides?: Set<number>) {
    setGenerating(true)
    setTimeout(() => {
      setInternalAudioGenerated(true)
      onAudioGeneratedChange?.(true)
      // Clear changed status for regenerated slides
      if (selectedSlides) {
        const remaining = changedSlides.filter((s) => !selectedSlides.has(s))
        setInternalChangedSlides(remaining)
        onChangedSlidesChange?.(remaining)
      } else {
        setInternalChangedSlides([])
        onChangedSlidesChange?.([])
      }
      setShowRegenModal(false)
      setGenerating(false)
    }, 1200)
  }

  function jumpToSlide(slideNumber: number) {
    const idx = Math.max(0, Math.min(slideNumber - 1, total - 1))
    setInternalIndex(idx)
    onCurrentSlideChange?.(idx)
    setSlideInput(String(idx + 1))
    // Note: does NOT reload the Office viewer — only updates local narration panel.
    // The Office viewer has its own navigation. Use the slide jump input to reload it.
  }

  function handleSlideJump(e: React.FormEvent) {
    e.preventDefault()
    const num = parseInt(slideInput, 10)
    if (!isNaN(num) && num >= 1 && num <= total) {
      jumpToSlide(num)
      // Reload Office viewer at the target slide (user explicitly asked to jump)
      if (baseViewerUrl) {
        setViewerUrl(
          `https://view.officeapps.live.com/op/embed.aspx?src=${baseViewerUrl}&wdSlideIndex=${num}`,
        )
      }
    }
  }

  function handleReUploadFile(file: File) {
    setPendingFile(file)
    setReUploadParsing(true)
    parsePptxText(file).then((newSlides) => {
      const diff = compareSlides(
        slides.map((s) => ({ title: s.title, bullets: s.bullets })),
        newSlides.map((s) => ({ title: s.title, bullets: s.bullets })),
      )
      setPendingSlides(newSlides)
      setPendingDiff(diff)
      setShowReUpload(true)
      setReUploadParsing(false)
    })
  }

  function applyReUpload() {
    if (!pendingSlides.length) return

    const isReplacement = pendingDiff?.type === "replacement"

    // Reset all settings on replacement
    if (isReplacement) {
      setInternalNarrations({})
      onNarrationsChange?.({})
      setInternalAudioGenerated(false)
      onAudioGeneratedChange?.(false)
      setInternalIndex(0)
      onCurrentSlideChange?.(0)
    }

    // Replace slide data
    setSlides(pendingSlides)
    onSlideDataChange?.(pendingSlides)

    // Merge narrations for "changed" type — preserve unchanged, keep modified, init added
    if (!isReplacement && pendingDiff?.changes) {
      const mergedNarrations = { ...narrations }
      const changed: number[] = []

      for (const change of pendingDiff.changes) {
        if (change.status === "modified") {
          changed.push(change.number)
        } else if (change.status === "added") {
          changed.push(change.number)
          // Initialize narration from slide content for new slides
          const slide = pendingSlides[change.number - 1]
          if (slide) {
            mergedNarrations[change.number] = slide.title + (slide.bullets.length > 0 ? "\n" + slide.bullets.join("\n") : "")
          }
        }
      }

      // Clean up narrations for slides that no longer exist in new deck
      const validSlideNumbers = new Set(pendingSlides.map((_, i) => i + 1))
      for (const key of Object.keys(mergedNarrations)) {
        if (!validSlideNumbers.has(Number(key))) {
          delete mergedNarrations[Number(key)]
        }
      }

      setInternalNarrations(mergedNarrations)
      onNarrationsChange?.(mergedNarrations)
      setInternalChangedSlides(changed)
      onChangedSlidesChange?.(changed)
    }

    // Handle overflow
    if (currentIndex >= pendingSlides.length) {
      setInternalIndex(pendingSlides.length - 1)
      onCurrentSlideChange?.(pendingSlides.length - 1)
    }

    // Show processing overlay
    setShowReUpload(false)
    setPendingDiff(null)
    setPendingSlides([])
    setReUploading(true)

    // Upload new file to storage and refresh viewer
    if (pendingFile) {
      const uploadAndRefresh = async () => {
        try {
          const res = await fetch(`/api/presentations/${presentationId}/upload`, { method: "POST" })
          const json = await res.json()
          if (json.data?.presignedUrl) {
            const uploadRes = await fetch(json.data.presignedUrl, {
              method: "PUT",
              body: pendingFile,
              headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
            })
            if (uploadRes.ok) {
              onStoragePathChange?.(json.data.path)
              const confirmRes = await fetch(`/api/presentations/${presentationId}/upload/confirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: json.data.path }),
              })
              const confirmJson = await confirmRes.json()
              if (confirmJson.data?.viewerUrl) {
                const encodedUrl = encodeURIComponent(confirmJson.data.viewerUrl)
                setBaseViewerUrl(encodedUrl)
                setViewerUrl(`https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`)
              }
            }
          }
        } catch { /* upload failed */ }
        setReUploading(false)
        setPendingFile(null)
      }
      uploadAndRefresh()
    } else {
      setReUploading(false)
      setPendingFile(null)
    }
  }

  // Keyboard nav: ← → arrow keys to navigate slides using a ref for stable handler
  const jumpRef = useRef(jumpToSlide)
  jumpRef.current = jumpToSlide

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const currentSlide = slides[currentIndex]
      if (!currentSlide) return
      if (e.key === "ArrowLeft") jumpRef.current(currentSlide.number - 1)
      if (e.key === "ArrowRight") jumpRef.current(currentSlide.number + 1)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [slides, currentIndex])

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#71717A]" />
        <p className="text-sm text-[#71717A]">Processing presentation...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-sm text-red-600">{loadError}</p>
      </div>
    )
  }

  if (!slides.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-sm text-[#71717A]">No slides found in this presentation.</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-0 lg:flex-row">
      {/* Left — Office Online viewer showing the actual PPTX */}
      <div className="relative flex flex-1 flex-col bg-zinc-100">
        {/* Processing overlay during re-upload */}
        {reUploading ? (
          <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#71717A]" />
            <p className="text-sm text-[#71717A]">Processing PPTX...</p>
          </div>
        ) : viewerUrl ? (
          <>
            <iframe
              src={viewerUrl}
              className="h-full w-full"
              style={{ minHeight: "60vh" }}
              title="Presentation preview"
            />
            <div className="absolute bottom-3 right-3 flex gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-[#71717A] shadow-sm transition-colors hover:text-[#18181B]">
                <FileText className="h-3 w-3" />
                Re-upload
                <input
                  type="file"
                  accept=".pptx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleReUploadFile(f)
                    e.target.value = ""
                  }}
                />
              </label>
              <a
                href={viewerUrl.replace("embed.aspx", "view.aspx")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-[#71717A] shadow-sm transition-colors hover:text-[#18181B]"
              >
                <ExternalLink className="h-3 w-3" />
                Open in full screen
              </a>
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-[60vh] items-center justify-center">
            <p className="text-sm text-[#71717A]">
              Upload processed. Slide preview unavailable.
            </p>
          </div>
        )}
      </div>

      {/* Right — Controls panel */}
      <div className="flex w-full flex-col gap-5 border-t border-[var(--color-border-faint)] bg-white p-6 lg:w-[380px] lg:flex-shrink-0 lg:border-l lg:border-t-0 lg:overflow-y-auto lg:max-h-[calc(100vh-8rem)]">
        {/* Slide info + jump input */}
        <div className="flex items-center justify-between gap-2">
          <form onSubmit={handleSlideJump} className="flex items-center gap-1.5">
            <span className="text-sm text-[#71717A]">Slide</span>
            <input
              type="number"
              min={1}
              max={total}
              value={slideInput || current.number}
              onChange={(e) => setSlideInput(e.target.value)}
              onBlur={() => setSlideInput(String(current.number))}
              className="w-12 rounded border border-zinc-200 px-1.5 py-0.5 text-center text-sm font-medium text-[#18181B] focus:border-zinc-400 focus:outline-none"
            />
            <span className="text-sm text-[#71717A]">of {total}</span>
          </form>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => jumpToSlide(current.number - 1)}
              disabled={currentIndex === 0}
              className="flex h-7 w-7 items-center justify-center rounded text-xs text-[#71717A] transition-colors hover:bg-zinc-100 hover:text-[#18181B] disabled:opacity-30"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => jumpToSlide(current.number + 1)}
              disabled={currentIndex === total - 1}
              className="flex h-7 w-7 items-center justify-center rounded text-xs text-[#71717A] transition-colors hover:bg-zinc-100 hover:text-[#18181B] disabled:opacity-30"
            >
              →
            </button>
          </div>
        </div>

        {/* Slide info button + modal */}
        <div>
          <button
            type="button"
            onClick={() => setShowSlideInfo(true)}
            className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-left text-sm text-[#71717A] transition-colors hover:border-zinc-300 hover:text-[#18181B]"
          >
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">View parsed information from current slide</span>
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-zinc-300" />
          </button>
        </div>

        {/* Modified slides banner */}
        {changedSlides.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-amber-500" />
            <span>{changedSlides.length} slide(s) modified since re-upload</span>
          </div>
        )}

        {/* Slide info modal */}
        {showSlideInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40">
            <div className="mx-4 w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#18181B]">
                  Slide {current.number} — {current.title}
                  {changedSlides.includes(current.number) && (
                    <span className="ml-2 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                      Modified
                    </span>
                  )}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowSlideInfo(false)}
                  className="text-[#71717A] hover:text-[#18181B]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {current.bullets.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {current.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2 text-sm text-[#71717A]">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-300" />
                      <span className="leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-[#71717A]">
                  No additional content extracted for this slide.
                </p>
              )}
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowSlideInfo(false)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-[#71717A] hover:text-[#18181B]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Narration textarea */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[#18181B]">
            Narration Script
          </label>
          <Textarea
            value={narrations[current.number] ?? ""}
            onChange={(e) => updateNarration(e.target.value)}
            placeholder="AI-generated narration will appear here..."
            className="min-h-[120px] resize-none text-sm"
          />
        </div>

        {/* Generate button */}
        {!audioGenerated && (
          <div className="space-y-1">
            <Button
              onClick={() => handleGenerate()}
              disabled={generating || !voiceSelected}
              className="w-full"
            >
              {generating ? "Generating audio for all slides..." : "Generate Narration"}
            </Button>
            {!voiceSelected && (
              <p className="text-xs text-[#71717A]">
                Select a voice in the sidebar to enable generation.
              </p>
            )}
          </div>
        )}

        {audioGenerated && (
          <>
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              Audio generated for all {total} slides
            </div>

            {/* Global regenerate button */}
            <Button
              onClick={() => setShowRegenModal(true)}
              variant="outline"
              className="w-full"
            >
              Regenerate Audio
            </Button>

            {/* Audio player */}
            <div
              className={cn(
                "overflow-hidden transition-all duration-500",
                audioGenerated ? "max-h-24 opacity-100" : "max-h-0 opacity-0",
              )}
            >
              <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#18181B] text-white transition-colors hover:bg-[#27272A]"
                >
                  <Play className="h-4 w-4" />
                </button>
                <div className="flex flex-1 items-center gap-2">
                  <span className="text-xs text-[#71717A]">0:00</span>
                  <div className="flex-1">
                    <div className="h-1.5 rounded-full bg-zinc-200">
                      <div className="h-1.5 w-0 rounded-full bg-[#18181B]" />
                    </div>
                  </div>
                  <span className="text-xs text-[#71717A]">0:00</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>

      {/* Re-upload modal overlay */}
      {showReUpload && pendingDiff && (
        <ReUploadModal
          diff={pendingDiff}
          onApply={applyReUpload}
          onCancel={() => {
            setShowReUpload(false)
            setPendingDiff(null)
            setPendingSlides([])
          }}
          parsing={reUploadParsing}
        />
      )}

      {/* Regenerate modal */}
      {showRegenModal && (
        <RegenerateModal
          slides={slides}
          narrations={narrations}
          changedSlides={changedSlides}
          generating={generating}
          onNavigate={(num) => jumpToSlide(num)}
          onViewParsed={(num) => {
            jumpToSlide(num)
            setShowSlideInfo(true)
          }}
          onConfirm={(selected) => handleGenerate(selected)}
          onCancel={() => setShowRegenModal(false)}
        />
      )}
    </>
  )
}
