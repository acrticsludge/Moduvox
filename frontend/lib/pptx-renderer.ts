import JSZip from "jszip"

// ── Types ──────────────────────────────────────────────────────────────────────

export type SlideComment = {
  author: string
  text: string
  createdAt: string
}

export type SlideImage = {
  index: number
  mimeType: string
  dataUrl: string
}

export type ParsedSlide = {
  number: number
  title: string
  bullets: string[]
  notes: string | null
  comments: SlideComment[]
  images: SlideImage[]
  rawText: string
}

export type ImageDescription = {
  index: number
  description: string
  error?: string
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

// ── Namespace helpers — PPTX uses these across all slide-related XML ───────────

const NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"
const NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main"
const NS_MC = "http://schemas.openxmlformats.org/markup-compatibility/2006"
const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

// ── Main parser ────────────────────────────────────────────────────────────────

/**
 * Parse a PPTX file and extract text, notes, comments, and images from each slide.
 */
export async function parsePptxText(file: File): Promise<ParsedSlide[]> {
  const arrayBuffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)

  // ── Resolve slide file list ───────────────────────────────────────────────
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

  // ── Pre-parse comments index: commentN.xml → slide number ─────────────────
  // Comments in PPTX are stored in ppt/comments/commentN.xml but the mapping
  // to slides (a:cmAuthorRef) lives in the slide XML itself. We map by reading
  // slideN.xml.rels and matching relationship targets to comment files.
  const commentsBySlide = await parseCommentsIndex(zip, slideFiles)

  // ── Pre-parse image index: rels → media files per slide ───────────────────
  const imagesBySlide = await parseImageIndex(zip, slideFiles)

  // ── Parse each slide ──────────────────────────────────────────────────────
  const slides: ParsedSlide[] = []

  for (let i = 0; i < slideFiles.length; i++) {
    const slidePath = slideFiles[i]
    const slideNum = i + 1

    // Slide text
    const slideXml = await zip.files[slidePath].async("string")
    const paragraphs = extractParagraphsFromXml(slideXml)
    const title = paragraphs[0] || `Slide ${slideNum}`
    const bullets = paragraphs.slice(1).filter((p) => p.trim())
    const rawText = paragraphs.join("\n")

    // Notes
    const notes = await extractNotes(zip, slideNum)

    // Comments
    const comments = commentsBySlide.get(slideNum) || []

    // Images
    const images = imagesBySlide.get(slideNum) || []

    slides.push({
      number: slideNum,
      title,
      bullets,
      notes,
      comments,
      images,
      rawText,
    })
  }

  return slides
}

// ── Text extraction (DOMParser) ────────────────────────────────────────────────

/**
 * Extract paragraph text from a slide XML string using DOMParser.
 * Returns all paragraph texts in order, trimmed and non-empty.
 *
 * PPTX XML uses namespace prefixes (a:, p:, mc:, r:) which are preserved
 * as literal tag names when parsed by DOMParser. getElementsByTagName()
 * with the prefixed name correctly finds all matching elements.
 */
function extractParagraphsFromXml(xml: string): string[] {
  const doc = parseXml(xml)
  if (!doc) return []

  const allParagraphs = doc.getElementsByTagName("a:p")
  if (allParagraphs.length === 0) return []

  const texts: string[] = []

  for (const pEl of Array.from(allParagraphs)) {
    const tRuns = (pEl as Element).getElementsByTagName("a:t")
    let text = ""
    for (const t of Array.from(tRuns)) {
      text += t.textContent || ""
    }
    const trimmed = text.trim()
    if (trimmed) texts.push(trimmed)
  }

  return texts
}

/**
 * Parse an XML string into a DOM Document.
 * Falls back gracefully — returns null on parse failure.
 */
function parseXml(xml: string): Document | null {
  try {
    const parser = new DOMParser()
    return parser.parseFromString(xml, "text/xml")
  } catch {
    return null
  }
}

// ── Notes extraction ──────────────────────────────────────────────────────────

/**
 * Extract slide notes from ppt/notesSlides/notesSlideN.xml.
 * Returns null if no notes file exists or if it has no content.
 */
async function extractNotes(zip: JSZip, slideNum: number): Promise<string | null> {
  const notesPath = `ppt/notesSlides/notesSlide${slideNum}.xml`
  const file = zip.files[notesPath]
  if (!file) return null

  try {
    const xml = await file.async("string")
    const paragraphs = extractParagraphsFromXml(xml)
    const joined = paragraphs.join("\n\n")
    return joined || null
  } catch {
    return null
  }
}

// ── Comments extraction ───────────────────────────────────────────────────────

/**
 * Parse all comment files and build a map from slide number to comments.
 * PPTX stores comments in ppt/comments/commentN.xml where N is the comment
 * file index (NOT the slide number). The mapping to slides is through
 * relationships in slideN.xml.rels.
 */
