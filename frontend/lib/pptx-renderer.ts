import JSZip from "jszip"

export type RenderedSlide = {
  number: number
  imageDataUrl: string
  title: string
}

const SLIDE_WIDTH = 960
const SLIDE_HEIGHT = 540 // 16:9

/**
 * Parse a PPTX file and render each slide as a canvas image.
 * Returns data URLs that can be used as <img> src.
 */
export async function renderPptx(file: File): Promise<RenderedSlide[]> {
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

    const dataUrl = renderSlideToCanvas(title, bullets, accent)
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
): string {
  const canvas = document.createElement("canvas")
  canvas.width = SLIDE_WIDTH
  canvas.height = SLIDE_HEIGHT
  const ctx = canvas.getContext("2d")!
  const dpr = window.devicePixelRatio || 1

  // Scale for retina
  canvas.width = SLIDE_WIDTH * dpr
  canvas.height = SLIDE_HEIGHT * dpr
  ctx.scale(dpr, dpr)

  // --- Background ---
  // Soft off-white with subtle gradient
  const grad = ctx.createLinearGradient(0, 0, 0, SLIDE_HEIGHT)
  grad.addColorStop(0, "#FAFAFA")
  grad.addColorStop(1, "#F0F0F0")
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, SLIDE_WIDTH, SLIDE_HEIGHT)

  // Subtle border
  ctx.strokeStyle = "#E4E4E7"
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, 0.5, SLIDE_WIDTH - 1, SLIDE_HEIGHT - 1)

  // --- Accent bar at top ---
  ctx.fillStyle = accent
  ctx.fillRect(0, 0, SLIDE_WIDTH, 4)

  // --- Shadow at bottom (subtle slide shadow) ---
  ctx.fillStyle = "rgba(0,0,0,0.03)"
  ctx.fillRect(0, SLIDE_HEIGHT - 8, SLIDE_WIDTH, 8)

  // --- Title ---
  const titleY = 72
  ctx.textBaseline = "top"
  ctx.fillStyle = "#18181B"
  const titleFontSize = Math.min(32, Math.max(22, 320 / Math.max(title.length, 10)))
  ctx.font = `700 ${titleFontSize}px system-ui, -apple-system, sans-serif`
  ctx.textBaseline = "top"

  // Word-wrap title
  const titleMaxWidth = SLIDE_WIDTH - 120
  const titleLines = wrapText(ctx, title, titleMaxWidth)
  let currentY = titleY
  for (const line of titleLines) {
    ctx.fillText(line, 60, currentY)
    currentY += titleFontSize * 1.3
  }

  // --- Accent line under title ---
  const lineY = currentY + 16
  ctx.strokeStyle = accent
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(60, lineY)
  ctx.lineTo(60 + 48, lineY)
  ctx.stroke()

  // --- Bullets ---
  const bulletStartY = lineY + 32
  const bulletFontSize = 18
  ctx.font = `400 ${bulletFontSize}px system-ui, -apple-system, sans-serif`
  ctx.fillStyle = "#52525B"

  let bulletY = bulletStartY
  const maxBullets = Math.min(bullets.length, 8)
  const lineHeight = bulletFontSize * 1.7
  const bulletLeft = 60
  const bulletRight = SLIDE_WIDTH - 60

  for (let i = 0; i < maxBullets; i++) {
    if (bulletY + lineHeight > SLIDE_HEIGHT - 40) break

    // Bullet dot
    ctx.fillStyle = accent
    ctx.globalAlpha = 0.7
    ctx.beginPath()
    ctx.arc(bulletLeft + 4, bulletY + bulletFontSize / 2 - 2, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    // Bullet text
    ctx.fillStyle = "#52525B"
    const textX = bulletLeft + 18
    const maxTextWidth = bulletRight - textX
    const wrappedBullet = wrapText(ctx, bullets[i], maxTextWidth)

    for (let j = 0; j < wrappedBullet.length; j++) {
      if (bulletY + lineHeight > SLIDE_HEIGHT - 40) break
      ctx.fillText(wrappedBullet[j], textX, bulletY)
      bulletY += lineHeight
    }

    // Add small gap between bullets
    if (i < maxBullets - 1) bulletY += 4
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
