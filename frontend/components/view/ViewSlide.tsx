"use client"

import { useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"

// Set up pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString()

type ViewSlideProps = {
  pdfUrl: string | null
  slideNumber: number
  totalSlides: number
}

export function ViewSlide({ pdfUrl, slideNumber, totalSlides }: ViewSlideProps) {
  const [loadError, setLoadError] = useState(false)

  if (!pdfUrl) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg bg-zinc-100 p-8">
        <p className="text-sm text-zinc-500">Slide not available</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg bg-zinc-100 p-8">
        <p className="text-sm text-red-500">Failed to load slide</p>
      </div>
    )
  }

  const slideWidth = typeof window !== "undefined" ? Math.min(window.innerWidth * 0.55, 960) : 800
  const slideHeight = Math.round(slideWidth * 0.75) // 4:3 aspect ratio

  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded-lg bg-zinc-100 shrink-0"
      style={{ width: slideWidth, height: slideHeight }}
    >
      <Document
        file={pdfUrl}
        onLoadError={() => setLoadError(true)}
        loading={
          <div className="flex flex-col items-center justify-center gap-4 animate-pulse" style={{ width: slideWidth, height: slideHeight }}>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
            <div className="text-xs text-zinc-400">Loading slide…</div>
          </div>
        }
      >
        <Page
          pageNumber={1}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="shadow-lg"
          width={slideWidth}
        />
      </Document>
    </div>
  )
}
