// frontend/lib/image-analysis.ts
// Client-side helpers for sending slide images to Gemini Vision for description.

import type { ImageDescription } from "@/lib/pptx-renderer"

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

// ── Parsing completeness helpers ─────────────────────────────────

type SlideWithImages = { number: number; images: { index: number; mimeType: string; dataUrl: string }[] }
type SlideImageResult = { number: number; images: ImageDescription[] }

/** True when the slide has no images, or every image has a non-error description. */
export function isSlideParsingComplete(
  slideImages: { index: number }[],
  descriptions?: ImageDescription[] | null,
): boolean {
  if (slideImages.length === 0) return true
  if (!descriptions) return false
  return slideImages.every((img) => {
    const d = descriptions.find((x) => x.index === img.index)
    return Boolean(d && d.description && !d.error)
  })
}

/** Images that still need parsing: missing description, empty description, or error. */
export function imagesNeedingAnalysis(
  slideImages: { index: number; mimeType: string; dataUrl: string }[],
  descriptions?: ImageDescription[] | null,
): { index: number; mimeType: string; dataUrl: string }[] {
  if (slideImages.length === 0) return []
  if (!descriptions) return [...slideImages]
  return slideImages.filter((img) => {
    const d = descriptions.find((x) => x.index === img.index)
    return !d || !d.description || Boolean(d.error)
  })
}

/** Chunk (slideNumber, image) pairs so each request has at most maxImagesPerRequest images. */
export function chunkImageRequests(
  slidesWithImages: SlideWithImages[],
  maxImagesPerRequest = 20,
): SlideWithImages[][] {
  const chunks: SlideWithImages[][] = []
  let current: SlideWithImages[] = []
  let count = 0
  const maxImagesPerSlideEntry = 10

  for (const slide of slidesWithImages) {
    for (const img of slide.images) {
      if (count >= maxImagesPerRequest) {
        chunks.push(current)
        current = []
        count = 0
      }
      const last = current[current.length - 1]
      if (last && last.number === slide.number && last.images.length < maxImagesPerSlideEntry) {
        last.images.push(img)
      } else {
        current.push({ number: slide.number, images: [img] })
      }
      count++
    }
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}

/** Convert a data URI or signed R2 URL to a base64 data URI for the API. */
async function toBase64DataUrl(dataUrl: string): Promise<string> {
  if (dataUrl.startsWith("data:")) return dataUrl
  const res = await fetch(dataUrl)
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result)
      else reject(new Error("Failed to read image"))
    }
    reader.onerror = () => reject(new Error("Failed to read image"))
    reader.onabort = () => reject(new Error("Failed to read image"))
    reader.readAsDataURL(blob)
  })
}

/** Describe all images across slides, chunking to respect the API's 20-image cap and 10/min rate limit. */
export async function describeSlideImagesChunked(
  presentationId: string,
  slidesWithImages: SlideWithImages[],
  opts?: { maxImagesPerRequest?: number; chunkDelayMs?: number; onProgress?: (done: number, total: number) => void },
): Promise<{ slides: SlideImageResult[] }> {
  const maxImagesPerRequest = opts?.maxImagesPerRequest ?? 20
  const chunkDelayMs = opts?.chunkDelayMs ?? 7000
  const chunks = chunkImageRequests(slidesWithImages, maxImagesPerRequest)
  const bySlide = new Map<number, ImageDescription[]>()
  let processed = 0
  const total = slidesWithImages.reduce((n, s) => n + s.images.length, 0)

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0 && chunkDelayMs > 0) {
      await new Promise((r) => setTimeout(r, chunkDelayMs))
    }
    let result: { slides: SlideImageResult[] }
    try {
      result = await describeSlideImages(presentationId, chunks[i])
    } catch {
      // Mark every image in this chunk as failed so the caller can surface retry.
      result = {
        slides: chunks[i].map((s) => ({
          number: s.number,
          images: s.images.map((img) => ({ index: img.index, description: "", error: "Analysis failed" })),
        })),
      }
    }
    for (const slide of result.slides) {
      const existing = bySlide.get(slide.number)
      if (existing) existing.push(...slide.images)
      else bySlide.set(slide.number, [...slide.images])
      processed += slide.images.length
      opts?.onProgress?.(Math.min(processed, total), total)
    }
  }

  return { slides: Array.from(bySlide.entries()).map(([number, images]) => ({ number, images })) }
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
  // Resolve data URIs OR signed R2 URLs to base64 data URIs before sending.
  const normalized = await Promise.all(
    slidesWithImages.map(async (slide) => ({
      number: slide.number,
      images: await Promise.all(
        slide.images.map(async (img) => ({
          index: img.index,
          mimeType: img.mimeType,
          dataUrl: await toBase64DataUrl(img.dataUrl),
        })),
      ),
    })),
  )

  const payload: ImageDescriptionRequest = {
    presentationId,
    slides: normalized.map((slide) => ({
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
