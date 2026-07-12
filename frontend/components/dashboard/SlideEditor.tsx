"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Play, Loader2, ExternalLink, FileText, ChevronRight, X, Share2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { parsePptxText, type ParsedSlide } from "@/lib/pptx-renderer"
import { compareSlides, type SlideDiff } from "@/lib/pptx-renderer"
import { toastSuccess, toastError } from "@/components/ui/CustomToast"
import { ReUploadModal } from "./ReUploadModal"
import { RegenerateModal, type RegenStep } from "./RegenerateModal"
import { AudioPlayer } from "./AudioPlayer"
import { SharePresentationModal } from "./SharePresentationModal"
import { SlidePdfViewer } from "@/components/shared/SlidePdfViewer"

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
  selectedVoiceId,
  ultimateMode,
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
  selectedVoiceId?: string | null
  ultimateMode?: boolean
}) {
  const [slides, setSlides] = useState<ParsedSlide[]>([])
  const [internalIndex, setInternalIndex] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [internalAudioGenerated, setInternalAudioGenerated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [slideInput, setSlideInput] = useState("")
  const [pdfUrls, setPdfUrls] = useState<(string | null)[]>([])
  const [conversionStatus, setConversionStatus] = useState<"uploading" | "converting" | "ready" | "error">("uploading")
  const [conversionError, setConversionError] = useState("")
  const [pollAttempts, setPollAttempts] = useState(0)
  const [showSlideInfo, setShowSlideInfo] = useState(false)
  const [internalNarrations, setInternalNarrations] = useState<Record<number, string>>({})
  const [showReUpload, setShowReUpload] = useState(false)
  const [pendingDiff, setPendingDiff] = useState<SlideDiff | null>(null)
  const [pendingSlides, setPendingSlides] = useState<ParsedSlide[]>([])
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [reUploadParsing, setReUploadParsing] = useState(false)
  const [reUploading, setReUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [internalChangedSlides, setInternalChangedSlides] = useState<number[]>([])
  const [showRegenModal, setShowRegenModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [lastRegenCount, setLastRegenCount] = useState(0)
  const [generatingNarrations, setGeneratingNarrations] = useState(false)
  const [generationFailed, setGenerationFailed] = useState(false)
  const [internalAudioUrl, setInternalAudioUrl] = useState<string | null>(null)
  const [generatingAudio, setGeneratingAudio] = useState(false)
  const [audioGenProgress, setAudioGenProgress] = useState<{ current: number; total: number; slideTitle?: string } | null>(null)
  const [audioGenError, setAudioGenError] = useState<string | null>(null)
  const [audioGenFailed, setAudioGenFailed] = useState(false)
  const [regenStep, setRegenStep] = useState<RegenStep>("review")
  const [generationSummary, setGenerationSummary] = useState<{ success: number; failed: number } | null>(null)
  const [isInitialGenerate, setIsInitialGenerate] = useState(false)
  const [showMobilePanel, setShowMobilePanel] = useState(false)
  const originalNarrationsRef = useRef<Record<number, string>>({})
  const generatedWithVoiceRef = useRef<{ voiceId: string | null; description: string; ultimateMode: boolean } | null>(null)

  const audioUrl = externalAudioUrl ?? internalAudioUrl
  const [removingPpt, setRemovingPpt] = useState(false)
  const [removeConfirm, setRemoveConfirm] = useState(false)

  // Use controlled props when provided, otherwise internal state
  const narrations = externalNarrations ?? internalNarrations
  const audioGenerated = externalAudioGenerated ?? internalAudioGenerated
  const currentIndex = externalCurrentSlide ?? internalIndex
  const changedSlides = externalChangedSlides ?? internalChangedSlides
  const total = slides.length

  const POLL_INTERVAL = 2000
  const MAX_POLL_ATTEMPTS = 150

  const pollForPdfs = useCallback(async (presId: string, slideCount: number) => {
    let attempts = 0
    const poll = async () => {
      if (attempts >= MAX_POLL_ATTEMPTS) {
        setConversionStatus("error")
        setConversionError("Conversion timed out. Please try again.")
        return
      }
      attempts++
      setPollAttempts(attempts)

      try {
        const res = await fetch(`/api/presentations/${presId}/slides`)
        const json = await res.json()
        if (json.data?.completed) {
          const urls: (string | null)[] = []
          for (const slide of json.data.slides) {
            urls[slide.slideNumber - 1] = slide.pdfUrl
          }
          setPdfUrls(urls)
          setConversionStatus("ready")
          setLoading(false)
          return
        }
      } catch {
        // Silently retry on network errors
      }
      setTimeout(poll, POLL_INTERVAL)
    }
    poll()
  }, [])

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
            // Always save the path so editor state persists on reload
            // (the R2 upload may fail locally but works on Vercel production)
            onStoragePathChange?.(path)
            // Try upload in background (don't block editor for upload result)
            const xhr = new XMLHttpRequest()
            xhr.open("PUT", json.data.presignedUrl)
            xhr.setRequestHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation")
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                setUploadProgress(Math.round((e.loaded / e.total) * 100))
              }
            }
            xhr.onerror = () => {} // silent — file is still on local disk for parsing
            xhr.send(file)
          }
        } catch {
          if (!cancelled) setLoadError("Failed to upload presentation.")
        }
      } else {
        path = externalStoragePath!
      }

      // Extract text content for slides (parse early to get slide count)
      let parsedSlides: ParsedSlide[] | null = null
      if (externalSlideData && externalSlideData.length > 0 && !file) {
        // Restore from saved editor state
        parsedSlides = externalSlideData as ParsedSlide[]
        if (!cancelled) {
          setSlides(parsedSlides)
          setInternalIndex(externalCurrentSlide ?? 0)
        }
      } else if (file) {
        // Parse from uploaded file
        try {
          parsedSlides = await parsePptxText(file!)
          if (!cancelled) {
            setSlides(parsedSlides)
            onSlideDataChange?.(parsedSlides)
            setInternalIndex(externalCurrentSlide ?? 0)
          }
        } catch {
          if (!cancelled) setLoadError("Failed to read presentation content.")
        }
      }

      // Confirm upload and start PDF conversion
      if (path) {
        try {
          const slideCount = parsedSlides?.length ?? 1
          const confirmRes = await fetch(`/api/presentations/${presentationId}/upload/confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path, slideCount }),
          })
          if (!confirmRes.ok) {
            if (!cancelled) setLoadError("Failed to confirm upload.")
          } else if (!cancelled) {
            // Start polling for PDF conversion
            setConversionStatus("converting")
            pollForPdfs(presentationId, slideCount)
          }
        } catch {
          if (!cancelled) setLoadError("Failed to confirm upload.")
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
    generateNarrations(slides, false).then((result) => {
      if (!result) setGenerationFailed(true)
    })
  }, [slides, file])

  // Snapshot narrations as the "original" baseline when first populated (from saved state or initial AI gen)
  useEffect(() => {
    if (Object.keys(narrations).length > 0 && Object.keys(originalNarrationsRef.current).length === 0) {
      originalNarrationsRef.current = { ...narrations }
    }
  }, [narrations])

  // Track whether voice settings changed since last audio gen — used by regenerate modal
  const [voiceChangedSinceAudio, setVoiceChangedSinceAudio] = useState(false)
  useEffect(() => {
    if (!audioGenerated) {
      setVoiceChangedSinceAudio(false)
      return
    }

    // If no snapshot yet (e.g., first time audio generated in this session),
    // take one and don't compare yet
    if (generatedWithVoiceRef.current === null) {
      generatedWithVoiceRef.current = {
        voiceId: selectedVoiceId ?? null,
        description: voiceDescription ?? "",
        ultimateMode: ultimateMode ?? false,
      }
      setVoiceChangedSinceAudio(false)
      return
    }

    // Compare snapshot vs current
    const snap = generatedWithVoiceRef.current
    const voiceChanged = snap.voiceId !== (selectedVoiceId ?? null)
    const descChanged = snap.description !== (voiceDescription ?? "")
    const ultChanged = snap.ultimateMode !== (ultimateMode ?? false)
    setVoiceChangedSinceAudio(voiceChanged || descChanged || ultChanged)
  }, [selectedVoiceId, voiceDescription, ultimateMode, audioGenerated])

  // Shared helper: generate narrations via API. Returns the new narrations map, or null on failure.
  async function generateNarrations(
    targetSlides: ParsedSlide[],
    showRateLimitPrompt = true
  ): Promise<Record<number, string> | null> {
    if (targetSlides.length === 0) return null
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

      if (json.error === "quota_exhausted") {
        toastError(json.message || "The shared Gemini key has hit its daily limit. Add your own API key in Settings.")
        return null
      }

      if (json.error === "rate_limited") {
        if (showRateLimitPrompt) {
          const retryAfter = json.retryAfter as number | undefined
          if (retryAfter && retryAfter > 0) {
            const toastId = `rate-limit-${Date.now()}`
            let remaining = retryAfter
            const updateMsg = () => {
              if (remaining > 0) {
                toastError(`Rate limit reached. Try again in ${remaining}s, or add your own API key in Settings.`, { id: toastId })
                remaining--
              } else {
                clearInterval(rateLimitIntervalRef.current)
                rateLimitIntervalRef.current = undefined
              }
            }
            updateMsg()
            rateLimitIntervalRef.current = setInterval(updateMsg, 1000)
          } else {
            toastError(json.message || "Generation limit reached. Add your Gemini API key in Settings.")
          }
        }
        return null
      }

      if (json.error === "invalid_api_key") {
        toastError(json.message || "Your Gemini API key is invalid. Check Settings.")
        return null
      }

      if (json.error === "service_unavailable") {
        toastError(json.message || "Gemini is temporarily overloaded. Wait a moment and try again.")
        return null
      }

      if (json.data?.narrations && Object.keys(json.data.narrations).length > 0) {
        const updated = { ...narrations, ...json.data.narrations }
        setInternalNarrations(updated)
        onNarrationsChange?.(updated)
        originalNarrationsRef.current = { ...originalNarrationsRef.current, ...json.data.narrations }

        if (json.data.partial && Array.isArray(json.data.missingSlides) && json.data.missingSlides.length > 0) {
          toastError(
            `AI narration skipped ${json.data.missingSlides.length} slide(s): ${json.data.missingSlides.join(", ")}. ` +
            `Add narration manually or try again.`,
          )
        }
        return updated
      }

      return null
    } catch {
      if (showRateLimitPrompt) {
        toastError("Narration generation failed. Please check your connection and try again.")
      }
      return null
    }
    finally { setGeneratingNarrations(false) }
  }

  const current = slides[currentIndex]

  function updateNarration(text: string) {
    if (!current) return
    const slideNumber = current.number
    const next = { ...narrations, [slideNumber]: text }
    setInternalNarrations(next)
    onNarrationsChange?.(next)

    const original = originalNarrationsRef.current[slideNumber]
    if (text !== original) {
      if (!changedSlides.includes(slideNumber)) {
        const updatedChanged = [...changedSlides, slideNumber]
        setInternalChangedSlides(updatedChanged)
        onChangedSlidesChange?.(updatedChanged)
      }
    } else if (changedSlides.includes(slideNumber)) {
      const updatedChanged = changedSlides.filter((s) => s !== slideNumber)
      setInternalChangedSlides(updatedChanged)
      onChangedSlidesChange?.(updatedChanged)
    }
  }

  // Shared helper: run the sequential per-slide audio generation for the "Generate Audio" flow.
  // Determines which slides to process based on changedSlides.
  async function runAudioGeneration() {
    if (generatingAudio) return

    const slidesToGenerate = changedSlides.length > 0
      ? slides.filter((s) => changedSlides.includes(s.number))
      : slides

    const sorted = slidesToGenerate.slice().sort((a, b) => a.number - b.number)
    const slideTexts = sorted
      .map((s) => ({ number: s.number, text: narrations[s.number] || "", title: s.title }))
      .filter((s) => s.text.trim())

    if (slideTexts.length === 0) {
      toastError("No narration text to generate audio from.")
      return
    }

    // Show the unified modal (generating step)
    setIsInitialGenerate(true)
    setShowRegenModal(true)
    setRegenStep("generating")
    setAudioGenFailed(false)
    setAudioGenError(null)
    setGeneratingAudio(true)
    setAudioGenProgress({ current: 0, total: slideTexts.length })

    let failedCount = 0

    for (let i = 0; i < slideTexts.length; i++) {
      setAudioGenProgress({ current: i + 1, total: slideTexts.length, slideTitle: slideTexts[i].title })

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
            voice_id: selectedVoiceId || undefined,
          }),
        })

        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(typeof json.error === "string" ? json.error : `Slide ${slideTexts[i].number} failed`)
        }
      } catch (err) {
        failedCount++
        console.error(`[SlideEditor] Slide ${slideTexts[i].number} audio failed:`, err)
      }
    }

    setGenerationSummary({
      success: slideTexts.length - failedCount,
      failed: failedCount,
    })

    if (failedCount > 0) {
      setAudioGenFailed(true)
      setRegenStep("complete")
      setGeneratingAudio(false)
      setAudioGenProgress(null)
      return
    }

    // All slides generated successfully
    const combinedUrl = `/api/presentations/${presentationId}/audio/combined`
    setInternalAudioUrl(combinedUrl)
    onAudioUrlChange?.(combinedUrl)
    setInternalAudioGenerated(true)
    onAudioGeneratedChange?.(true)
    generatedWithVoiceRef.current = { voiceId: selectedVoiceId ?? null, description: voiceDescription ?? "", ultimateMode: ultimateMode ?? false }
    setRegenStep("complete")
    setGeneratingAudio(false)
    setAudioGenProgress(null)
  }

  async function handleGenerate(
    selectedSlides?: Set<number>,
    reason: 'voice_changed' | 'content_changed' = 'voice_changed',
  ) {
    setGenerating(true)
    setLastRegenCount(selectedSlides?.size ?? 0)

    const targetSlides = selectedSlides
      ? slides.filter((s) => selectedSlides.has(s.number))
      : slides

    // When reason is 'voice_changed' (settings change, not content change),
    // skip Gemini and use existing narrations. This prevents unnecessary
    // Gemini calls that fail on sparse slide content.
    let currentNarrations: Record<number, string> = { ...narrations }
    if (reason === 'content_changed') {
      const result = await generateNarrations(targetSlides, false)
      if (result) {
        currentNarrations = result
        setGenerationFailed(false)
      }
    }

    // Build the list of slides needing audio, using the latest narrations
    const sorted = targetSlides.slice().sort((a, b) => a.number - b.number)
    const slideTexts = sorted
      .map((s) => ({ number: s.number, text: currentNarrations[s.number] || "" }))
      .filter((s) => s.text.trim())

    let failedCount = 0

    if (slideTexts.length > 0) {
      for (let i = 0; i < slideTexts.length; i++) {
        try {
          const res = await fetch("/api/generate/audio/slide", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slide_number: slideTexts[i].number,
              text: slideTexts[i].text,
              voice_id: selectedVoiceId || undefined,
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
          failedCount++
          console.error(`[SlideEditor] Slide ${slideTexts[i].number} audio failed:`, err)
        }
      }
    }

    setGenerationSummary({
      success: slideTexts.length - failedCount,
      failed: failedCount,
    })

    if (failedCount > 0) {
      setGenerating(false)
      return
    }

    // All slides generated successfully
    const combinedUrl = `/api/presentations/${presentationId}/audio/combined`
    setInternalAudioUrl(combinedUrl)
    onAudioUrlChange?.(combinedUrl)
    setInternalAudioGenerated(true)
    onAudioGeneratedChange?.(true)
    generatedWithVoiceRef.current = { voiceId: selectedVoiceId ?? null, description: voiceDescription ?? "", ultimateMode: ultimateMode ?? false }

    // Clear changed status for regenerated slides
    if (selectedSlides) {
      const remaining = changedSlides.filter((s) => !selectedSlides.has(s))
      setInternalChangedSlides(remaining)
      onChangedSlidesChange?.(remaining)
    } else {
      setInternalChangedSlides([])
      onChangedSlidesChange?.([])
    }

    setGenerating(false)
  }

  function jumpToSlide(slideNumber: number) {
    const idx = Math.max(0, Math.min(slideNumber - 1, total - 1))
    setInternalIndex(idx)
    onCurrentSlideChange?.(idx)
    setSlideInput(String(idx + 1))
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
        toastError("Failed to remove PPTX. Please try again.")
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
      setPdfUrls([])
      setConversionStatus("uploading")
      setConversionError("")
      onSlideDataChange?.([])
      setInternalChangedSlides([])
      onChangedSlidesChange?.([])
      setGenerationFailed(false)
      setGeneratingNarrations(false)
      setSlideInput("1")

      setInternalAudioUrl(null)
      onAudioUrlChange?.(null)
      onAudioStoragePathChange?.(null)

      // Signal parent to switch mode to upload
      onRemovePpt?.()
    } catch {
      toastError("Failed to remove PPTX")
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
      originalNarrationsRef.current = {}
      generatedWithVoiceRef.current = null
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
        generateNarrations(slidesToRegen, false).then((result) => {
          if (!result) setGenerationFailed(true)
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
            // Always save the path so state persists (upload may fail locally but works on Vercel)
            onStoragePathChange?.(json.data.path)
            // Try upload in background (non-blocking)
            void (async () => {
              try {
                const uploadRes = await fetch(json.data.presignedUrl, {
                  method: "PUT",
                  body: pendingFile,
                  headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
                })
                if (uploadRes.ok) {
                  const reSlideCount = pendingSlides.length > 0 ? pendingSlides.length : 1
                  const confirmRes = await fetch(`/api/presentations/${presentationId}/upload/confirm`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ path: json.data.path, slideCount: reSlideCount }),
                  })
                  if (confirmRes.ok) {
                    setConversionStatus("converting")
                    pollForPdfs(presentationId, reSlideCount)
                  }
                }
              } catch (err) { console.error("[SlideEditor] Operation failed:", err) }
            })()
          }
        } catch {
          toastError("Re-upload failed. Please try again.")
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
      <>
        <div className="flex flex-1 flex-col">
          <div className="relative flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-100 p-8">
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
        </div>
        {/* Right panel skeleton — never removed from DOM during loading */}
        <div className="absolute bottom-0 right-0 top-0 z-20 hidden w-[380px] animate-pulse flex-col gap-5 overflow-y-auto border-l border-[var(--color-border-faint)] bg-white p-6 lg:flex hide-scrollbar">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-10 rounded bg-zinc-200" />
              <div className="h-6 w-12 rounded border border-zinc-200 bg-zinc-50" />
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
      </>
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
      <div className="flex flex-1 flex-col">
      {/* Left — PDF-based slide viewer */}
      <div className="relative flex flex-1 flex-col bg-zinc-100">
        {/* Processing overlay during re-upload */}
        {reUploading ? (
          <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#71717A]" />
            <p className="text-sm text-[#71717A]">Processing PPTX...</p>
          </div>
        ) : conversionStatus === "uploading" || conversionStatus === "converting" ? (
          <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
            {/* Step 1: Uploading */}
            <div className="flex items-center gap-3">
              {conversionStatus === "uploading" ? (
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              <div>
                <p className={`text-sm font-medium ${conversionStatus === "uploading" ? "text-zinc-700" : "text-zinc-500"}`}>
                  Uploading to storage
                </p>
                {conversionStatus === "uploading" && uploadProgress > 0 && (
                  <p className="text-xs text-zinc-400">{uploadProgress}%</p>
                )}
              </div>
            </div>

            {/* Step 2: Converting */}
            <div className="flex items-center gap-3">
              {conversionStatus === "converting" ? (
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              <div>
                <p className={`text-sm font-medium ${conversionStatus === "converting" ? "text-zinc-700" : "text-zinc-500"}`}>
                  Converting to PDF
                </p>
                {conversionStatus === "converting" && (
                  <p className="text-xs text-zinc-400">
                    ~{Math.min(Math.round(pollAttempts * 2), 60)} seconds elapsed
                  </p>
                )}
              </div>
            </div>

            {/* Linear progress bar */}
            <div className="h-1.5 w-64 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-zinc-600 transition-all duration-500"
                style={{
                  width: conversionStatus === "uploading"
                    ? `${Math.max(uploadProgress, 10)}%`
                    : "90%",
                }}
              />
            </div>

            <p className="text-xs text-zinc-400">This should take about 15–30 seconds</p>
          </div>
        ) : conversionStatus === "error" ? (
          <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 p-8">
            <p className="text-sm text-amber-600">Failed to convert presentation.</p>
            <p className="text-xs text-zinc-400">{conversionError || "The conversion server may be unavailable."}</p>
            <button
              type="button"
              onClick={() => {
                setConversionStatus("uploading")
                setConversionError("")
                setPollAttempts(0)
                // Re-trigger upload flow
                window.location.reload()
              }}
              className="mt-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
            >
              Retry
            </button>
          </div>
        ) : pdfUrls.length > 0 ? (
          <>
            <div className="relative flex flex-1 items-center justify-center p-4">
              <SlidePdfViewer
                pdfUrl={pdfUrls[currentIndex] ?? null}
                onLoadError={() => {
                  console.error(`[Editor] Failed to load PDF for slide ${currentIndex + 1}`)
                }}
              />
            </div>
            <div className="absolute bottom-3 right-3 flex flex-wrap justify-end gap-1.5">
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
              {pdfUrls[currentIndex] && (
                <a
                  href={pdfUrls[currentIndex]!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-[#71717A] shadow-sm transition-colors hover:text-[#18181B]"
                >
                  <ExternalLink className="h-3 w-3" />
                  Full screen
                </a>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-[60vh] items-center justify-center">
            <p className="text-sm text-[#71717A]">Presentation could not be loaded.</p>
          </div>
        )}
      </div>
      </div>{/* end left viewer wrapper */}

      {/* Desktop right panel */}
      <div className="absolute bottom-0 right-0 top-0 z-20 hidden w-[380px] flex-col gap-5 overflow-y-auto border-l border-[var(--color-border-faint)] bg-white p-6 lg:flex hide-scrollbar">
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#18181B]/40 p-4">
            <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-xl">
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
              <div className="max-h-[50vh] overflow-y-auto px-5 pb-4 hide-scrollbar">
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
          {generatingNarrations && !narrations[current.number] ? (
            <div className="min-h-[120px] animate-pulse rounded-lg bg-zinc-100" />
          ) : (
            <Textarea
              value={narrations[current.number] ?? ""}
              onChange={(e) => updateNarration(e.target.value)}
              placeholder={
                generatingNarrations
                  ? "Generating AI narration..."
                  : "AI-generated narration will appear here..."
              }
              className="min-h-[120px] resize-none text-sm"
            />
          )}
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
              const result = await generateNarrations(slides, true)
              if (!result) setGenerationFailed(true)
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
            onClick={runAudioGeneration}
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

        {/* Retry after audio generation failure */}
        {audioGenFailed && (
          <Button
            onClick={async () => {
              setAudioGenFailed(false)
              setAudioGenError(null)
              // Trigger generation immediately after clearing error
              await runAudioGeneration()
            }}
            variant="outline"
            className="w-full"
          >
            Retry
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

            {/* Voice changed banner */}
            {voiceChangedSinceAudio && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Voice settings changed. Regenerate audio to apply the new voice.
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
              <AudioPlayer
                audioUrl={audioUrl}
                presentationId={presentationId}
                slideNumber={currentIndex + 1}
                onError={() => {
                  setInternalAudioGenerated(false)
                  onAudioGeneratedChange?.(false)
                  setInternalAudioUrl(null)
                  onAudioUrlChange?.(null)
                  onAudioStoragePathChange?.(null)
                }}
              />
            )}

            {/* Share & Track button */}
            {audioGenerated && (
              <Button
                onClick={() => setShowShareModal(true)}
                variant="outline"
                className="w-full"
              >
                <Share2 className="h-4 w-4" />
                Share & Track Viewers
              </Button>
            )}
          </>
        )}
      </div>

      {/* Mobile toggle button — shown on < lg screens when panel is closed */}
      {!showMobilePanel && (
        <button
          type="button"
          onClick={() => setShowMobilePanel(true)}
          className="fixed right-3 bottom-20 z-30 inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full border border-zinc-200 bg-white shadow-lg text-zinc-600 transition-colors hover:text-zinc-900 lg:hidden"
          aria-label="Open controls panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </button>
      )}

      {/* Mobile drawer — overlay + slide-in panel */}
      {showMobilePanel && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobilePanel(false)} />
          {/* Panel */}
          <div className="absolute bottom-0 right-0 left-0 z-10 max-h-[75vh] flex-col gap-4 overflow-y-auto rounded-t-2xl border-t border-zinc-200 bg-white p-5 shadow-xl animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-zinc-500">Controls</span>
              <button
                type="button"
                onClick={() => setShowMobilePanel(false)}
                className="touch-target-sm rounded-lg text-zinc-400 hover:text-zinc-600"
                aria-label="Close panel"
              >
                ✕
              </button>
            </div>

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
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#18181B]/40 p-4">
                <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-xl">
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
                  <div className="max-h-[50vh] overflow-y-auto px-5 pb-4 hide-scrollbar">
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
              {generatingNarrations && !narrations[current.number] ? (
                <div className="min-h-[120px] animate-pulse rounded-lg bg-zinc-100" />
              ) : (
                <Textarea
                  value={narrations[current.number] ?? ""}
                  onChange={(e) => updateNarration(e.target.value)}
                  placeholder={
                    generatingNarrations
                      ? "Generating AI narration..."
                      : "AI-generated narration will appear here..."
                  }
                  className="min-h-[120px] resize-none text-sm"
                />
              )}
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
                onClick={runAudioGeneration}
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

            {/* Retry after audio generation failure */}
            {audioGenFailed && (
              <Button
                onClick={async () => {
                  setAudioGenFailed(false)
                  setAudioGenError(null)
                  // Trigger generation immediately after clearing error
                  await runAudioGeneration()
                }}
                variant="outline"
                className="w-full"
              >
                Retry
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

                {/* Voice changed banner */}
                {voiceChangedSinceAudio && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    Voice settings changed. Regenerate audio to apply the new voice.
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
                  <AudioPlayer
                    audioUrl={audioUrl}
                    presentationId={presentationId}
                    slideNumber={currentIndex + 1}
                    onError={() => {
                      setInternalAudioGenerated(false)
                      onAudioGeneratedChange?.(false)
                      setInternalAudioUrl(null)
                      onAudioUrlChange?.(null)
                      onAudioStoragePathChange?.(null)
                    }}
                  />
                )}

                {/* Share & Track button */}
                {audioGenerated && (
                  <Button
                    onClick={() => setShowShareModal(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <Share2 className="h-4 w-4" />
                    Share & Track Viewers
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      )}

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

      {/* Share modal */}
      {showShareModal && (
        <SharePresentationModal
          presentationId={presentationId}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Regenerate modal — unified 3-step flow */}
      {showRegenModal && (
        <RegenerateModal
          slides={slides}
          changedSlides={changedSlides}
          voiceChangedSinceAudio={voiceChangedSinceAudio}
          onNavigate={(num) => jumpToSlide(num)}
          onConfirm={() => {
            setRegenStep("generating")
            setShowRegenModal(true)
            handleGenerate(voiceChangedSinceAudio ? undefined : new Set(changedSlides), "voice_changed")
              .then(() => {
                // After generation finishes (even with partial failures), show complete step
                setRegenStep("complete")
              })
              .catch(() => {
                setRegenStep("complete")
              })
          }}
          onCancel={() => {
            if (generating && !isInitialGenerate) {
              // Hard cancel during regen — reload to reset state
              window.location.reload()
              return
            }
            setShowRegenModal(false)
            setTimeout(() => {
              setRegenStep("review")
              setGenerationSummary(null)
              setIsInitialGenerate(false)
            }, 200)
          }}
          step={regenStep}
          generationError={null}
          audioGenProgress={audioGenProgress}
          generationSummary={generationSummary}
          onRetry={() => {
            setRegenStep("generating")
            setGenerating(true)
            handleGenerate(voiceChangedSinceAudio ? undefined : new Set(changedSlides), "voice_changed")
              .then(() => setRegenStep("complete"))
              .catch(() => setRegenStep("complete"))
          }}
        />
      )}

      {/* Audio generation progress is now shown inside the unified RegenerateModal */}
    </>
  )
}
