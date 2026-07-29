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
  const [retryKey, setRetryKey] = useState(0)
  const handleRetry = useCallback(() => {
    setLoadError(false)
    setRetryKey((k) => k + 1)
  }, [])

  const slideWidth =
    externalWidth ??
    (typeof window !== "undefined" ? Math.min(window.innerWidth * 0.5, maxWidth) : Math.min(800, maxWidth))
  const slideHeight = Math.round(slideWidth * aspectRatio)

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
      className="relative flex max-w-full items-center justify-center overflow-hidden rounded-lg shrink-0 [&_canvas]:max-w-full [&_canvas]:h-auto"
      style={{
        width: slideWidth,
        height: slideHeight,
        maxWidth: "100%",
      }}
    >
      <Document
        file={pdfUrl}
        key={retryKey}
        onLoadError={(err) => {
          console.error(`[SlidePdfViewer] PDF load error for "${typeof pdfUrl === 'string' ? pdfUrl.substring(0, 80) : pdfUrl}":`, err)
          setLoadError(true)
          onLoadError?.()
        }}
        loading={
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-zinc-100 rounded-lg">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
            <div className="text-xs text-zinc-400">Loading slide…</div>
          </div>
        }
      >
        <Page
          pageNumber={1}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="shadow-sm"
          width={slideWidth}
        />
      </Document>
    </div>
  )
}
