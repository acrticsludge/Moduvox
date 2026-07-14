"use client"

import { useState, useCallback } from "react"
import { Document, Page, pdfjs } from "react-pdf"

// Set up pdf.js worker with fallback
try {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString()
} catch {
  console.warn("Failed to resolve pdfjs worker URL, using default")
}

export type SlidePdfViewerProps = {
  pdfUrl: string | null
  slideWidth?: number
  aspectRatio?: number // default 4:3 (0.75)
  onLoadError?: () => void
}

export function SlidePdfViewer({
  pdfUrl,
  slideWidth: externalWidth,
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
    (typeof window !== "undefined" ? Math.min(window.innerWidth * 0.5, 880) : 800)
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
      className="flex items-center justify-center overflow-hidden rounded-lg shrink-0"
      style={{ width: slideWidth, height: slideHeight }}
    >
      <Document
        file={pdfUrl}
        key={retryKey}
        onLoadError={() => {
          setLoadError(true)
          onLoadError?.()
        }}
        loading={
          <div
            className="flex flex-col items-center justify-center gap-4 animate-pulse bg-zinc-100 rounded-lg"
            style={{ width: slideWidth, height: slideHeight }}
          >
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
