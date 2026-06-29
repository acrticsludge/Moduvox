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

  if (slideFiles.length > 30) {
    throw new Error(
      `Presentation has ${slideFiles.length} slides. Maximum supported is 30 slides for audio generation.`,
    )
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

export type SlideChangeInfo = {
  number: number
  oldNumber: number | null
  status: "unchanged" | "modified" | "added" | "reordered"
}

export type SlideDiff = {
  type: "identical" | "changed" | "replacement"
  added: number
  removed: number
  changed: number
  unchanged: number
  message: string
  changes: SlideChangeInfo[]
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
    const changes: SlideChangeInfo[] = newSlides.map((_, i) => ({
      number: i + 1,
      oldNumber: null,
      status: "added" as const,
    }))
    return { type: "changed", added: newSlides.length, removed: 0, changed: 0, unchanged: 0, message: `${newSlides.length} new slide(s) detected.`, changes }
  }

  const oldHashes = oldSlides.map((s) => slideHash(s.title, s.bullets))
  const newHashes = newSlides.map((s) => slideHash(s.title, s.bullets))

  const matchCount = newHashes.filter((h) => oldHashes.includes(h)).length
  const maxLen = Math.max(oldHashes.length, newHashes.length)
  const matchRatio = maxLen > 0 ? matchCount / maxLen : 1

  // Identical
  if (matchRatio === 1 && oldHashes.length === newHashes.length) {
    const changes: SlideChangeInfo[] = newSlides.map((_, i) => ({
      number: i + 1,
      oldNumber: i + 1,
      status: "unchanged" as const,
    }))
    return { type: "identical", added: 0, removed: 0, changed: 0, unchanged: oldHashes.length, message: "No changes detected.", changes }
  }

  // Replacement
  if (matchRatio < 0.3 || Math.abs(oldHashes.length - newHashes.length) > Math.max(3, oldHashes.length * 0.3)) {
    return {
      type: "replacement",
      added: newHashes.length,
      removed: oldHashes.length,
      changed: 0,
      unchanged: matchCount,
      message: "This appears to be a completely different presentation.",
      changes: [],
    }
  }

  // Changed — compute per-slide with reorder detection
  const changes: SlideChangeInfo[] = []
  let unchangedCount = 0
  let changedCount = 0
  let addedCount = 0
  let reorderedCount = 0

  // Track which old hashes have been claimed (reorder detection)
  const claimedOld = new Set<number>()

  for (let i = 0; i < newHashes.length; i++) {
    const oldIdx = oldHashes.indexOf(newHashes[i])
    if (oldIdx === -1) {
      // Content not found in old deck
      if (i < oldHashes.length) {
        // Position existed in old deck — content changed
        changes.push({ number: i + 1, oldNumber: i + 1, status: "modified" })
        changedCount++
      } else {
        // Position beyond old deck — truly new slide
        changes.push({ number: i + 1, oldNumber: null, status: "added" })
        addedCount++
      }
    } else if (oldIdx === i) {
      // Same position, same content — unchanged
      changes.push({ number: i + 1, oldNumber: i + 1, status: "unchanged" })
      unchangedCount++
      claimedOld.add(oldIdx)
    } else if (!claimedOld.has(oldIdx)) {
      // Content exists at a different position — reordered
      changes.push({ number: i + 1, oldNumber: oldIdx + 1, status: "reordered" })
      reorderedCount++
      claimedOld.add(oldIdx)
    } else {
      // Content already claimed by another new slide
      if (i < oldHashes.length) {
        // This position had content before — it's been modified
        changes.push({ number: i + 1, oldNumber: i + 1, status: "modified" })
        changedCount++
      } else {
        // Brand new slide at a new position
        changes.push({ number: i + 1, oldNumber: null, status: "added" })
        addedCount++
      }
    }
  }

  // Reordered counts as changed for summary
  changedCount += reorderedCount

  return {
    type: "changed",
    added: addedCount,
    removed: oldHashes.length - claimedOld.size,
    changed: changedCount,
    unchanged: unchangedCount,
    message: `${changedCount} slide(s) changed, ${addedCount} added, ${Math.max(0, oldHashes.length - claimedOld.size)} removed.`,
    changes,
  }
}
