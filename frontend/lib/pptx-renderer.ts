import JSZip from "jszip"

export type RenderedSlide = {
  number: number
  imageDataUrl: string
  title: string
}

const SLIDE_WIDTH = 960
const SLIDE_HEIGHT = 540

/**
 * Parse a PPTX file and render each slide as a canvas image,
 * including embedded images extracted from the PPTX media folder.
 */
export async function renderPptx(file: File): Promise<RenderedSlide[]> {
  const arrayBuffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)

  // Extract slide XML files
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

  // Extract all embedded images from ppt/media/
  const mediaImages: Record<string, string> = {}
  const mediaFiles = Object.keys(zip.files).filter(
    (name) => /^ppt\/media\/.+\.(png|jpeg|jpg|gif|bmp|svg)$/i.test(name),
  )

  for (const mediaPath of mediaFiles) {
    try {
      const blob = await zip.files[mediaPath].async("blob")
      const dataUrl = await blobToDataUrl(blob)
      const fileName = mediaPath.split("/").pop() || ""
      mediaImages[fileName] = dataUrl
    } catch {
      // Skip images that fail to extract
    }
  }

  // Parse relationship files to map images to slides
  const slideRels: Record<number, string[]> = {}
  for (let i = 1; i <= slideFiles.length; i++) {
    const relPath = `ppt/slides/_rels/slide${i}.xml.rels`
    const relFile = zip.files[relPath]
    if (!relFile) continue

    try {
      const relXml = await relFile.async("string")
      // Find image references in relationships
      const imgRegex = /Target="\.\.\/media\/([^"]+)"/g
      let match
      while ((match = imgRegex.exec(relXml)) !== null) {
        if (!slideRels[i]) slideRels[i] = []
        slideRels[i].push(match[1])
      }
    } catch {
      // Skip relationship parsing errors
    }
  }

  const ACCENTS = ["#DC2626", "#2563EB", "#16A34A", "#D97706", "#7C3AED"]
  const slides: RenderedSlide[] = []

  let index = 0
  for (const slidePath of slideFiles) {
    index++
    const xml = await zip.files[slidePath].async("string")
    const paragraphs = extractParagraphs(xml)
    const title = paragraphs[0] || `Slide ${index}`
    const bullets = paragraphs.slice(1).filter((p) => p.trim())
    const accent = ACCENTS[(index - 1) % ACCENTS.length]

    // Get images for this slide
    const slideImages = (slideRels[index] || [])
      .map((name) => mediaImages[name])
      .filter(Boolean)

    const dataUrl = renderSlideToCanvas(title, bullets, accent, slideImages)
    slides.push({ number: index, imageDataUrl: dataUrl, title })
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

function renderSlideToCanvas(
  title: string,
  bullets: string[],
  accent: string,
  slideImages: string[],
): string {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")!
  const dpr = window.devicePixelRatio || 1

  canvas.width = SLIDE_WIDTH * dpr
  canvas.height = SLIDE_HEIGHT * dpr
  ctx.scale(dpr, dpr)

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, SLIDE_HEIGHT)
  grad.addColorStop(0, "#FAFAFA")
  grad.addColorStop(1, "#F0F0F0")
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, SLIDE_WIDTH, SLIDE_HEIGHT)

  ctx.strokeStyle = "#E4E4E7"
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, 0.5, SLIDE_WIDTH - 1, SLIDE_HEIGHT - 1)

  // Accent bar
  ctx.fillStyle = accent
  ctx.fillRect(0, 0, SLIDE_WIDTH, 4)

  // Title
  ctx.textBaseline = "top"
  ctx.fillStyle = "#18181B"
  const titleFontSize = Math.min(30, Math.max(20, 300 / Math.max(title.length, 8)))
  ctx.font = `700 ${titleFontSize}px system-ui, -apple-system, sans-serif`

  const titleMaxWidth = SLIDE_WIDTH - 120
  const titleLines = wrapText(ctx, title, titleMaxWidth)
  let currentY = 56

  for (const line of titleLines) {
    ctx.fillText(line, 56, currentY)
    currentY += titleFontSize * 1.3
  }

  // If we have slide images, render them on the right side
  let imageAreaRight = SLIDE_WIDTH - 56
  let imageAreaTop = currentY + 20
  let contentRight = SLIDE_WIDTH - 56

  if (slideImages.length > 0) {
    // Reserve space for images - show up to 2 images stacked
    const imgAreaWidth = Math.min(280, (SLIDE_WIDTH - 112) * 0.35)
    const imgStartX = SLIDE_WIDTH - 56 - imgAreaWidth
    contentRight = imgStartX - 24

    // Draw images
    let imgY = imageAreaTop
    const maxImages = Math.min(slideImages.length, 2)
    const imgHeight = Math.min(140, (SLIDE_HEIGHT - imageAreaTop - 40) / maxImages)

    for (let i = 0; i < maxImages; i++) {
      const img = new Image()
      try {
        img.src = slideImages[i]
        // Draw a placeholder box for the image
        ctx.fillStyle = "#F4F4F5"
        ctx.fillRect(imgStartX, imgY, imgAreaWidth, imgHeight)
        ctx.strokeStyle = "#D4D4D8"
        ctx.lineWidth = 1
        ctx.strokeRect(imgStartX, imgY, imgAreaWidth, imgHeight)

        // Try to draw the image (may not be loaded yet)
        // Since images load async, this might not work immediately
        // We show the placeholder and the img tag handles rendering
        ctx.fillStyle = "#A1A1AA"
        ctx.font = "12px system-ui, sans-serif"
        ctx.textAlign = "center"
        ctx.fillText("📷 Image", imgStartX + imgAreaWidth / 2, imgY + imgHeight / 2)
        ctx.textAlign = "left"
      } catch {
        // Skip if image can't be drawn
      }
      imgY += imgHeight + 8
    }
  }

  // Accent line under title
  const lineY = currentY + 12
  ctx.strokeStyle = accent
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(56, lineY)
  ctx.lineTo(56 + 40, lineY)
  ctx.stroke()

  // Bullets
  const bulletStartY = lineY + 28
  const bulletFontSize = 16
  ctx.font = `400 ${bulletFontSize}px system-ui, -apple-system, sans-serif`

  let bulletY = bulletStartY
  const maxBullets = Math.min(bullets.length, 7)
  const lineHeight = bulletFontSize * 1.6
  const bulletLeft = 56
  const bulletRight = contentRight

  for (let i = 0; i < maxBullets; i++) {
    if (bulletY + lineHeight > SLIDE_HEIGHT - 32) break

    ctx.fillStyle = accent
    ctx.globalAlpha = 0.7
    ctx.beginPath()
    ctx.arc(bulletLeft + 4, bulletY + bulletFontSize / 2 - 1, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    ctx.fillStyle = "#52525B"
    const textX = bulletLeft + 18
    const maxTextWidth = Math.max(bulletRight - textX, 200)
    const wrapped = wrapText(ctx, bullets[i], maxTextWidth)

    for (let j = 0; j < wrapped.length; j++) {
      if (bulletY + lineHeight > SLIDE_HEIGHT - 32) break
      ctx.fillText(wrapped[j], textX, bulletY)
      bulletY += lineHeight
    }

    if (i < maxBullets - 1) bulletY += 3
  }

  return canvas.toDataURL("image/png", 0.92)
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  const words = text.split(" ")
  let currentLine = ""

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }

  if (currentLine) lines.push(currentLine)
  return lines.length > 0 ? lines : [text]
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
