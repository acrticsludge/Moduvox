"use client"

import dynamic from "next/dynamic"

const SlidePdfViewer = dynamic(
  () => import("@/components/shared/SlidePdfViewer").then((m) => m.SlidePdfViewer),
  { ssr: false },
)

type ViewSlideProps = {
  pdfUrl: string | null
  slideNumber: number
  totalSlides: number
  /** Larger max width for fullscreen mode */
  fullscreen?: boolean
  /** Pre-rendered image URL from pdf.js — instant display, no react-pdf */
  imageUrl?: string | null
  /** When true and fullscreen, fill the entire viewport (PowerPoint present mode) */
  fitToScreen?: boolean
}

function calcSlideSize(fullscreen: boolean, fitToScreen: boolean): { width: number; height: number } {
  if (fullscreen && fitToScreen) {
    // Fill viewport maintaining 4:3 aspect ratio
    const availW = window.innerWidth
    const availH = window.innerHeight
    const aspect = 4 / 3
    if (availW / availH > aspect) {
      // Viewport wider than slide → height constrained
      return { width: Math.round(availH * aspect), height: availH }
    } else {
      // Viewport taller than slide → width constrained
      return { width: availW, height: Math.round(availW / aspect) }
    }
  }
  if (fullscreen) {
    return {
      width: Math.min(window.innerWidth * 0.9, window.innerHeight * 0.85 / 0.75, 1400),
      height: Math.round(Math.min(window.innerWidth * 0.9, window.innerHeight * 0.85 / 0.75, 1400) * 0.75),
    }
  }
  return {
    width: Math.min(window.innerWidth * 0.5, 880),
    height: Math.round(Math.min(window.innerWidth * 0.5, 880) * 0.75),
  }
}

export function ViewSlide({ pdfUrl, slideNumber, totalSlides, fullscreen = false, imageUrl, fitToScreen = false }: ViewSlideProps) {
  const { width: imgW, height: imgH } = calcSlideSize(!!fullscreen, fitToScreen)

  // ── Pre-rendered image mode ──
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={`Slide ${slideNumber}`}
        style={{
          width: imgW,
          height: imgH,
          objectFit: "contain",
          borderRadius: "0.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      />
    )
  }

  // ── Normal react-pdf mode (fallback while pre-rendering) ──
  return (
    <SlidePdfViewer
      pdfUrl={pdfUrl}
      slideWidth={imgW}
      onLoadError={() => {
        console.error(`[ViewSlide] Failed to load slide ${slideNumber}/${totalSlides}`)
      }}
    />
  )
}
