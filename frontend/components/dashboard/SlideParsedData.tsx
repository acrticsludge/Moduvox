"use client"

import { useState, useEffect, useCallback } from "react"
import { X, AlertCircle, RefreshCw, MessageSquare, FileText, ImageIcon, ChevronRight } from "lucide-react"
import type { ParsedSlide, ImageDescription } from "@/lib/pptx-renderer"
import { describeSlideImages } from "@/lib/image-analysis"

type Tab = "text" | "notes" | "images"

type TabStatus = "loading" | "loaded" | "empty" | "error"

export function SlideParsedData({
  slide,
  presentationId,
  cachedImageDescriptions,
  onImageDescriptionsUpdate,
  onClose,
}: {
  slide: ParsedSlide
  presentationId: string
  cachedImageDescriptions?: { index: number; description: string; error?: string }[]
  onImageDescriptionsUpdate?: (descs: { index: number; description: string; error?: string }[]) => void
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<Tab>("text")

  // Use cached descriptions if available — skip the API call entirely
  const hasCached = cachedImageDescriptions !== undefined && cachedImageDescriptions.length > 0
  const initialDescMap = new Map<number, ImageDescription>()
  if (hasCached) {
    for (const d of cachedImageDescriptions!) {
      initialDescMap.set(d.index, d)
    }
  }

  const [imageDescriptions, setImageDescriptions] = useState<Map<number, ImageDescription>>(initialDescMap)
  const [imageStatus, setImageStatus] = useState<TabStatus>(
    slide.images.length === 0
      ? "empty"
      : hasCached
        ? "loaded"
        : "loading",
  )
  const [imageError, setImageError] = useState<string | null>(null)

  // ── Determine tab status indicators ──────────────────────────────────────

  const textStatus: TabStatus =
    slide.title.trim() || slide.bullets.length > 0 ? "loaded" : "empty"

  const notesStatus: TabStatus =
    slide.notes !== null || slide.comments.length > 0
      ? "loaded"
      : "empty"

  function tabDot(status: TabStatus): string {
    switch (status) {
      case "loaded": return "bg-green-500"
      case "empty": return "bg-zinc-300"
      case "error": return "bg-red-500"
      case "loading": return "bg-amber-400 animate-pulse"
    }
  }

  // ── Load image descriptions ──────────────────────────────────────────────

  const loadImageDescriptions = useCallback(async () => {
    if (slide.images.length === 0) {
      setImageStatus("empty")
      return
    }

    setImageStatus("loading")
    setImageError(null)

    try {
      const result = await describeSlideImages(presentationId, [
        { number: slide.number, images: slide.images },
      ])

      const descMap = new Map<number, ImageDescription>()
      const slideResult = result.slides[0]
      if (slideResult) {
        for (const img of slideResult.images) {
          descMap.set(img.index, img)
        }
      }

      setImageDescriptions(descMap)

      // Propagate to parent for caching in editor_state
      if (onImageDescriptionsUpdate && slideResult?.images) {
        onImageDescriptionsUpdate(slideResult.images)
      }

      // Determine overall status
      const allFailed = slideResult?.images.every((img) => img.error) ?? false
      setImageStatus(allFailed ? "error" : "loaded")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setImageError(msg)
      setImageStatus("error")
    }
  }, [slide, presentationId, onImageDescriptionsUpdate])

  useEffect(() => {
    if (activeTab === "images" && imageStatus === "loading") {
      loadImageDescriptions()
    }
  }, [activeTab, imageStatus, loadImageDescriptions])

  // ── Tab pill component ───────────────────────────────────────────────────

  function TabPill({
    tab,
    label,
    icon,
    status,
  }: {
    tab: Tab
    label: string
    icon: React.ReactNode
    status: TabStatus
  }) {
    const isActive = activeTab === tab
    return (
      <button
        type="button"
        onClick={() => setActiveTab(tab)}
        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
          isActive
            ? "bg-[#18181B] text-white shadow-sm"
            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${tabDot(status)}`} />
        {icon}
        {label}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#18181B]/40 p-4">
      <div className="flex w-full max-w-lg flex-col rounded-xl border border-zinc-200 bg-white shadow-xl max-h-[85vh]">
        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 flex-shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-100 text-xs font-medium text-zinc-500">
              #{slide.number}
            </span>
            <h2 className="truncate text-sm font-semibold text-[#18181B]">
              {slide.title || `Slide ${slide.number}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Pill Tabs ─────────────────────────────────────────────── */}
        <div className="flex gap-2 border-b border-zinc-100 px-5 py-2.5 flex-shrink-0">
          <TabPill tab="text" label="Text" icon={<FileText className="h-3 w-3" />} status={textStatus} />
          <TabPill tab="notes" label="Notes" icon={<MessageSquare className="h-3 w-3" />} status={notesStatus} />
          <TabPill tab="images" label="Images" icon={<ImageIcon className="h-3 w-3" />} status={imageStatus} />
        </div>

        {/* ── Tab Content ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 hide-scrollbar">
          {activeTab === "text" && <TextTab slide={slide} />}
          {activeTab === "notes" && <NotesTab slide={slide} />}
          {activeTab === "images" && (
            <ImagesTab
              slide={slide}
              imageDescriptions={imageDescriptions}
              imageStatus={imageStatus}
              imageError={imageError}
              onRetry={loadImageDescriptions}
            />
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-2.5 flex-shrink-0">
          <span className="text-xs text-zinc-400">
            {activeTab === "text" && `${slide.bullets.length} item(s)`}
            {activeTab === "notes" && (
              slide.notes
                ? `${slide.comments.length > 0 ? `${slide.comments.length} comment(s) + notes` : "Notes available"}`
                : `${slide.comments.length} comment(s)`
            )}
            {activeTab === "images" && `${slide.images.length} image(s)`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Text Tab ──────────────────────────────────────────────────────────────────

function TextTab({ slide }: { slide: ParsedSlide }) {
  if (!slide.title.trim() && slide.bullets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileText className="mb-2 h-8 w-8 text-zinc-300" />
        <p className="text-sm text-zinc-400">No text content extracted</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {slide.title && (
        <h3 className="text-sm font-semibold text-[#18181B] break-words leading-snug">
          {slide.title}
        </h3>
      )}
      {slide.bullets.length > 0 && (
        <ul className="space-y-1">
          {slide.bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-600">
              <span className="mt-1.5 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-300" />
              <span className="break-words">{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Notes Tab ─────────────────────────────────────────────────────────────────

function NotesTab({ slide }: { slide: ParsedSlide }) {
  if (slide.notes === null && slide.comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <MessageSquare className="mb-2 h-8 w-8 text-zinc-300" />
        <p className="text-sm text-zinc-400">No notes or comments on this slide</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Slide Notes */}
      {slide.notes !== null && (
        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Slide Notes
          </h4>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
              {slide.notes}
            </p>
          </div>
        </div>
      )}

      {/* Comments */}
      {slide.comments.length > 0 && (
        <div>
          {slide.notes !== null && (
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Comments
            </h4>
          )}
          <div className="space-y-2">
            {slide.comments.map((comment, i) => (
              <div key={i} className="flex gap-2.5 rounded-lg border border-zinc-200 p-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600">
                  {getAuthorInitial(comment.author)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-[#18181B]">{comment.author}</span>
                    {comment.createdAt && (
                      <span className="text-xs text-zinc-400">{formatTime(comment.createdAt)}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm leading-relaxed text-zinc-600 break-words">
                    {comment.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helper functions for NotesTab ─────────────────────────────────────────────

function formatTime(iso: string): string {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return d.toLocaleDateString()
  } catch {
    return iso
  }
}

function getAuthorInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?"
}

// ── Images Tab ────────────────────────────────────────────────────────────────

function ImagesTab({
  slide,
  imageDescriptions,
  imageStatus,
  imageError,
  onRetry,
}: {
  slide: ParsedSlide
  imageDescriptions: Map<number, ImageDescription>
  imageStatus: TabStatus
  imageError: string | null
  onRetry: () => void
}) {
  // Loading state
  if (imageStatus === "loading") {
    return (
      <div className="space-y-4">
        {slide.images.map((img) => (
          <div key={img.index} className="overflow-hidden rounded-lg border border-zinc-200">
            <div className="aspect-video bg-zinc-100 animate-pulse" />
            <div className="p-3">
              <div className="h-3 w-3/4 rounded bg-zinc-100 animate-pulse" />
              <div className="mt-1.5 h-3 w-1/2 rounded bg-zinc-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Empty state
  if (slide.images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <ImageIcon className="mb-2 h-8 w-8 text-zinc-300" />
        <p className="text-sm text-zinc-400">No images found on this slide</p>
      </div>
    )
  }

  // Error state (all failed)
  if (imageStatus === "error" && imageDescriptions.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
        <p className="mb-1 text-sm font-medium text-zinc-700">Image analysis failed</p>
        <p className="mb-3 text-xs text-zinc-400">{imageError || "Could not analyze images"}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    )
  }

  // Loaded state
  return (
    <div className="space-y-4">
      {slide.images.map((img) => {
        const desc = imageDescriptions.get(img.index)
        const hasError = desc?.error

        return (
          <div key={img.index} className="overflow-hidden rounded-lg border border-zinc-200">
            {/* Thumbnail */}
            <div className="flex items-center justify-center bg-zinc-50 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.dataUrl}
                alt={`Slide ${slide.number} image ${img.index + 1}`}
                className="max-h-48 rounded object-contain"
              />
            </div>

            {/* Description */}
            <div className="border-t border-zinc-100 p-3">
              {hasError ? (
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-red-600">Analysis failed</p>
                    <p className="mt-0.5 text-xs text-zinc-400">{desc?.error || "Could not analyze this image"}</p>
                    <button
                      type="button"
                      onClick={onRetry}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-700"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Retry
                    </button>
                  </div>
                </div>
              ) : desc?.description ? (
                <p className="text-xs leading-relaxed text-zinc-600">{desc.description}</p>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs text-zinc-400">Analyzing...</span>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Per-image retry button when all loaded but some failed */}
      {imageStatus === "loaded" && Array.from(imageDescriptions.values()).some((d) => d.error) && (
        <div className="text-center">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            <RefreshCw className="h-3 w-3" />
            Retry failed
          </button>
        </div>
      )}
    </div>
  )
}