async function parseCommentsIndex(
  zip: JSZip,
  slideFiles: string[],
): Promise<Map<number, SlideComment[]>> {
  // Build reverse map: comment rel target → comment file content
  // First, discover all comment relationship targets per slide
  const slideCommentMap = new Map<number, string[]>() // slideNum → [commentTargetFilename]

  for (const slidePath of slideFiles) {
    const relsPath = slidePath.replace(/\.xml$/, ".xml.rels").replace("slides/", "slides/_rels/")
    const relsFile = zip.files[relsPath]
    if (!relsFile) continue

    try {
      const relsXml = await relsFile.async("string")
      const relsDoc = parseXml(relsXml)
      if (!relsDoc) continue

      const slideNum = parseInt(slidePath.match(/\d+/)?.[0] || "0", 10)
      if (slideNum === 0) continue

      // Find Relationships with type "comment"
      const relationships = relsDoc.getElementsByTagName("Relationship")
      const commentTargets: string[] = []

      for (const rel of Array.from(relationships)) {
        const relType = rel.getAttribute("Type") || ""
        if (relType.includes("comments")) {
          const target = rel.getAttribute("Target") || ""
          // Target is like "../comments/comment1.xml" — extract filename
          const filename = target.split("/").pop() || ""
          commentTargets.push(filename)
        }
      }

      if (commentTargets.length > 0) {
        slideCommentMap.set(slideNum, commentTargets)
      }
    } catch {
      // Skip slides with unparseable rels
    }
  }

  // Now read each comment file and map its comments to the correct slide
  const result = new Map<number, SlideComment[]>()
  const loadedComments = new Map<string, SlideComment[]>() // filename → comments

  // Load all referenced comment files
  const allTargets = new Set<string>()
  for (const targets of slideCommentMap.values()) {
    for (const t of targets) allTargets.add(t)
  }

  for (const filename of allTargets) {
    const commentPath = `ppt/comments/${filename}`
    const commentFile = zip.files[commentPath]
    if (!commentFile) continue

    try {
      const xml = await commentFile.async("string")
      const comments = parseCommentsXml(xml)
      if (comments.length > 0) {
        loadedComments.set(filename, comments)
      }
    } catch {
      // Skip corrupt comment files
    }
  }

  // Map to slides
  for (const [slideNum, targets] of slideCommentMap) {
    const allComments: SlideComment[] = []
    for (const target of targets) {
      const comments = loadedComments.get(target)
      if (comments) allComments.push(...comments)
    }
    if (allComments.length > 0) {
      result.set(slideNum, allComments)
    }
  }

  return result
}

/**
 * Parse a single PPTX comments XML file into SlideComment[].
 */
function parseCommentsXml(xml: string): SlideComment[] {
  const doc = parseXml(xml)
  if (!doc) return []

  const comments: SlideComment[] = []

  // PPTX comment XML uses <mc:Comment> elements (or <Comment> in some versions)
  const commentEls = doc.getElementsByTagName("mc:Comment")
  // Fallback for different namespace
  const altCommentEls = commentEls.length === 0 ? doc.getElementsByTagName("Comment") : commentEls

  for (const el of Array.from(altCommentEls)) {
    const authorEles = (el as Element).getElementsByTagName("mc:author")
    const textEles = (el as Element).getElementsByTagName("mc:commentText")
    const dtEles = (el as Element).getElementsByTagName("mc:dt")

    // Fallback for un-namespaced variants
    const authorEl = authorEles.length > 0 ? authorEles[0] : (el as Element).getElementsByTagName("Author")[0]
    const textEl = textEles.length > 0 ? textEles[0] : (el as Element).getElementsByTagName("Text")[0]
    const dtEl = dtEles.length > 0 ? dtEles[0] : (el as Element).getElementsByTagName("Date")[0]

    const text = textEl?.textContent?.trim()
    if (!text) continue

    comments.push({
      author: authorEl?.textContent?.trim() || "Unknown",
      text,
      createdAt: dtEl?.textContent?.trim() || "",
    })
  }

  return comments
}

// ── Image extraction ──────────────────────────────────────────────────────────

const MAX_IMAGE_DIMENSION = 400
const MAX_IMAGES_PER_SLIDE = 5

/**
 * Parse image relationships per slide and extract image data from ppt/media/.
 * Images are base64-encoded and resized to fit within MAX_IMAGE_DIMENSION px.
 */
