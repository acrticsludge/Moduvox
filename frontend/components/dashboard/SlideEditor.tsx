"use client"

import { useState, useEffect } from "react"
import { Play, Loader2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { parsePptxText, type ParsedSlide } from "@/lib/pptx-renderer"

export function SlideEditor({
  voiceSelected,
  file,
  presentationId,
}: {
  voiceSelected: boolean
  file: File | null
  presentationId: string
}) {
  const [slides, setSlides] = useState<ParsedSlide[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [audioGenerated, setAudioGenerated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [narrations, setNarrations] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!file) {
      setLoading(false)
      setLoadError("No file provided")
      return
    }

    let cancelled = false

    async function processFile() {
      if (!file) return

      // Step 1: Upload to API
      const formData = new FormData()
      formData.append("file", file!)

      let signedUrl: string | null = null
      try {
        const res = await fetch(`/api/presentations/${presentationId}/upload`, {
          method: "POST",
          body: formData,
        })
        const json = await res.json()
        if (json.data?.signedUrl) {
          signedUrl = json.data.signedUrl as string
          const encodedUrl = encodeURIComponent(signedUrl as string)
          if (!cancelled) {
            setViewerUrl(
              `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`,
            )
          }
        }
      } catch {
        // Upload failed — continue without viewer
      }

      // Step 2: Extract text content for narration
      try {
        const parsed = await parsePptxText(file!)
        if (!cancelled) {
          setSlides(parsed)
          setCurrentIndex(0)
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError("Failed to read presentation content.")
        }
      }

      if (!cancelled) setLoading(false)
    }

    processFile()
    return () => { cancelled = true }
  }, [file, presentationId])

  const current = slides[currentIndex]
  const total = slides.length

  function updateNarration(text: string) {
    if (!current) return
    setNarrations((prev) => ({ ...prev, [current.number]: text }))
  }

  function handleGenerate() {
    setGenerating(true)
    setTimeout(() => {
      setAudioGenerated(true)
      setGenerating(false)
    }, 1200)
  }

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
    <div className="flex flex-1 flex-col gap-0 lg:flex-row">
      {/* Left — Office Online viewer showing the actual PPTX */}
      <div className="relative flex flex-1 flex-col bg-zinc-100">
        {viewerUrl ? (
          <>
            <iframe
              src={viewerUrl}
              className="h-full w-full"
              style={{ minHeight: "60vh" }}
              title="Presentation preview"
            />
            <div className="absolute bottom-3 right-3 flex gap-2">
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
        {/* Slide info */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[#71717A]">
            Slide {current.number} of {total}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="flex h-7 w-7 items-center justify-center rounded text-xs text-[#71717A] transition-colors hover:bg-zinc-100 hover:text-[#18181B] disabled:opacity-30"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
              disabled={currentIndex === total - 1}
              className="flex h-7 w-7 items-center justify-center rounded text-xs text-[#71717A] transition-colors hover:bg-zinc-100 hover:text-[#18181B] disabled:opacity-30"
            >
              →
            </button>
          </div>
        </div>

        {/* Slide title */}
        <div>
          <h3 className="text-base font-semibold text-[#18181B] leading-snug">
            {current.title}
          </h3>
          {current.bullets.length > 0 && (
            <ul className="mt-2 space-y-1">
              {current.bullets.slice(0, 3).map((b, i) => (
                <li key={i} className="text-xs text-[#71717A] leading-relaxed">
                  • {b}
                </li>
              ))}
              {current.bullets.length > 3 && (
                <li className="text-xs text-zinc-400">
                  +{current.bullets.length - 3} more items
                </li>
              )}
            </ul>
          )}
        </div>

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
              onClick={handleGenerate}
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
  )
}
