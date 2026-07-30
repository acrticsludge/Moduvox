"use client"

import { useState, useCallback } from "react"
import { Document, Page, pdfjs } from "react-pdf"

// Set up pdf.js worker from CDN — the local file via import.meta.url gets intercepted
// by Next.js route params (e.g. /view/pdf.worker.mjs matches [shareToken]).
try {
  const ver = pdfjs.version?.split("-")[0] || "4.9.155"
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${ver}/build/pdf.worker.min.mjs`
} catch {
  console.warn("Failed to set pdfjs worker URL, using default")
}

// Fixed render resolution — react-pdf renders at this once, CSS scale handles all resizing.
// This eliminates blank-canvas flashes on fullscreen toggle and window resize.
const RENDER_WIDTH = 1200
const RENDER_HEIGHT = 900 // 4:3

export type SlidePdfViewerProps = {
  pdfUrl: string | null
  /** Fixed pixel width (overrides responsive sizing) */
  slideWidth?: number
  /** Override the default 880px max width when using responsive sizing (e.g. fullscreen) */
  maxWidth?: number
  aspectRatio?: number // default 4:3 (0.75)
  onLoadError?: () => void
}

export function SlidePdfViewer({
  pdfUrl,
  slideWidth: externalWidth,
  maxWidth = 880,
  aspectRatio = 0.75,
  onLoadError,
}: SlidePdfViewerProps) {
  const [loadError, setLoadError] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const handleRetry = useCallback(() => {
    setLoadError(false)
    setRendered(false)
    setRetryKey((k) => k + 1)
  }, [])

  const slideWidth =
    externalWidth ??
    (typeof window !== "undefined" ? Math.min(window.innerWidth * 0.5, maxWidth) : Math.min(800, maxWidth))
  const slideHeight = Math.round(slideWidth * aspectRatio)

  // CSS scale factor: fixed render size → container size (changes on resize/fullscreen, no re-render)
  const scale = slideWidth / RENDER_WIDTH

  if (!pdfUrl) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-zinc-100"
        style={{ width: slideWidth, height: slideHeight }}
      >
        <p className="text-sm text-zinc-500">Slide not available</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-lg bg-zinc-100"
        style={{ width: slideWidth, height: slideHeight }}
      >
        <p className="text-sm text-red-500">Failed to load slide</p>
        <button
          type="button"
          onClick={handleRetry}
          className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div
      className="relative flex max-w-full items-center justify-center overflow-hidden rounded-lg shrink-0"
      style={{
        width: slideWidth,
        height: slideHeight,
        maxWidth: "100%",
      }}
    >
      {/* Loading overlay — covers the canvas until PDF page content is painted */}
      {!rendered && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-zinc-100 rounded-lg">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          <div className="text-xs text-zinc-400">Loading slide…</div>
        </div>
      )}

      {/* Scaled container: PDF renders once at fixed resolution, CSS scale handles all sizing */}
      <div
        className="flex shrink-0 items-center justify-center"
        style={{
          width: RENDER_WIDTH,
          height: RENDER_HEIGHT,
          transform: `scale(${scale})`,
        }}
      >
        <Document
          file={pdfUrl}
          key={retryKey}
          onLoadError={(err) => {
            console.error(`[SlidePdfViewer] PDF load error:`, err)
            setLoadError(true)
            onLoadError?.()
          }}
        >
          <Page
            pageNumber={1}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            width={RENDER_WIDTH}
            canvasBackground="#F4F4F5"
            className="shadow-sm"
            onRenderSuccess={() => setRendered(true)}
            onRenderError={() => setRendered(true)}
          />
        </Document>
      </div>
    </div>
  )
}