async function parseImageIndex(
  zip: JSZip,
  slideFiles: string[],
): Promise<Map<number, SlideImage[]>> {
  const result = new Map<number, SlideImage[]>()

  for (const slidePath of slideFiles) {
    const relsPath = slidePath.replace(/\.xml$/, ".xml.rels").replace("slides/", "slides/_rels/")
    const relsFile = zip.files[relsPath]
    if (!relsFile) continue

    const slideNum = parseInt(slidePath.match(/\d+/)?.[0] || "0", 10)
    if (slideNum === 0) continue

    try {
      const relsXml = await relsFile.async("string")
      const relsDoc = parseXml(relsXml)
      if (!relsDoc) continue

      const relationships = relsDoc.getElementsByTagName("Relationship")
      const imageTargets: { target: string; mimeType: string }[] = []

      for (const rel of Array.from(relationships)) {
        const relType = rel.getAttribute("Type") || ""
        if (relType.includes("image")) {
          const target = rel.getAttribute("Target") || ""
          const filename = target.split("/").pop() || ""
          const ext = filename.split(".").pop()?.toLowerCase() || ""
          const mimeType =
            ext === "png" ? "image/png" :
            ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
            ext === "gif" ? "image/gif" :
            ext === "svg" ? "image/svg+xml" :
            ext === "webp" ? "image/webp" :
            ext === "bmp" ? "image/bmp" : "image/png"
          imageTargets.push({ target: filename, mimeType })
        }
      }

      if (imageTargets.length === 0) continue

      const images: SlideImage[] = []
      let imageIndex = 0

      for (const img of imageTargets) {
        if (imageIndex >= MAX_IMAGES_PER_SLIDE) break

        const mediaPath = `ppt/media/${img.target}`
        const mediaFile = zip.files[mediaPath]
        if (!mediaFile) continue

        try {
          const binaryData = await mediaFile.async("arraybuffer")
          const base64 = arrayBufferToBase64(binaryData)

          // Resize via canvas to keep payload manageable
          const resizedDataUrl = await resizeImage(
            `data:${img.mimeType};base64,${base64}`,
            MAX_IMAGE_DIMENSION,
            img.mimeType,
          )

          images.push({
            index: imageIndex,
            mimeType: img.mimeType,
            dataUrl: resizedDataUrl,
          })
          imageIndex++
        } catch {
          // Skip individual images that fail to load or resize
        }
      }

      if (images.length > 0) {
        result.set(slideNum, images)
      }
    } catch {
      // Skip slides with unparseable rels
    }
  }

  return result
}

/**
 * Read an ArrayBuffer and return a base64-encoded string.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Resize an image via canvas to fit within `maxPx` on the longest edge.
 * Returns a base64 data URL.
 */
function resizeImage(
  dataUrl: string,
  maxPx: number,
  mimeType: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const { width, height } = img
      let newW = width
      let newH = height

      if (width > maxPx || height > maxPx) {
        const ratio = Math.min(maxPx / width, maxPx / height)
        newW = Math.round(width * ratio)
        newH = Math.round(height * ratio)
      }

      const canvas = document.createElement("canvas")
      canvas.width = newW
      canvas.height = newH
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        // Can't resize — return original
        resolve(dataUrl)
        return
      }
      ctx.drawImage(img, 0, 0, newW, newH)
      resolve(canvas.toDataURL(mimeType, 0.85))
    }
    img.onerror = () => reject(new Error("Failed to load image for resize"))
    img.src = dataUrl
  })
}

// ── Slide comparison (unchanged logic, updated type) ──────────────────────────

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

  if (matchRatio === 1 && oldHashes.length === newHashes.length) {
    const changes: SlideChangeInfo[] = newSlides.map((_, i) => ({
      number: i + 1,
      oldNumber: i + 1,
      status: "unchanged" as const,
    }))
    return { type: "identical", added: 0, removed: 0, changed: 0, unchanged: oldHashes.length, message: "No changes detected.", changes }
  }

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

  const changes: SlideChangeInfo[] = []
  let unchangedCount = 0
  let changedCount = 0
  let addedCount = 0
  let reorderedCount = 0

  const claimedOld = new Set<number>()

  for (let i = 0; i < newHashes.length; i++) {
    const oldIdx = oldHashes.indexOf(newHashes[i])
    if (oldIdx === -1) {
      if (i < oldHashes.length) {
        changes.push({ number: i + 1, oldNumber: i + 1, status: "modified" })
        changedCount++
      } else {
        changes.push({ number: i + 1, oldNumber: null, status: "added" })
        addedCount++
      }
    } else if (oldIdx === i) {
      changes.push({ number: i + 1, oldNumber: i + 1, status: "unchanged" })
      unchangedCount++
      claimedOld.add(oldIdx)
    } else if (!claimedOld.has(oldIdx)) {
      changes.push({ number: i + 1, oldNumber: oldIdx + 1, status: "reordered" })
      reorderedCount++
      claimedOld.add(oldIdx)
    } else {
      if (i < oldHashes.length) {
        changes.push({ number: i + 1, oldNumber: i + 1, status: "modified" })
        changedCount++
      } else {
        changes.push({ number: i + 1, oldNumber: null, status: "added" })
        addedCount++
      }
    }
  }

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
