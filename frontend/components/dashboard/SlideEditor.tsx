"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Play, Loader2, ExternalLink, FileText, ChevronRight, Share2, Check, RefreshCw, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { parsePptxText, type ParsedSlide, type SlideImage, type SlideComment } from "@/lib/pptx-renderer"
import { compareSlides, type SlideDiff } from "@/lib/pptx-renderer"
import { describeSlideImages } from "@/lib/image-analysis"
import { toastSuccess, toastError } from "@/components/ui/CustomToast"
import { parallelBatches } from "@/lib/async"
import { ReUploadModal } from "./ReUploadModal"
import { RegenerateModal, type RegenStep } from "./RegenerateModal"
import { SlideParsedData } from "./SlideParsedData"
import { AudioPlayer } from "./AudioPlayer"
import { SharePresentationModal } from "./SharePresentationModal"
import { SlidePdfViewer } from "@/components/shared/SlidePdfViewer"
import { useFullscreen } from "@/lib/use-fullscreen"

type Voice = {
  id: string
  name: string
  type: "preset" | "cloned"
  preset_id: string | null
  control_instruction: string | null
  gender?: "male" | "female" | "neutral" | null
}

type ImageDesc = { index: number; description: string; error?: string }

export function SlideEditor({
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
  imageDescriptions: externalImageDescriptions,
  onImageDescriptionsChange,
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
  parsedImageKeys: externalParsedImageKeys,
  onParsedImageKeysChange,
}: {
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
  slideData?: { number?: number; title: string; bullets: string[]; notes?: string | null; comments?: SlideComment[]; images?: SlideImage[]; rawText?: string }[]
  onSlideDataChange?: (v: { number?: number; title: string; bullets: string[]; notes?: string | null; comments?: SlideComment[]; images?: SlideImage[]; rawText?: string }[]) => void
  /** R2 keys for parsed images: key = "${slideNumber}-${imageIndex}", value = R2 key */
  parsedImageKeys?: Record<string, string>
  onParsedImageKeysChange?: (v: Record<string, string>) => void
  imageDescriptions?: Record<number, { index: number; description: string; error?: string }[]>
  onImageDescriptionsChange?: (v: Record<number, { index: number; description: string; error?: string }[]>) => void
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
  const [blobPdfUrls, setBlobPdfUrls] = useState<(string | null)[]>([])
  const blobUrlsRef = useRef<string[]>([])
  const [conversionStatus, setConversionStatus] = useState<"uploading" | "converting" | "ready" | "error">("uploading")
  const [conversionError, setConversionError] = useState("")
  const [pollAttempts, setPollAttempts] = useState(0)
  const [showSlideInfo, setShowSlideInfo] = useState(false)
  const [internalNarrations, setInternalNarrations] = useState<Record<number, string>>({})
  const [imageDescLoading, setImageDescLoading] = useState(false)
  const [imageDescError, setImageDescError] = useState<string | null>(null)
  const handleBatchResult = useCallback((cache: Record<number, ImageDesc[]>) => {
    onImageDescriptionsChange?.(cache)
  }, [onImageDescriptionsChange])
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
  const [retryCount, setRetryCount] = useState(0)
  const [voices, setVoices] = useState<Voice[]>([])
  const [voicesLoading, setVoicesLoading] = useState(true)
  const originalNarrationsRef = useRef<Record<number, string>>({})
  const generatedWithVoiceRef = useRef<{ voiceId: string | null; description: string; ultimateMode: boolean } | null>(null)

  // Fetch user voices
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        if (!user) { setVoicesLoading(false); return }
        return supabase
          .from("voices")
          .select("id, name, type, preset_id, control_instruction, gender")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .then(({ data }) => {
            if (data) setVoices(data as Voice[])
            setVoicesLoading(false)
          })
      })
      .catch((err) => {
        console.error("[SlideEditor] Voices fetch failed:", err)
        setVoicesLoading(false)
      })
  }, [])

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
          const slides = json.data.slides || []
          // Defense: don't trust completed=true unless we have the expected number of slides.
          // Before the confirm route sets slide_count in the DB, the API returns
          // completed=true with zero slides (slideCount=0), causing "could not be loaded".
          if (slides.length < slideCount) {
            // Keep polling — conversion is still in progress
            setTimeout(poll, POLL_INTERVAL)
            return
          }
          const urls: (string | null)[] = []
          for (const slide of slides) {
            urls[slide.slideNumber - 1] = slide.pdfUrl
          }
          setPdfUrls(urls)
          // Prefetch all PDFs as blobs for instant slide navigation
          prefetchEditorPdfBlobs(urls)
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

  /** Fetch all PDFs as blobs and create Object URLs — instant slide nav in editor */
  function prefetchEditorPdfBlobs(urls: (string | null)[]) {
    const oldUrls = blobUrlsRef.current
    const newBlobUrls: (string | null)[] = []
    const urlList: string[] = []
    Promise.allSettled(
      urls.map(async (url, i) => {
        if (!url) return
        try {
          const res = await fetch(url)
          if (!res.ok) return
          const blob = await res.blob()
          const blobUrl = URL.createObjectURL(blob)
          newBlobUrls[i] = blobUrl
          urlList.push(blobUrl)
        } catch {
          // Fall back to signed URL if blob fails
        }
      })
    ).then(() => {
      // Revoke old blob URLs ONLY AFTER new ones are ready — prevents PDF.js
      // from hitting "Unexpected server response (0)" when a blob is yanked mid-read.
      for (const url of oldUrls) URL.revokeObjectURL(url)
      blobUrlsRef.current = urlList
      setBlobPdfUrls(newBlobUrls)
    })
  }

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      for (const url of blobUrlsRef.current) {
        URL.revokeObjectURL(url)
      }
    }
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

      // Extract text content for slides (parse early to get slide count)
      let parsedSlides: ParsedSlide[] | null = null
      if (externalSlideData && externalSlideData.length > 0 && !file) {
        // Restore from saved editor state (includes notes, comments when available)
        parsedSlides = externalSlideData.map((s, i) => ({
          number: (s as { number?: number }).number ?? i + 1,
          title: s.title,
          bullets: s.bullets,
          notes: (s as any).notes ?? null,
          comments: (s as any).comments ?? [],
          images: (s as any).images ?? [], // Will be loaded from R2 if parsedImageKeys exist
          rawText: (s as any).rawText || s.title + (s.bullets.length > 0 ? "\n" + s.bullets.join("\n") : ""),
        })) as ParsedSlide[]
        if (!cancelled) {
          setSlides(parsedSlides)
          setInternalIndex(externalCurrentSlide ?? 0)

          // Load images from R2 if we have saved keys
          if (externalParsedImageKeys && Object.keys(externalParsedImageKeys).length > 0) {
            loadImagesFromParsedKeys(presentationId, externalParsedImageKeys, parsedSlides)
              .then((updatedSlides) => {
                if (!cancelled) setSlides(updatedSlides)
              })
              .catch(() => {}) // best-effort; slides work without images
          }
        }
      } else if (file) {
        // Parse from uploaded file
        try {
          parsedSlides = await parsePptxText(file!)
          if (!cancelled) {
            setSlides(parsedSlides)

            // Persist slide data (notes, comments, rawText — but NOT images which are huge base64)
            onSlideDataChange?.(parsedSlides.map(({ number, title, bullets, notes, comments, rawText }) => ({ number, title, bullets, notes, comments, rawText })))

            // Save parsed images to R2 for cross-session persistence (fire-and-forget)
            saveParsedImagesToR2(presentationId, parsedSlides, onParsedImageKeysChange)

            setInternalIndex(externalCurrentSlide ?? 0)
          }
        } catch {
          if (!cancelled) setLoadError("Failed to read presentation content.")
        }
      }

      // Post-upload logic: confirm upload and poll for PDF conversion
      // Only runs after the XHR upload succeeds, preventing a broken state
      // where the confirm route marks the presentation as "ready" before the
      // file actually arrives in storage.
      async function afterUpload(path: string) {
        if (path) {
          const slideCount = parsedSlides?.length ?? 1

          if (file) {
            // Fresh upload: confirm upload and trigger worker conversion
            try {
              const confirmRes = await fetch(`/api/presentations/${presentationId}/upload/confirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path, slideCount }),
              })
            if (!confirmRes.ok) {
              const errBody = await confirmRes.json().catch(() => ({}))
              const errMsg = errBody.error || `Server error (${confirmRes.status})`
              if (!cancelled) setLoadError(`Failed to confirm upload: ${errMsg}`)
            } else if (!cancelled) {
              const confirmJson = await confirmRes.json()
              if (confirmJson.warning) {
                toastSuccess(confirmJson.warning)
              }
              setConversionStatus("converting")
              pollForPdfs(presentationId, slideCount)
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : "Unknown error"
            console.error("[Upload] Confirm failed:", errMsg)
            if (!cancelled) setLoadError(`Failed to confirm upload: ${errMsg}`)
          }
          } else {
            // Reload with existing storage path: skip confirm, check for PDFs directly
            setConversionStatus("converting")
            pollForPdfs(presentationId, slideCount)
          }
        }

        if (!cancelled) { setLoading(false); setUploadProgress(0) }
      }

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
            const xhr = new XMLHttpRequest()
            xhr.open("PUT", json.data.presignedUrl)
            xhr.setRequestHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation")
            xhr.timeout = 120_000 // 2 min
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                setUploadProgress(Math.round((e.loaded / e.total) * 100))
              }
            }
            xhr.onload = () => {
              if (xhr.status === 200) {
                afterUpload(path)
              } else {
                console.error("[Upload] XHR error — status", xhr.status)
                setLoadError("Upload failed. Check your connection and try again.")
              }
            }
            xhr.onerror = () => {
              console.error("[Upload] XHR error — upload failed")
              setLoadError("Upload failed. Check your connection and try again.")
            }
            xhr.ontimeout = () => {
              console.error("[Upload] XHR timeout — upload timed out")
              setLoadError("Upload timed out. Try a smaller file or check your connection.")
            }
            xhr.send(file)
          }
        } catch {
          if (!cancelled) setLoadError("Failed to upload presentation.")
        }
      } else {
        path = externalStoragePath!
        await afterUpload(path)
      }
    }

    processFile()
    return () => { cancelled = true }
  }, [file, presentationId, retryCount])

  // ── Parsed image persistence helpers ──────────────────────────

  /** Save parsed slide images to R2 for cross-session persistence. */
  async function saveParsedImagesToR2(
    presId: string,
    slides: ParsedSlide[],
    onKeysChange?: (v: Record<string, string>) => void,
  ) {
    try {
      const payload = {
        slides: slides.map((s) => ({
          number: s.number,
          images: s.images.map((img) => ({
            index: img.index,
            mimeType: img.mimeType,
            data: img.dataUrl.replace(/^data:image\/\w+;base64,/, ""),
          })),
        })),
      }
      const res = await fetch(`/api/presentations/${presId}/parsed-images/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.data?.keys && onKeysChange) {
        onKeysChange(json.data.keys)
      }
    } catch (err) {
      console.warn("[parsed-images] Save failed (non-critical):", err)
    }
  }

  /** Load parsed images from R2 using saved keys, return updated slides array. */
  async function loadImagesFromParsedKeys(
    presId: string,
    keys: Record<string, string>,
    currentSlides: ParsedSlide[],
  ): Promise<ParsedSlide[]> {
    try {
      const res = await fetch(`/api/presentations/${presId}/parsed-images/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: Object.values(keys) }),
      })
      const json = await res.json()
      const imageUrls = json.data?.images as Record<string, string | null> | undefined
      if (!imageUrls) return currentSlides

      // Build lookup: compositeKey → signed URL
      const keyToUrl = new Map(Object.entries(imageUrls))
      const compositeToKey = new Map(Object.entries(keys))

      return currentSlides.map((slide) => {
        const images = slide.images.map((img) => {
          const compositeKey = `${slide.number}-${img.index}`
          const r2Key = compositeToKey.get(compositeKey)
          const signedUrl = r2Key ? keyToUrl.get(r2Key) : null
          if (signedUrl) {
            return { ...img, dataUrl: signedUrl, r2Key }
          }
          return img
        })
        return { ...slide, images }
      })
    } catch (err) {
      console.warn("[parsed-images] Load failed (non-critical):", err)
      return currentSlides
    }
  }

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

  // Compute voice change message for the banner
  const voiceChangeMessage = (() => {
    if (!voiceChangedSinceAudio) return ""
    const snap = generatedWithVoiceRef.current
    if (!snap) return "Voice settings changed. Regenerate audio to apply."

    const oldVoice = voices.find((v) => v.id === snap.voiceId)
    const newVoice = voices.find((v) => v.id === selectedVoiceId)
    const oldName = oldVoice?.name ?? snap.voiceId ?? "previous voice"
    const newName = newVoice?.name ?? selectedVoiceId ?? "new voice"

    if (oldName !== newName) return `Voice changed from "${oldName}" to "${newName}". Regenerate audio to apply.`
    if (snap.description !== (voiceDescription ?? "")) return "Voice description changed. Regenerate audio to apply."
    if (snap.ultimateMode !== (ultimateMode ?? false)) return "Ultimate clone mode changed. Regenerate audio to apply."
    return "Voice settings changed. Regenerate audio to apply."
  })()

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
          presentationId,
          voiceId: selectedVoiceId || undefined,
          voiceType: selectedVoiceId ? (voices.find(v => v.id === selectedVoiceId)?.type || "preset") : undefined,
          voiceName: selectedVoiceId ? voices.find(v => v.id === selectedVoiceId)?.name : undefined,
          controlInstruction: voiceDescription || undefined,
          ultimateMode: ultimateMode ?? false,
          // Pass image descriptions so Gemini can incorporate visual context into narration
          imageDescriptions: externalImageDescriptions,
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
    if (!selectedVoiceId) {
      toastError("Select a voice before generating audio.")
      return
    }

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
    // Snapshot voice settings at START of generation — mid-generation changes are ignored
    generatedWithVoiceRef.current = { voiceId: selectedVoiceId ?? null, description: voiceDescription ?? "", ultimateMode: ultimateMode ?? false }

    try {
      await parallelBatches(
        slideTexts,
        async (slide) => {
          const res = await fetch("/api/generate/audio/slide", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slide_number: slide.number,
              text: slide.text,
              voice_description: voiceDescription || "Natural, clear, professional speaking voice",
              cfg_value: 2.0,
              presentation_id: presentationId,
              voice_id: selectedVoiceId || undefined,
            }),
          })

          if (!res.ok) {
            const json = await res.json().catch(() => ({}))
            throw new Error(typeof json.error === "string" ? json.error : `Slide ${slide.number} failed`)
          }
        },
        (completed, total) => {
          setAudioGenProgress({ current: completed, total, slideTitle: slideTexts[completed - 1]?.title })
        },
        3,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : "Audio generation failed"
      console.error(`[SlideEditor] Audio generation failed:`, message)
      setAudioGenError(message)
      setAudioGenFailed(true)
      setRegenStep("complete")
      setGeneratingAudio(false)
      setAudioGenProgress(null)
      return
    }

    setGenerationSummary({
      success: slideTexts.length,
      failed: 0,
    })

    // Rebuild combined.wav atomically from all per-slide WAVs, then bump audio_version.
    // This prevents race conditions where viewers see stale or partial combined audio.
    try {
      const res = await fetch(`/api/presentations/${presentationId}/audio/rebuild`, { method: "POST" })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Rebuild failed (HTTP ${res.status})`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Audio rebuild failed"
      console.error(`[SlideEditor] Rebuild failed:`, message)
      setAudioGenError(message)
      setAudioGenFailed(true)
      toastError(message)
      setRegenStep("complete")
      setGeneratingAudio(false)
      setAudioGenProgress(null)
      return
    }

    // All slides generated successfully — use cache-busting param to force AudioPlayer re-fetch
    const combinedUrl = `/api/presentations/${presentationId}/audio/combined?v=${Date.now()}`
    setInternalAudioUrl(combinedUrl)
    onAudioUrlChange?.(combinedUrl)
    setInternalAudioGenerated(true)
    onAudioGeneratedChange?.(true)
    setRegenStep("complete")
    setGeneratingAudio(false)
    setAudioGenProgress(null)

    // Warm the combined audio cache so the AudioPlayer doesn't hit a cold start
    fetch(combinedUrl, { method: "HEAD" }).catch(() => {})
  }

  async function handleGenerate(selectedSlides?: Set<number>) {
    if (!selectedVoiceId) {
      toastError("Select a voice before generating audio.")
      setGenerating(false)
      return
    }
    setGenerating(true)
    setLastRegenCount(selectedSlides?.size ?? 0)

    const targetSlides = selectedSlides
      ? slides.filter((s) => selectedSlides.has(s.number))
      : slides

    // Use current narration text — no Gemini re-generation.
    // If the user wants fresh AI narrations, there's a separate "Re-generate AI" button.
    const sorted = targetSlides.slice().sort((a, b) => a.number - b.number)
    const slideTexts = sorted
      .map((s) => ({ number: s.number, text: narrations[s.number] || "", title: s.title }))
      .filter((s) => s.text.trim())

    // Show progress — set initial state before generation
    setAudioGenProgress({ current: 0, total: slideTexts.length })

    // Snapshot voice settings at START of generation — mid-generation changes are ignored
    generatedWithVoiceRef.current = { voiceId: selectedVoiceId ?? null, description: voiceDescription ?? "", ultimateMode: ultimateMode ?? false }

    if (slideTexts.length > 0) {
      try {
        await parallelBatches(
          slideTexts,
          async (slide) => {
            const res = await fetch("/api/generate/audio/slide", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                slide_number: slide.number,
                text: slide.text,
                voice_id: selectedVoiceId || undefined,
                voice_description: voiceDescription || "Natural, clear, professional speaking voice",
                cfg_value: 2.0,
                presentation_id: presentationId,
              }),
            })

            if (!res.ok) {
              const json = await res.json().catch(() => ({}))
              throw new Error(typeof json.error === "string" ? json.error : `Slide ${slide.number} failed`)
            }
          },
          (completed, total) => {
            setAudioGenProgress({ current: completed, total, slideTitle: slideTexts[completed - 1]?.title })
          },
          3,
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : "Audio generation failed"
        console.error(`[SlideEditor] Audio generation failed:`, message)
        setAudioGenError(message)
        setAudioGenFailed(true)
        setGenerating(false)
        setAudioGenProgress(null)
        return
      }
    }

    setGenerationSummary({
      success: slideTexts.length,
      failed: 0,
    })

    // Rebuild combined.wav atomically, then bump audio_version
    try {
      const res = await fetch(`/api/presentations/${presentationId}/audio/rebuild`, { method: "POST" })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Rebuild failed (HTTP ${res.status})`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Audio rebuild failed"
      console.error(`[SlideEditor] Rebuild failed:`, message)
      setAudioGenError(message)
      setAudioGenFailed(true)
      toastError(message)
      setGenerating(false)
      setAudioGenProgress(null)
      return
    }

    // All slides generated successfully — use cache-busting param to force AudioPlayer re-fetch
    const combinedUrl = `/api/presentations/${presentationId}/audio/combined?v=${Date.now()}`
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

    setGenerating(false)
    setAudioGenProgress(null)

    // Warm the combined audio cache so the AudioPlayer doesn't hit a cold start
    fetch(combinedUrl, { method: "HEAD" }).catch(() => {})
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
    const activeSlideNumbers = pendingSlides.map((_, i) => i + 1)
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

    // Replace slide data — persist notes, comments, rawText (NOT images — huge base64)
    setSlides(pendingSlides)
    onSlideDataChange?.(pendingSlides.map(({ number, title, bullets, notes, comments, rawText }) => ({ number, title, bullets, notes, comments, rawText })))

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
                  const reSlideCount = activeSlideNumbers.length > 0 ? activeSlideNumbers.length : 1
                  const confirmRes = await fetch(`/api/presentations/${presentationId}/upload/confirm`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ path: json.data.path, slideCount: reSlideCount }),
                  })
                  if (confirmRes.ok) {
                    const confirmJson = await confirmRes.json()
                    if (confirmJson.warning) {
                      toastSuccess(confirmJson.warning)
                    }
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
      fetch(`/api/presentations/${presentationId}/slides/cleanup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeSlideNumbers }),
      }).catch(() => {})
    } else {
      fetch(`/api/presentations/${presentationId}/slides/cleanup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeSlideNumbers }),
      }).catch(() => {})
      setReUploading(false)
      setPendingFile(null)
    }
  }

  const slideViewerRef = useRef<HTMLDivElement>(null)
  const fullscreenContainerRef = useRef<HTMLElement | null>(null)
  const { isFullscreen, supported, toggle } = useFullscreen()
  const [fitToScreen, setFitToScreen] = useState(false)
  const [, forceRender] = useState(0)

  // Re-render on window resize so the slide width recalculates dynamically
  useEffect(() => {
    function onResize() { forceRender((n) => n + 1) }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // Add/remove body class for fullscreen to hide navbar/sidebar outside this component
  useEffect(() => {
    if (isFullscreen) {
      document.body.classList.add("editor-fullscreen")
    } else {
      document.body.classList.remove("editor-fullscreen")
    }
    return () => document.body.classList.remove("editor-fullscreen")
  }, [isFullscreen])

  const currentSlideNum = current?.number ?? 0
  const totalSlides = slides.length

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
      if (e.key === "Escape" && showMobilePanel && !showRegenModal && !showShareModal && !showReUpload) {
        setShowMobilePanel(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [slides, currentIndex])

  if (loading) {
    return (
      <>
        <div className="flex flex-1 flex-col">
          <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4 bg-zinc-100 p-8">
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

  function handleLoadRetry() {
    setLoadError("")
    setLoading(true)
    setRetryCount((c) => c + 1)
  }

  if (loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-red-600">{loadError}</p>
        <button
          type="button"
          onClick={handleLoadRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
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
      <div className="flex min-w-0 flex-1 flex-col">
      {/* Left — PDF-based slide viewer */}
      <div ref={(el) => { if (el) fullscreenContainerRef.current = el }} className="relative flex min-w-0 flex-1 flex-col bg-zinc-100">
        {/* Processing overlay during re-upload */}
        {reUploading ? (
          <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#71717A]" />
            <p className="text-sm text-[#71717A]">Processing PPTX...</p>
          </div>
        ) : conversionStatus === "uploading" && file ? (
          /* Fresh upload: show upload + convert progress */
          <div className="mx-auto flex w-[340px] flex-col items-center justify-center gap-6">
            {/* Step 1: Uploading */}
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[#18181B]" />
              <div>
                <p className="text-sm font-medium text-[#18181B]">
                  Uploading to storage
                </p>
                {uploadProgress > 0 && (
                  <p className="text-xs text-zinc-400">{uploadProgress}%</p>
                )}
              </div>
            </div>

            {/* Linear progress bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-zinc-600 transition-all duration-500"
                style={{ width: `${Math.max(uploadProgress, 10)}%` }}
              />
            </div>

            <p className="text-xs text-zinc-400">Uploading your presentation…</p>
          </div>
        ) : conversionStatus === "converting" ? (
          /* Converting (fresh upload) or loading (reload) — stable width */
          <div className="mx-auto flex w-[340px] flex-col items-center justify-center gap-5">
            {/* Step 1: Uploading (already done) */}
            {file && (
              <div className="flex items-center gap-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <p className="text-sm font-medium text-zinc-500">
                  Uploaded to storage
                </p>
              </div>
            )}

            {/* Step 2: Converting / Loading */}
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              <div>
                <p className="text-sm font-medium text-zinc-700">
                  {file ? "Converting to PDF" : "Loading slides"}
                </p>
                {file && (
                  <p className="text-xs text-zinc-400">
                    ~{Math.min(Math.round(pollAttempts * 2), 60)} seconds elapsed
                  </p>
                )}
              </div>
            </div>

            {/* Linear progress bar */}
            {file && (
              <>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className="h-full animate-pulse rounded-full bg-zinc-600"
                    style={{ width: "90%" }}
                  />
                </div>
                <p className="text-xs text-zinc-400">This should take about 15–30 seconds</p>
              </>
            )}
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
            <div
              ref={slideViewerRef}
              className={`relative flex flex-1 items-center justify-center transition-all ${
                isFullscreen ? (fitToScreen ? "p-0 bg-black" : "p-0") : "p-4"
              }`}
            >
              <SlidePdfViewer
                pdfUrl={blobPdfUrls[currentIndex] ?? pdfUrls[currentIndex] ?? null}
                slideWidth={isFullscreen
                  ? fitToScreen
                    ? (() => {
                        const aspect = 4 / 3
                        const w = window.innerWidth, h = window.innerHeight
                        return w / h > aspect ? Math.round(h * aspect) : w
                      })()
                    : Math.min(window.innerWidth * 0.85, window.innerHeight * 0.8 / 0.75, 1400)
                  // Non-fullscreen: parent md:ml-80 (sidebar at 768px+) + lg:mr-[380px] (right panel at 1024px+)
                  // + p-4 on slide container (32px)
                  : (() => {
                      let deductions = 32 // p-4 padding
                      const w = window.innerWidth
                      if (w >= 1024) deductions += 380 // right panel reserve (lg+)
                      if (w >= 768) deductions += 320 // left sidebar (md+)
                      return Math.min(w - deductions, w >= 768 ? 880 : 800)
                    })()}
                onLoadError={() => {
                  console.error(`[Editor] Failed to load PDF for slide ${currentIndex + 1}`)
                }}
              />

              {/* Fullscreen hover overlay — navigation + exit */}
              {isFullscreen && (
                <div className="absolute inset-0 z-50 flex items-center justify-between opacity-0 transition-opacity duration-300 hover:opacity-100">
                  {/* Previous slide */}
                  <button
                    type="button"
                    onClick={() => jumpToSlide(currentSlideNum - 1)}
                    disabled={currentIndex === 0}
                    className="mx-4 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70 disabled:opacity-20 disabled:cursor-not-allowed"
                    aria-label="Previous slide"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>

                  {/* Next slide */}
                  <button
                    type="button"
                    onClick={() => jumpToSlide(currentSlideNum + 1)}
                    disabled={currentIndex >= totalSlides - 1}
                    className="mx-4 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70 disabled:opacity-20 disabled:cursor-not-allowed"
                    aria-label="Next slide"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>

                  {/* Top bar: slide counter + exit fullscreen */}
                  <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-4">
                    <span className="rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur-sm">
                      {currentSlideNum} / {totalSlides}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFitToScreen((f) => !f)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition-colors hover:bg-black/70 ${
                          fitToScreen ? "bg-white/30 text-white" : "bg-black/50 text-white/70"
                        }`}
                        aria-label={fitToScreen ? "Exit fit to screen" : "Fit to screen"}
                        title={fitToScreen ? "Exit fit to screen" : "Fit to screen"}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(fullscreenContainerRef.current!)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                        aria-label="Exit full screen"
                      >
                        <Minimize2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom hint */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs text-white/70 backdrop-blur-sm">
                    ← → arrow keys to navigate · Esc to exit
                  </div>
                </div>
              )}
            </div>

            {/* Toolbar — hidden in fullscreen (replaced by overlay) */}
            {!isFullscreen && (
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
                {(blobPdfUrls[currentIndex] ?? pdfUrls[currentIndex]) && (
                  <button
                    type="button"
                    onClick={() => {
                    if (supported && fullscreenContainerRef.current) {
                      toggle(fullscreenContainerRef.current)
                    } else {
                      window.open(blobPdfUrls[currentIndex] ?? pdfUrls[currentIndex]!, '_blank')
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-[#71717A] shadow-sm transition-colors hover:text-[#18181B]"
                  title="Full screen"
                  >
                    <Maximize2 className="h-3 w-3" />
                    Full screen
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full min-h-[60vh] items-center justify-center">
            <p className="text-sm text-[#71717A]">Presentation could not be loaded.</p>
          </div>
        )}

        {/* Audio player for fullscreen mode — hidden normally, shows at bottom in fullscreen */}
        {isFullscreen && audioUrl && (
          <div className="absolute bottom-0 left-0 right-0 z-[100] opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-auto">
            <div className="mx-auto max-w-3xl px-4 py-3">
              <AudioPlayer
                audioUrl={audioUrl}
                presentationId={presentationId}
                slideNumber={currentIndex + 1}
              />
            </div>
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

        {/* Narration textarea */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[#18181B]">
            Narration Script
          </label>
          <div className="relative">
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
                className={cn(
                  "min-h-[120px] resize-none text-sm",
                  generationFailed && "opacity-40 blur-[1px] pointer-events-none"
                )}
                disabled={generationFailed}
              />
            )}

            {/* Narration failure overlay — centered inside blurred textarea */}
            {generationFailed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg">
                <RefreshCw className="h-5 w-5 text-red-400" />
                <p className="text-xs font-medium text-red-500">Generation failed</p>
                <button
                  type="button"
                  onClick={async () => {
                    setGenerationFailed(false)
                    const ok = await generateNarrations(slides, true)
                    if (!ok) setGenerationFailed(true)
                  }}
                  disabled={generating || generatingNarrations}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  {generating || generatingNarrations ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {generating || generatingNarrations ? "Trying again…" : "Try Again"}
                </button>
              </div>
            )}
          </div>
          {narrations[current.number] && (
            <p className="text-xs text-zinc-400 text-right">
              {narrations[current.number].split(/\s+/).filter(Boolean).length} words · {narrations[current.number].length} characters
            </p>
          )}
        </div>

        {/* Generate Audio — shown when narration exists but TTS not done */}
        {Object.keys(narrations).length > 0 && !audioGenerated && !generationFailed && !audioGenFailed && (
          <Button
            onClick={runAudioGeneration}
            disabled={generatingNarrations || generatingAudio || !selectedVoiceId}
            className="w-full"
            title={!selectedVoiceId ? "Select a voice first" : undefined}
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
            {/* Voice changed banner */}
            {voiceChangedSinceAudio && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {voiceChangeMessage}
              </div>
            )}

            {/* Audio player */}
            {audioUrl && (
              <AudioPlayer
                audioUrl={audioUrl}
                presentationId={presentationId}
                slideNumber={currentIndex + 1}
              />
            )}

            {/* Actions row */}
            <div className="flex items-center gap-2">
              {(changedSlides.length > 0 || voiceChangedSinceAudio) && (
                <Button
                  onClick={() => setShowRegenModal(true)}
                  variant="outline"
                  className="flex-1"
                >
                  Regenerate Audio
                </Button>
              )}
              <Button
                onClick={() => setShowShareModal(true)}
                variant="outline"
                className={changedSlides.length > 0 || voiceChangedSinceAudio ? "flex-1" : "w-full"}
              >
                <Share2 className="h-4 w-4" />
                Share & Track Viewers
              </Button>
            </div>
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
        <div className="fixed inset-0 z-50 transition-opacity duration-300 lg:hidden">
          <div className={`absolute inset-0 transition-opacity duration-300 ${showMobilePanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => { if (showMobilePanel) setShowMobilePanel(false) }} />
          <div className={`absolute bottom-0 right-0 left-0 z-10 max-h-[75vh] flex-col gap-4 overflow-y-auto rounded-t-2xl border-t border-zinc-200 bg-white p-5 shadow-xl transition-transform duration-300 ease-out ${showMobilePanel ? 'translate-y-0' : 'translate-y-full'}`}>
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

            {/* Narration textarea */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#18181B]">
                Narration Script
              </label>
              <div className="relative">
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
                    className={cn(
                      "min-h-[120px] resize-none text-sm",
                      generationFailed && "opacity-40 blur-[1px] pointer-events-none"
                    )}
                    disabled={generationFailed}
                  />
                )}

                {/* Narration failure overlay — centered inside blurred textarea */}
                {generationFailed && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg">
                    <RefreshCw className="h-5 w-5 text-red-400" />
                    <p className="text-xs font-medium text-red-500">Generation failed</p>
                    <button
                      type="button"
                      onClick={async () => {
                        setGenerationFailed(false)
                        const ok = await generateNarrations(slides, true)
                        if (!ok) setGenerationFailed(true)
                      }}
                      disabled={generating || generatingNarrations}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      {generating || generatingNarrations ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      {generating || generatingNarrations ? "Trying again…" : "Try Again"}
                    </button>
                  </div>
                )}
              </div>
              {narrations[current.number] && (
                <p className="text-xs text-zinc-400 text-right">
                  {narrations[current.number].split(/\s+/).filter(Boolean).length} words · {narrations[current.number].length} characters
                </p>
              )}
            </div>

            {/* Generate Audio — shown when narration exists but TTS not done */}
            {Object.keys(narrations).length > 0 && !audioGenerated && !generationFailed && !audioGenFailed && (
              <Button
                onClick={runAudioGeneration}
                disabled={generatingNarrations || generatingAudio || !selectedVoiceId}
                className="w-full"
                title={!selectedVoiceId ? "Select a voice first" : undefined}
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
                {/* Voice changed banner */}
                {voiceChangedSinceAudio && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    {voiceChangeMessage}
                  </div>
                )}

                {/* Audio player */}
                {audioUrl && (
                  <AudioPlayer
                    audioUrl={audioUrl}
                    presentationId={presentationId}
                    slideNumber={currentIndex + 1}
                  />
                )}

                {/* Actions row */}
                <div className="flex items-center gap-2">
                  {(changedSlides.length > 0 || voiceChangedSinceAudio) && (
                    <Button
                      onClick={() => setShowRegenModal(true)}
                      variant="outline"
                      className="flex-1"
                    >
                      Regenerate Audio
                    </Button>
                  )}
                  <Button
                    onClick={() => setShowShareModal(true)}
                    variant="outline"
                    className={changedSlides.length > 0 || voiceChangedSinceAudio ? "flex-1" : "w-full"}
                  >
                    <Share2 className="h-4 w-4" />
                    Share & Track Viewers
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

      {/* Batch-fetch image descriptions for ALL slides in one API call */}
      {showSlideInfo && !externalImageDescriptions?.[current.number] && slides.some((s) => s.images.length > 0) && (
        <BatchImageFetcher
          slides={slides}
          presentationId={presentationId}
          onResult={handleBatchResult}
          onLoading={setImageDescLoading}
        />
      )}

      {/* Slide info modal */}
      {showSlideInfo && (
        <SlideParsedData
          slide={current}
          presentationId={presentationId}
          cachedImageDescriptions={externalImageDescriptions?.[current.number]}
          imageDescLoading={imageDescLoading}
            onImageDescriptionsUpdate={(descs) => {
              onImageDescriptionsChange?.({ [current.number]: descs })
            }}
          onClose={() => setShowSlideInfo(false)}
        />
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
            handleGenerate(voiceChangedSinceAudio ? undefined : new Set(changedSlides))
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
            setRegenStep("review")
            setGenerationSummary(null)
            setIsInitialGenerate(false)
          }}
          step={regenStep}
          generationError={null}
          audioGenProgress={audioGenProgress}
          generationSummary={generationSummary}
          onRetry={() => {
            setRegenStep("generating")
            setGenerating(true)
            handleGenerate(voiceChangedSinceAudio ? undefined : new Set(changedSlides))
              .then(() => setRegenStep("complete"))
              .catch(() => setRegenStep("complete"))
          }}
        />
      )}

      {/* Audio generation progress is now shown inside the unified RegenerateModal */}
    </>
  )
}

/**
 * Zero-height component that batch-fetches image descriptions for ALL slides
 * in a single API call when mounted. Renders nothing.
 */
function BatchImageFetcher({
  slides,
  presentationId,
  onResult,
  onLoading,
}: {
  slides: ParsedSlide[]
  presentationId: string
  onResult: (cache: Record<number, { index: number; description: string; error?: string }[]>) => void
  onLoading: (v: boolean) => void
}) {
  useEffect(() => {
    const slidesWithImages = slides
      .filter((s) => s.images.length > 0)
      .map((s) => ({
        number: s.number,
        images: s.images.map((img) => ({
          index: img.index,
          mimeType: img.mimeType,
          dataUrl: img.dataUrl,
        })),
      }))

    if (slidesWithImages.length === 0) return

    onLoading(true)

    describeSlideImages(presentationId, slidesWithImages)
      .then((result) => {
        const cache: Record<number, { index: number; description: string; error?: string }[]> = {}
        for (const slide of result.slides) {
          cache[slide.number] = slide.images
        }
        onResult(cache)
      })
      .catch((err) => {
        console.error("[BatchImageFetcher] Failed:", err)
      })
      .finally(() => {
        onLoading(false)
      })
  }, [slides, presentationId, onResult, onLoading])

  return null
}
