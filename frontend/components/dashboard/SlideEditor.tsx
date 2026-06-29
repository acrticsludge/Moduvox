"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Play, Loader2, ExternalLink, FileText, ChevronRight, X, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { parsePptxText, type ParsedSlide } from "@/lib/pptx-renderer"
import { compareSlides, type SlideDiff } from "@/lib/pptx-renderer"
import toast from "react-hot-toast"
import { ReUploadModal } from "./ReUploadModal"
import { RegenerateModal } from "./RegenerateModal"
import { AudioPlayer } from "./AudioPlayer"

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
  onRemovePpt,
  voiceDescription,
  audioUrl: externalAudioUrl,
  onAudioUrlChange,
  audioStoragePath: externalAudioStoragePath,
  onAudioStoragePathChange,
  onAudioSlidePathsChange,
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
  onRemovePpt?: () => void
  voiceDescription?: string
  audioUrl?: string | null
  onAudioUrlChange?: (v: string | null) => void
  audioStoragePath?: string | null
  onAudioStoragePathChange?: (v: string | null) => void
  onAudioSlidePathsChange?: (v: Record<number, string>) => void
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
  const [uploadProgress, setUploadProgress] = useState(0)
  const [viewerLoading, setViewerLoading] = useState(false)
  const [iframeError, setIframeError] = useState(false)
  const [internalChangedSlides, setInternalChangedSlides] = useState<number[]>([])
  const [showRegenModal, setShowRegenModal] = useState(false)
  const [lastRegenCount, setLastRegenCount] = useState(0)
  const [generatingNarrations, setGeneratingNarrations] = useState(false)
  const [generationFailed, setGenerationFailed] = useState(false)
  const [internalAudioUrl, setInternalAudioUrl] = useState<string | null>(null)
  const [generatingAudio, setGeneratingAudio] = useState(false)
  const [audioGenProgress, setAudioGenProgress] = useState<{ current: number; total: number } | null>(null)
  const [audioGenError, setAudioGenError] = useState<string | null>(null)
  const [audioGenFailed, setAudioGenFailed] = useState(false)

  const audioUrl = externalAudioUrl ?? internalAudioUrl
  const [removingPpt, setRemovingPpt] = useState(false)
  const [removeConfirm, setRemoveConfirm] = useState(false)

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
      setUploadProgress(0)
      if (!file && !externalStoragePath) {
        if (!cancelled) { setLoading(false); setLoadError("No file provided"); setUploadProgress(0) }
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
            const uploadOk = await new Promise<boolean>((resolve) => {
              const xhr = new XMLHttpRequest()
              xhr.open("PUT", json.data.presignedUrl)
              xhr.setRequestHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation")
              xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                  setUploadProgress(Math.round((e.loaded / e.total) * 100))
                }
              }
              xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300)
              xhr.onerror = () => resolve(false)
              xhr.send(file)
            })
            if (uploadOk) {
              onStoragePathChange?.(path)
            }
          }
        } catch {
          if (!cancelled) setLoadError("Failed to upload presentation.")
        }
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
        } catch {
          if (!cancelled) setLoadError("Failed to generate viewer link.")
        }
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
          if (!cancelled) setLoadError("Failed to download presentation preview.")
        }
      }

      if (!cancelled) { setLoading(false); setUploadProgress(0) }
    }

    processFile()
    return () => { cancelled = true }
  }, [file, presentationId])

  // Auto-generate narration when slides are first parsed
  useEffect(() => {
    if (slides.length === 0) return
    if (Object.keys(narrations).length > 0) return
    if (generatingNarrations) return
    if (!file) return // Only auto-generate for freshly uploaded files, not restored state
    setGenerationFailed(false)
    generateNarrations(slides).then((ok) => {
      if (!ok) setGenerationFailed(true)
    })
  }, [slides, file])

  // Shared helper: generate narrations via API. Returns true if narrations were generated.
  async function generateNarrations(targetSlides: ParsedSlide[], showRateLimitPrompt = true): Promise<boolean> {
    if (targetSlides.length === 0) return false
    setGeneratingNarrations(true)
    try {
      const res = await fetch("/api/generate/narration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides: targetSlides.map((s) => ({ number: s.number, title: s.title, bullets: s.bullets })),
        }),
      })
      const json = await res.json()

      // Shared key quota exhausted — permanent block, always notify
      if (json.error === "quota_exhausted") {
        toast.error(json.message || "The shared Gemini key has hit its daily limit. Add your own API key in Settings.")
        return false
      }

      // Temporary rate limit — only show toast for explicit user actions
      if (json.error === "rate_limited") {
        if (showRateLimitPrompt) {
          const retryAfter = json.retryAfter as number | undefined
          if (retryAfter && retryAfter > 0) {
            const toastId = `rate-limit-${Date.now()}`
            let remaining = retryAfter
            const updateMsg = () => {
              if (remaining > 0) {
                toast.error(`Rate limit reached. Try again in ${remaining}s, or add your own API key in Settings.`, { id: toastId })
                remaining--
              } else {
                clearInterval(rateLimitIntervalRef.current)
                rateLimitIntervalRef.current = undefined
              }
            }
            updateMsg()
            rateLimitIntervalRef.current = setInterval(updateMsg, 1000)
          } else {
            toast.error(json.message || "Generation limit reached. Add your Gemini API key in Settings.")
          }
        }
        return false
      }

      // Invalid user API key — always notify
      if (json.error === "invalid_api_key") {
        toast.error(json.message || "Your Gemini API key is invalid. Check Settings.")
        return false
      }

      if (json.data?.narrations && Object.keys(json.data.narrations).length > 0) {
        // Merge new narrations with existing ones
        const updated = { ...narrations, ...json.data.narrations }
        setInternalNarrations(updated)
        onNarrationsChange?.(updated)
        return true
      }

      return false
    } catch { /* narration failed */; return false }
    finally { setGeneratingNarrations(false) }
  }

  const current = slides[currentIndex]

  function updateNarration(text: string) {
    if (!current) return
    const next = { ...narrations, [current.number]: text }
    setInternalNarrations(next)
    onNarrationsChange?.(next)
  }

  async function handleGenerate(selectedSlides?: Set<number>) {
    setGenerating(true)
    setLastRegenCount(selectedSlides?.size ?? 0)

    const targetSlides = selectedSlides
      ? slides.filter((s) => selectedSlides.has(s.number))
      : slides

    // Regenerate narrations
    const ok = await generateNarrations(targetSlides, false)

    if (ok) {
      setGenerationFailed(false)

      // Regenerate audio for the affected slides (sequential, with progress)
      const sorted = targetSlides.slice().sort((a, b) => a.number - b.number)
      const slideTexts = sorted
        .map((s) => ({ number: s.number, text: narrations[s.number] || "" }))
        .filter((s) => s.text.trim())

      if (slideTexts.length > 0) {
        setAudioGenProgress({ current: 0, total: slideTexts.length })

        for (let i = 0; i < slideTexts.length; i++) {
          setAudioGenProgress({ current: i + 1, total: slideTexts.length })

          try {
            const res = await fetch("/api/generate/audio/slide", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                slide_number: slideTexts[i].number,
                text: slideTexts[i].text,
                voice_description: voiceDescription || "Natural, clear, professional speaking voice",
                cfg_value: 2.0,
                presentation_id: presentationId,
              }),
            })

            if (!res.ok) {
              const json = await res.json().catch(() => ({}))
              throw new Error(typeof json.error === "string" ? json.error : `Slide ${slideTexts[i].number} failed`)
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Audio regeneration failed"
            setAudioGenError(msg)
            setAudioGenFailed(true)
            setAudioGenProgress(null)
            setGenerating(false)
            return
          }
        }

        setAudioGenProgress(null)
      }

      const combinedUrl = `/api/presentations/${presentationId}/audio/combined`
      setInternalAudioUrl(combinedUrl)
      onAudioUrlChange?.(combinedUrl)
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
    }

    setShowRegenModal(false)
    setGenerating(false)
  }

  function jumpToSlide(slideNumber: number) {
    const idx = Math.max(0, Math.min(slideNumber - 1, total - 1))
    setInternalIndex(idx)
    onCurrentSlideChange?.(idx)
    setSlideInput(String(idx + 1))
    // Reload Office viewer at the target slide
    if (baseViewerUrl) {
      setViewerLoading(true)
      setIframeError(false)
      setViewerUrl(
        `https://view.officeapps.live.com/op/embed.aspx?src=${baseViewerUrl}&wdSlideIndex=${idx + 1}`,
      )
    }
  }

  function handleSlideJump(e: React.FormEvent) {
    e.preventDefault()
    const num = parseInt(slideInput, 10)
    if (!isNaN(num) && num >= 1 && num <= total) {
      jumpToSlide(num)
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

  async function handleRemovePpt() {
    if (removingPpt) return
    setRemovingPpt(true)
    setRemoveConfirm(false)
    try {
      const res = await fetch(`/api/presentations/${presentationId}/file`, { method: "DELETE" })
      if (!res.ok) {
        toast.error("Failed to remove PPTX. Please try again.")
        return
      }

      // Reset all editor state (voice settings preserved by parent)
      setInternalNarrations({})
      onNarrationsChange?.({})
      setInternalAudioGenerated(false)
      onAudioGeneratedChange?.(false)
      setSlides([])
      setInternalIndex(0)
      onCurrentSlideChange?.(0)
      setViewerUrl(null)
      setBaseViewerUrl("")
      onSlideDataChange?.([])
      setInternalChangedSlides([])
      onChangedSlidesChange?.([])
      setGenerationFailed(false)
      setGeneratingNarrations(false)
      setViewerLoading(false)
      setIframeError(false)
      setSlideInput("1")

      setInternalAudioUrl(null)
      onAudioUrlChange?.(null)
      onAudioStoragePathChange?.(null)

      // Signal parent to switch mode to upload
      onRemovePpt?.()
    } catch {
      toast.error("Failed to remove PPTX")
    } finally {
      setRemovingPpt(false)
    }
  }

  function applyReUpload() {
    if (!pendingSlides.length) return
    setLastRegenCount(0)

    const isReplacement = pendingDiff?.type === "replacement"

    // Reset all settings on replacement
    if (isReplacement) {
      setInternalNarrations({})
      onNarrationsChange?.({})
      setInternalAudioGenerated(false)
      onAudioGeneratedChange?.(false)
      setInternalAudioUrl(null)
      onAudioUrlChange?.(null)
      onAudioStoragePathChange?.(null)
    }

    // Always reset to first slide on re-upload
    setInternalIndex(0)
    onCurrentSlideChange?.(0)
    setSlideInput("1")

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
        } else if (change.status === "reordered" && change.oldNumber) {
          // Carry narration from old position to new position
          changed.push(change.number)
          const oldNarration = mergedNarrations[change.oldNumber]
          if (oldNarration) {
            mergedNarrations[change.number] = oldNarration
            delete mergedNarrations[change.oldNumber]
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

      // If audio existed and slides changed, clear stale audio so user regenerates
      if (audioGenerated && changed.length > 0) {
        setInternalAudioGenerated(false)
        onAudioGeneratedChange?.(false)
        setInternalAudioUrl(null)
        onAudioUrlChange?.(null)
        onAudioStoragePathChange?.(null)
      }

      // Auto-generate AI narrations for changed/added slides (silent — no toast on rate limit)
      const slidesToRegen = pendingSlides.filter((s) => changed.includes(s.number))
      if (slidesToRegen.length > 0) {
        generateNarrations(slidesToRegen, false).then((ok) => {
          if (!ok) setGenerationFailed(true)
        })
      }
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
                setViewerUrl(`https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}&wdSlideIndex=1`)
              }
            }
          }
        } catch {
          toast.error("Re-upload failed. Please try again.")
        }
        setReUploading(false)
        setPendingFile(null)
      }
      uploadAndRefresh()
    } else {
      setReUploading(false)
      setPendingFile(null)
    }
  }

  // Ref to clean up rate limit countdown interval on unmount
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rateLimitIntervalRef = useRef<any>(undefined)

  // Clean up rate limit interval on unmount
  useEffect(() => {
    return () => {
      if (rateLimitIntervalRef.current) clearInterval(rateLimitIntervalRef.current)
    }
  }, [])

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
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#71717A]" />
        <p className="text-sm text-[#71717A]">Processing presentation...</p>
        {uploadProgress > 0 && (
          <div className="w-48">
            <div className="h-1.5 rounded-full bg-zinc-200">
              <div
                className="h-1.5 rounded-full bg-[#18181B] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="mt-1 text-center text-[11px] text-zinc-400">{uploadProgress}%</p>
          </div>
        )}
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
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <p className="text-sm text-[#71717A]">No slides found in this presentation.</p>
        <p className="max-w-xs text-center text-xs text-zinc-400">
          The file may contain only images or unsupported content. Try re-uploading a file with text-based slides, or use the Re-upload button above.
        </p>
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
        ) : viewerUrl && !iframeError ? (
          <>
            <div className="relative flex-1">
              <iframe
                src={viewerUrl}
                className="h-full w-full"
                style={{ minHeight: "60vh" }}
                title="Presentation preview"
                onLoad={() => { setViewerLoading(false); setIframeError(false) }}
                onError={() => setIframeError(true)}
              />
              {viewerLoading && !reUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-100">
                  <Loader2 className="h-5 w-5 animate-spin text-[#71717A]" />
                </div>
              )}
            </div>
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
                    setRemoveConfirm(false)
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  if (removeConfirm) {
                    setRemoveConfirm(false)
                    handleRemovePpt()
                  } else {
                    setRemoveConfirm(true)
                  }
                }}
                disabled={removingPpt}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
                  removeConfirm
                    ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
                    : "border-zinc-200 bg-white text-[#71717A] hover:text-red-600"
                }`}
              >
                {removingPpt ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : removeConfirm ? (
                  "Confirm?"
                ) : (
                  "Remove PPT"
                )}
              </button>
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
        ) : iframeError ? (
          <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-2 p-8">
            <p className="text-sm text-amber-600">Failed to load presentation preview.</p>
            <p className="text-xs text-[#71717A]">Try refreshing or re-uploading the file.</p>
          </div>
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
          <div className="flex gap-1" title="← → arrow keys to navigate">
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
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#18181B]/40 pt-[10vh]">
            <div className="mx-4 w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                    Slide {current.number}
                  </span>
                  {changedSlides.includes(current.number) && (
                    <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      Modified
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowSlideInfo(false)}
                  className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Title */}
              <div className="px-5 pt-4 pb-2">
                <h2 className="text-lg font-semibold leading-snug text-[#18181B]">
                  {current.title}
                </h2>
              </div>

              {/* Content */}
              <div className="max-h-[50vh] overflow-y-auto px-5 pb-4">
                {current.bullets.length > 0 ? (
                  <div className="space-y-1.5">
                    {current.bullets.map((b, i) => (
                      <div
                        key={i}
                        className="group flex gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-zinc-50"
                      >
                        <div className="mt-0.5 w-0.5 flex-shrink-0 rounded-full bg-zinc-200 group-hover:bg-zinc-400" />
                        <p className="text-sm leading-relaxed text-zinc-600 group-hover:text-zinc-800">
                          {b}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-200 py-8">
                    <p className="text-sm text-zinc-400">No additional content extracted</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3">
                <span className="text-[11px] text-zinc-400">
                  {current.bullets.length > 0
                    ? `${current.bullets.length} item${current.bullets.length === 1 ? "" : "s"}`
                    : "Empty slide"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowSlideInfo(false)}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
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
            placeholder={generatingNarrations ? "Generating AI narration..." : "AI-generated narration will appear here..."}
            className="min-h-[120px] resize-none text-sm"
          />
          {narrations[current.number] && (
            <p className="text-xs text-zinc-400 text-right">
              {narrations[current.number].split(/\s+/).filter(Boolean).length} words · {narrations[current.number].length} characters
            </p>
          )}
        </div>

        {/* Try Again — shown when auto-gen narration failed (no narrations) */}
        {generationFailed && (
          <Button
            onClick={async () => {
              setGenerationFailed(false)
              const ok = await generateNarrations(slides, true)
              if (!ok) setGenerationFailed(true)
            }}
            disabled={generating || generatingNarrations}
            variant="outline"
            className="w-full"
          >
            {generating || generatingNarrations ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Trying again…
              </>
            ) : (
              "Try again"
            )}
          </Button>
        )}

        {/* Generate Audio — shown when narration exists but TTS not done */}
        {Object.keys(narrations).length > 0 && !audioGenerated && !generationFailed && !audioGenFailed && (
          <Button
            onClick={async () => {
              if (generatingAudio) return

              // Determine which slides need audio generation.
              const slidesToGenerate = changedSlides.length > 0
                ? slides.filter((s) => changedSlides.includes(s.number))
                : slides

              const sorted = slidesToGenerate.slice().sort((a, b) => a.number - b.number)
              const slideTexts = sorted
                .map((s) => ({ number: s.number, text: narrations[s.number] || "" }))
                .filter((s) => s.text.trim())

              if (slideTexts.length === 0) {
                toast.error("No narration text to generate audio from.")
                return
              }

              setAudioGenFailed(false)
              setAudioGenError(null)
              setGeneratingAudio(true)
              setAudioGenProgress({ current: 0, total: slideTexts.length })

              for (let i = 0; i < slideTexts.length; i++) {
                setAudioGenProgress({ current: i + 1, total: slideTexts.length })

                try {
                  const res = await fetch("/api/generate/audio/slide", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      slide_number: slideTexts[i].number,
                      text: slideTexts[i].text,
                      voice_description: voiceDescription || "Natural, clear, professional speaking voice",
                      cfg_value: 2.0,
                      presentation_id: presentationId,
                    }),
                  })

                  if (!res.ok) {
                    const json = await res.json().catch(() => ({}))
                    throw new Error(typeof json.error === "string" ? json.error : `Slide ${slideTexts[i].number} failed`)
                  }
                } catch (err) {
                  const msg = err instanceof Error ? err.message : "Audio generation failed"
                  setAudioGenError(msg)
                  setAudioGenFailed(true)
                  setGeneratingAudio(false)
                  setAudioGenProgress(null)
                  return
                }
              }

              // All slides generated successfully
              const combinedUrl = `/api/presentations/${presentationId}/audio/combined`
              setInternalAudioUrl(combinedUrl)
              onAudioUrlChange?.(combinedUrl)
              setInternalAudioGenerated(true)
              onAudioGeneratedChange?.(true)
              setGeneratingAudio(false)
              setAudioGenProgress(null)
            }}
            disabled={generatingNarrations || generatingAudio}
            className="w-full"
          >
            {generatingAudio ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Audio…
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Generate Audio
              </>
            )}
          </Button>
        )}

        {/* Try again after audio generation failure */}
        {audioGenFailed && (
          <Button
            onClick={() => {
              setAudioGenFailed(false)
              setAudioGenError(null)
            }}
            variant="outline"
            className="w-full"
          >
            Try Again
          </Button>
        )}

        {/* Audio section — shown after TTS has been done */}
        {audioGenerated && (
          <>
            {changedSlides.length === 0 && (
              <div
                className={
                  lastRegenCount > 0
                    ? "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700"
                    : "rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
                }
              >
                {lastRegenCount > 0
                  ? `Audio regenerated for ${lastRegenCount} slide(s)`
                  : `Audio generated for all ${total} slides`}
              </div>
            )}

            {/* Global regenerate button */}
            <Button
              onClick={() => setShowRegenModal(true)}
              variant="outline"
              className="w-full"
            >
              Regenerate Audio
            </Button>

            {/* Audio player */}
            {audioUrl && (
              <AudioPlayer audioUrl={audioUrl} />
            )}
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
          changedSlides={changedSlides}
          generating={generating}
          onNavigate={(num) => jumpToSlide(num)}
          onConfirm={() => handleGenerate(new Set(changedSlides))}
          onCancel={() => setShowRegenModal(false)}
        />
      )}

      {/* Audio generation progress overlay — blocks the entire page */}
      {audioGenProgress && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#18181B]/60">
          <div className="flex flex-col items-center gap-4 rounded-xl bg-white px-8 py-10 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-[#18181B]" />
            <p className="text-sm font-medium text-[#18181B]">
              Generating audio…
            </p>
            <p className="text-xs text-[#71717A]">
              Slide {audioGenProgress.current} of {audioGenProgress.total}
            </p>
            {/* Progress bar */}
            <div className="h-1.5 w-48 rounded-full bg-zinc-200">
              <div
                className="h-1.5 rounded-full bg-[#18181B] transition-all duration-300"
                style={{ width: `${(audioGenProgress.current / audioGenProgress.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Audio generation error modal */}
      {audioGenError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40">
          <div className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <TriangleAlert className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="mb-2 text-center text-lg font-semibold">Generation failed</h2>
            <p className="mb-6 text-center text-sm text-zinc-500">
              {audioGenError}
            </p>
            <button
              type="button"
              onClick={() => setAudioGenError(null)}
              className="w-full rounded-lg bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#27272A]"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  )
}
