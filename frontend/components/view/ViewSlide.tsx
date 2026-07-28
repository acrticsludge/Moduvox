"use client"

import type { CSSProperties } from "react"
import { SlidePdfViewer } from "@/components/shared/SlidePdfViewer"

type ViewSlideProps = {
  pdfUrl: string | null
  slideNumber: number
  totalSlides: number
  /** Larger max width for fullscreen mode */
  fullscreen?: boolean
  /** Pre-rendered image URL from pdf.js — instant display, no react-pdf */
  imageUrl?: string | null
}

export function ViewSlide({ pdfUrl, slideNumber, totalSlides, fullscreen, imageUrl }: ViewSlideProps) {
  // ── Pre-rendered image mode ──
  if (imageUrl) {
    const imgW = fullscreen
      ? Math.min(window.innerWidth * 0.9, window.innerHeight * 0.85 / 0.75, 1400)
      : Math.min(window.innerWidth * 0.5, 880)
    const imgH = Math.round(imgW * 0.75)
    const imgStyle: CSSProperties = {
      width: imgW,
      height: imgH,
      objectFit: "contain",
      borderRadius: "0.5rem",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    }
    return (
      <div className="flex flex-1 items-center justify-center">
        <img src={imageUrl} alt={`Slide ${slideNumber}`} style={imgStyle} />
      </div>
    )
  }

  // ── Normal react-pdf mode (fallback while pre-rendering) ──
  return (
    <div className="flex flex-1 items-center justify-center">
      <SlidePdfViewer
        pdfUrl={pdfUrl}
        slideWidth={fullscreen ? Math.min(window.innerWidth * 0.9, window.innerHeight * 0.85 / 0.75, 1400) : undefined}
        onLoadError={() => {
          console.error(`[ViewSlide] Failed to load slide ${slideNumber}/${totalSlides}`)
        }}
      />
    </div>
  )
}
