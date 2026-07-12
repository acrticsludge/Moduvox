"use client"

import { SlidePdfViewer } from "@/components/shared/SlidePdfViewer"

type ViewSlideProps = {
  pdfUrl: string | null
  slideNumber: number
  totalSlides: number
}

export function ViewSlide({ pdfUrl, slideNumber, totalSlides }: ViewSlideProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <SlidePdfViewer
        pdfUrl={pdfUrl}
        onLoadError={() => {
          console.error(`[ViewSlide] Failed to load slide ${slideNumber}/${totalSlides}`)
        }}
      />
    </div>
  )
}
