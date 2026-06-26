import JSZip from "jszip"

export type RenderedSlide = {
  number: number
  html: string
  title: string
}

/**
 * Render a PPTX file to styled slide HTML using JSZip parsing.
 * Extracts text content from each slide and renders it as
 * a beautiful slide card that looks like a real PowerPoint slide.
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

    const html = buildSlideHtml(title, bullets, accent)
    slides.push({ number: index, html, title })
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

function buildSlideHtml(title: string, bullets: string[], accent: string): string {
  const escapedTitle = escapeHtml(title)

  if (bullets.length === 0) {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:360px;padding:48px 56px;font-family:system-ui,-apple-system,sans-serif;">
        <div style="width:100%;max-width:600px;text-align:center;">
          <h2 style="font-size:28px;font-weight:700;color:#18181B;margin:0 0 8px 0;line-height:1.3;letter-spacing:-0.02em;">${escapedTitle}</h2>
        </div>
      </div>`
  }

  const bulletsHtml = bullets
    .map(
      (b) => `
        <li style="display:flex;align-items:flex-start;gap:14px;margin-bottom:14px;">
          <span style="display:inline-flex;width:7px;height:7px;border-radius:50%;background:${accent};margin-top:8px;flex-shrink:0;opacity:0.7;"></span>
          <span style="font-size:16px;line-height:1.65;color:#52525B;">${escapeHtml(b)}</span>
        </li>`,
    )
    .join("")

  return `
    <div style="display:flex;flex-direction:column;height:100%;min-height:360px;padding:44px 52px;font-family:system-ui,-apple-system,sans-serif;">
      <h2 style="font-size:26px;font-weight:700;color:#18181B;margin:0 0 16px 0;line-height:1.3;letter-spacing:-0.02em;padding-right:24px;">${escapedTitle}</h2>
      <hr style="border:none;border-top:2px solid ${accent};width:48px;margin:0 0 24px 0;opacity:0.5;" />
      <ul style="list-style:none;padding:0;margin:0;flex:1;display:flex;flex-direction:column;justify-content:center;">
        ${bulletsHtml}
      </ul>
    </div>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
