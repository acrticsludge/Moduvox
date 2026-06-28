import JSZip from "jszip"

export type ParsedSlide = {
  number: number
  title: string
  bullets: string[]
  rawText: string
}

/**
 * Parse a PPTX file and extract text content from each slide.
 * This is used ONLY for narration context (titles, bullet points).
 * The actual slide preview uses the Office Online viewer for 1:1 rendering.
 */
export async function parsePptxText(file: File): Promise<ParsedSlide[]> {
  const arrayBuffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || "0", 10)
      const numB = parseInt(b.match(/\d+/)?.[0] || "0", 10)
      return numA - numB
    })

  if (slideFiles.length === 0) {
    throw new Error("No slides found in the presentation")
  }

  const slides: ParsedSlide[] = []
  let index = 0

  for (const slidePath of slideFiles) {
    index++
    const xml = await zip.files[slidePath].async("string")
    const paragraphs = extractParagraphs(xml)
    const title = paragraphs[0] || `Slide ${index}`
    const bullets = paragraphs.slice(1).filter((p) => p.trim())
    const rawText = paragraphs.join("\n")

    slides.push({
      number: index,
      title,
      bullets: bullets.length > 0 ? bullets : [],
      rawText,
    })
  }

  return slides
}

function extractParagraphs(xml: string): string[] {
  const paragraphs: string[] = []
  const pRegex = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g
  let pMatch
  while ((pMatch = pRegex.exec(xml)) !== null) {
    const pContent = pMatch[1]
    const tRegex = /<a:t[^>]*>([^<]*)<\/a:t>/g
    let tMatch
    let text = ""
    while ((tMatch = tRegex.exec(pContent)) !== null) {
      text += tMatch[1]
    }
    const trimmed = text.trim()
    if (trimmed) paragraphs.push(trimmed)
  }
  return paragraphs
}

export type SlideDiff = {
  type: "identical" | "changed" | "replacement"
  added: number
  removed: number
  changed: number
  unchanged: number
  message: string
}

export function slideHash(title: string, bullets: string[]): string {
  const content = title + "|" + bullets.join("|")
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return String(hash)
}

export function compareSlides(
  oldSlides: { title: string; bullets: string[] }[],
  newSlides: { title: string; bullets: string[] }[],
): SlideDiff {
  if (oldSlides.length === 0) {
    return { type: "changed", added: newSlides.length, removed: 0, changed: 0, unchanged: 0, message: `${newSlides.length} new slide(s) detected.` }
  }

  const oldHashes = oldSlides.map((s) => slideHash(s.title, s.bullets))
  const newHashes = newSlides.map((s) => slideHash(s.title, s.bullets))

  const matchCount = newHashes.filter((h) => oldHashes.includes(h)).length
  const maxLen = Math.max(oldHashes.length, newHashes.length)
  const matchRatio = maxLen > 0 ? matchCount / maxLen : 1

  if (matchRatio === 1 && oldHashes.length === newHashes.length) {
    return { type: "identical", added: 0, removed: 0, changed: 0, unchanged: oldHashes.length, message: "No changes detected." }
  }

  if (matchRatio < 0.3 || Math.abs(oldHashes.length - newHashes.length) > Math.max(3, oldHashes.length * 0.3)) {
    return {
      type: "replacement",
      added: newHashes.length,
      removed: oldHashes.length,
      changed: 0,
      unchanged: matchCount,
      message: "This appears to be a completely different presentation.",
    }
  }

  const added = newHashes.filter((h) => !oldHashes.includes(h)).length
  const removed = oldHashes.filter((h) => !newHashes.includes(h)).length
  const changed = maxLen - matchCount - Math.min(added, removed)

  return { type: "changed", added, removed, changed: Math.max(0, changed), unchanged: matchCount, message: `${Math.max(0, changed)} slide(s) changed, ${added} added, ${removed} removed.` }
}
