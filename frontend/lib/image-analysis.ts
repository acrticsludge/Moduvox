// frontend/lib/image-analysis.ts
// Client-side helpers for sending slide images to Gemini Vision for description.

export type ImageDescriptionRequest = {
  presentationId: string
  slides: {
    number: number
    images: {
      index: number
      mimeType: string
      data: string // base64 (without data: URI prefix)
    }[]
  }[]
}

export type ImageDescriptionResponse = {
  slides: {
    number: number
    images: {
      index: number
      description: string
      error?: string
    }[]
  }[]
}

/**
 * Send extracted slide images to the server for Gemini Vision analysis.
 *
 * @param presentationId - UUID of the presentation
 * @param slidesWithImages - slides containing extracted SlideImage[] data
 * @returns per-image descriptions, with error field on individual failures
 */
export async function describeSlideImages(
  presentationId: string,
  slidesWithImages: {
    number: number
    images: { index: number; mimeType: string; dataUrl: string }[]
  }[],
): Promise<ImageDescriptionResponse> {
  // Strip data: URI prefix from each image; the API route expects raw base64
  const payload: ImageDescriptionRequest = {
    presentationId,
    slides: slidesWithImages.map((slide) => ({
      number: slide.number,
      images: slide.images.map((img) => ({
        index: img.index,
        mimeType: img.mimeType,
        data: img.dataUrl.replace(/^data:image\/\w+;base64,/, ""),
      })),
    })),
  }

  const res = await fetch("/api/generate/image-descriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error("Image description request failed")
  }

  const json = await res.json()
  return json.data as ImageDescriptionResponse
}
