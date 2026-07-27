"use client"

import { SlidePdfViewer } from "@/components/shared/SlidePdfViewer"

type ViewSlideProps = {
  pdfUrl: string | null
  slideNumber: number
  totalSlides: number
  /** Larger max width for fullscreen mode */
  fullscreen?: boolean
}

export function ViewSlide({ pdfUrl, slideNumber, totalSlides, fullscreen }: ViewSlideProps) {
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
