# Google Stitch Prompt — Moduvox Brand Assets

## Overview

Two assets needed: a **logo mark** and an **Open Graph image** (1200x630) for link previews. Both must follow the brand identity below. No AI-generated artifacts like lens flares, glowing orbs, sparkles, abstract waves, gradient meshes, or floating geometric shapes. Keep it brutally minimal.

## Brand Identity Summary

```
Product:     Moduvox — Turn PPTX slides into narrated training videos using AI voice cloning
Tagline:     "Your slides. Your voice. No recording."
Tone:        Minimal, monochromatic, utilitarian, industrial
Colors:
  Charcoal   #18181B (primary, used for logo background, text, buttons)
  Canvas     #F9FAFB (background)
  Surface    #FFFFFF (white)
  Muted      #71717A (secondary text)
  Subtle     #A1A1AA (tertiary text, borders)
  Accent     None — the brand is purely monochrome (black + white + grays)
Font:        Geist Sans (geometric sans-serif, similar to Inter or SF Pro)
             No other typeface. No serif, no script, no display font.

Existing visual anchor:
  Favicon is a 32x32 charcoal (#18181B) rounded square (rx=6) with a white play triangle.
  This is the closest thing to a logo today.
```

## Constraint: No AI Slop

**Do not use any of these:**
- Long dashes (em dash — or en dash –)
- Sparkles, stars, orbs, glows, lens flares, light leaks
- Gradient meshes or multi-color gradients
- Abstract floating shapes
- 3D renders, isometric shapes, or pseudo-3D
- Glossy reflections or glassmorphism
- Wavy lines or blobs
- "Futuristic" tech patterns (circuit boards, dots, grids)

Allowed:
- Solid shapes (rectangles, circles, triangles, polygons)
- Typography
- White space
- Straight lines
- Simple geometric compositions

---

## Asset 1: Logo Mark

**Purpose:** Site logo. Used in header, favicon replacement, email header, and marketing.

**Format:** SVG — clean, minimal paths. No raster elements.

**Style:**
- A simple geometric mark combining a **play triangle** (representing video/audio/narration) with a **document/slide** concept (representing presentations)
- Or just a refined version of the existing favicon: a charcoal rounded square with a white play triangle
- Must work at 32x32 and scale up to 256x256
- Monochrome — no colors beyond black (#18181B) and white
- No text in the mark itself (wordmark "Moduvox" is separate)

**Deliver exactly this structure:**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <!-- logo mark paths here, monochrome only -->
</svg>
```

**Also provide:**
- A **wordmark version** that combines the mark + "Moduvox" text in Geist Sans equivalent (or a clean geometric sans), sized for a header (lockup)
- Suggested proportions: mark 32x32, text beside it at ~20px height with 10px gap

---

## Asset 2: Open Graph Image (1200x630)

**Purpose:** Preview image shown when a Moduvox link is shared on social media, Slack, WhatsApp, etc.

**Format:** 1200x630px PNG, flat design, no photos, no illustrations.

**Layout (strict):**

```
┌──────────────────────────────────────────────────┐
│                                                  │
│                                                  │
│              [Play icon in charcoal              │
│               rounded square, 80x80]             │
│                                                  │
│         Your slides. Your voice.                 │
│              No recording.                       │
│                                                  │
│   Upload a PPTX. Clone your voice. Get a         │
│   complete narrated presentation with viewer     │
│   tracking.                                      │
│                                                  │
│                    Moduvox                       │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Background:** #F9FAFB (canvas)
**Text colors:** #18181B (headline), #71717A (body), #A1A1AA (brand name at bottom)
**Typography:** Geist Sans or equivalent geometric sans (Inter, SF Pro)
**Headline:** 56px, semibold, tracking -0.02em, centered
**Subtitle:** 24px, regular, centered, max 600px wide
**Play icon:** Same style as favicon — 80x80 charcoal (#18181B) rounded square with white play triangle
**Brand:** "Moduvox" at bottom, 18px, semibold, #A1A1AA

**No decorations. No shapes. No icons beyond the play mark. Pure typography and whitespace.**

---

## Files to Generate

1. `moduvox-logo.svg` — The logo mark (32x32 viewBox, scalable)
2. `moduvox-logo-wordmark.svg` — Logo mark + "Moduvox" text lockup for header use
3. `moduvox-og.png` — The 1200x630 OG image with the exact layout above

No raster alternatives. No additional formats. No "also consider" variants. Just these three files matching the spec exactly.
