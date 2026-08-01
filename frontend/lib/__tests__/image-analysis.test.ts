import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  isSlideParsingComplete,
  imagesNeedingAnalysis,
  chunkImageRequests,
  describeSlideImagesChunked,
} from "@/lib/image-analysis"
import type { ImageDescription } from "@/lib/pptx-renderer"

const slideImages = [
  { index: 0, mimeType: "image/png", dataUrl: "data:image/png;base64,AAAA" },
  { index: 1, mimeType: "image/png", dataUrl: "data:image/png;base64,BBBB" },
  { index: 2, mimeType: "image/jpeg", dataUrl: "data:image/jpeg;base64,CCCC" },
]

function desc(index: number, description = "Chart: growth", error?: string): ImageDescription {
  return { index, description, error }
}

describe("isSlideParsingComplete", () => {
  it("returns true when the slide has no images", () => {
    assert.equal(isSlideParsingComplete([], []), true)
    assert.equal(isSlideParsingComplete([], undefined), true)
  })
  it("returns false when descriptions are missing", () => {
    assert.equal(isSlideParsingComplete(slideImages, undefined), false)
  })
  it("returns true when every image has a non-error description", () => {
    const descs = [desc(0), desc(1), desc(2)]
    assert.equal(isSlideParsingComplete(slideImages, descs), true)
  })
  it('treats "No significant visual content." as a valid description', () => {
    const descs = [desc(0), desc(1, "No significant visual content."), desc(2)]
    assert.equal(isSlideParsingComplete(slideImages, descs), true)
  })
  it("returns false when an image has an error", () => {
    const descs = [desc(0), desc(1, "", "Analysis failed"), desc(2)]
    assert.equal(isSlideParsingComplete(slideImages, descs), false)
  })
  it("returns false when an image description is empty", () => {
    const descs = [desc(0), desc(1, ""), desc(2)]
    assert.equal(isSlideParsingComplete(slideImages, descs), false)
  })
  it("returns false when an image is missing from the descriptions", () => {
    const descs = [desc(0), desc(2)]
    assert.equal(isSlideParsingComplete(slideImages, descs), false)
  })
})

describe("imagesNeedingAnalysis", () => {
  it("returns all images when descriptions are missing", () => {
    assert.deepEqual(imagesNeedingAnalysis(slideImages, undefined), slideImages)
  })
  it("returns only failed and missing images", () => {
    const descs = [desc(0), desc(1, "", "Analysis failed")]
    const result = imagesNeedingAnalysis(slideImages, descs)
    assert.deepEqual(result.map((i) => i.index), [1, 2])
  })
  it("returns empty when everything is described", () => {
    const descs = [desc(0), desc(1), desc(2)]
    assert.deepEqual(imagesNeedingAnalysis(slideImages, descs), [])
  })
})

describe("chunkImageRequests", () => {
  const slides = [
    { number: 1, images: [slideImages[0]] },
    { number: 2, images: [slideImages[1], slideImages[2]] },
  ]
  it("keeps everything in one chunk when under the limit", () => {
    const chunks = chunkImageRequests(slides, 20)
    assert.equal(chunks.length, 1)
    assert.equal(chunks[0].length, 2)
  })
  it("splits into multiple chunks respecting the image cap", () => {
    const many = Array.from({ length: 5 }, (_, n) => ({
      number: n + 1,
      images: Array.from({ length: 5 }, (_, i) => ({ index: i, mimeType: "image/png", dataUrl: "data:image/png;base64,X" })),
    }))
    const chunks = chunkImageRequests(many, 12)
    const perChunk = chunks.map((c) => c.reduce((n, s) => n + s.images.length, 0))
    assert.ok(perChunk.every((n) => n <= 12))
    assert.equal(perChunk.reduce((a, b) => a + b, 0), 25)
  })
  it("returns empty for empty input", () => {
    assert.deepEqual(chunkImageRequests([], 20), [])
  })
})

describe("describeSlideImagesChunked", () => {
  it("merges results across chunks and marks unreturned images as failed", async () => {
    const requests: string[] = []
    const origFetch = global.fetch
    global.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String((init as RequestInit)?.body))
      requests.push(JSON.stringify(body))
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            slides: (body as { slides: { number: number; images: { index: number }[] }[] }).slides.map((s: { number: number; images: { index: number }[] }) => ({
              number: s.number,
              images: s.images.map((img) => ({ index: img.index, description: `desc ${img.index}`, error: undefined })),
            })),
          },
        }),
      } as Response
    }) as typeof fetch

    try {
      const slides = [
        { number: 1, images: [slideImages[0], slideImages[1]] },
        { number: 2, images: [slideImages[2]] },
      ]
      const result = await describeSlideImagesChunked("pres-id", slides, { maxImagesPerRequest: 2, chunkDelayMs: 0 })
      assert.equal(result.slides.length, 2)
      const slide1 = result.slides.find((s) => s.number === 1)!
      assert.deepEqual(slide1.images.map((i) => i.index), [0, 1])
      assert.ok(slide1.images.every((i) => !i.error && i.description === `desc ${i.index}`))
      assert.equal(requests.length, 2) // 3 images / 2 per chunk = 2 chunks
    } finally {
      global.fetch = origFetch
    }
  })

  it("marks all images in a chunk as failed when the request throws", async () => {
    const origFetch = global.fetch
    global.fetch = (async () => {
      throw new Error("network down")
    }) as typeof fetch
    try {
      const slides = [{ number: 1, images: [slideImages[0], slideImages[1]] }]
      const result = await describeSlideImagesChunked("pres-id", slides, { chunkDelayMs: 0 })
      assert.equal(result.slides.length, 1)
      assert.ok(result.slides[0].images.every((i) => i.error === "Analysis failed"))
    } finally {
      global.fetch = origFetch
    }
  })
})
