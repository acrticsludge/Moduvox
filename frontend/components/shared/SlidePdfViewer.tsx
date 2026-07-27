"use client"

import { useState, useCallback, useRef, useEffect } from "react"
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

const MAX_SLIDE_WIDTH = 880

export type SlidePdfViewerProps = {
  pdfUrl: string | null
  /** Override the responsive width with a fixed pixel value (e.g. for editor sidebar) */
  slideWidth?: number
  aspectRatio?: number // default 4:3 (0.75)
  onLoadError?: () => void
}

/**
 * Renders a slide PDF scaled to fit its container.
 *
 * Uses a ResizeObserver to measure available width and scales the slide
 * to fill the container (up to `MAX_SLIDE_WIDTH`). Removes `shrink-0` so
 * the slide can flex-shrink on small viewports.
 */
export function SlidePdfViewer({
  pdfUrl,
  slideWidth: externalWidth,
  aspectRatio = 0.75,
  onLoadError,
}: SlidePdfViewerProps) {
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleRetry = useCallback(() => {
    setLoadError(false)
    setRetryKey((k) => k + 1)
  }, [])

  // Measure available container width with ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el || externalWidth !== undefined) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Round up to avoid jitter from sub-pixel values
        setContainerWidth(Math.ceil(entry.contentRect.width))
      }
    })

    observer.observe(el)
    setContainerWidth(el.clientWidth)

    return () => observer.disconnect()
  }, [externalWidth])

  // Calculate slide pixel dimensions.
  // When externalWidth is set, use fixed pixels. Otherwise defer to container measurement.
  const hasMeasured = containerWidth > 0 || externalWidth !== undefined
  const slideWidth = externalWidth ?? (containerWidth > 0 ? Math.min(containerWidth, MAX_SLIDE_WIDTH) : 800)
  const slideHeight = Math.round(slideWidth * aspectRatio)

  // Responsive sizing: fill container width with CSS, cap at max, maintain aspect ratio.
  // When externalWidth is provided, use exact pixel dimensions instead.
  const sizingStyle: React.CSSProperties =
    externalWidth !== undefined
      ? { width: slideWidth, height: slideHeight }
      : { width: "100%", maxWidth: MAX_SLIDE_WIDTH, aspectRatio: `${aspectRatio}` }

  if (!pdfUrl) {
    return (
      <div
        ref={containerRef}
        className="flex items-center justify-center rounded-lg bg-zinc-100"
        style={sizingStyle}
      >
        <p className="text-sm text-zinc-500">Slide not available</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div
        ref={containerRef}
        className="flex flex-col items-center justify-center gap-3 rounded-lg bg-zinc-100"
        style={sizingStyle}
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
      ref={containerRef}
      className="flex items-center justify-center overflow-hidden rounded-lg"
      style={sizingStyle}
    >
      {/* Defer PDF rendering until we have a container measurement — prevents width flash */}
      {!hasMeasured ? (
        <div className="flex flex-col items-center justify-center gap-4 animate-pulse bg-zinc-100 rounded-lg w-full h-full">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          <div className="text-xs text-zinc-400">Loading slide…</div>
        </div>
      ) : (
        <Document
          file={pdfUrl}
          key={retryKey}
          onLoadError={() => {
            setLoadError(true)
            onLoadError?.()
          }}
          loading={
            <div className="flex flex-col items-center justify-center gap-4 animate-pulse bg-zinc-100 rounded-lg w-full h-full">
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
      )}
    </div>
  )
}
