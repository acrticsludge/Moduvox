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
