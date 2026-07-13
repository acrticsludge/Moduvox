# Prompt: Generate Moduvox Demo PPTX

Use this prompt with Claude Code, ChatGPT, or any AI that can generate `.pptx` files (either directly via `python-pptx`, `pptxgenjs`, or by writing a script).

---

## Task

Generate a PowerPoint file (`moduvox-demo.pptx`) about **Moduvox** — an AI-powered presentation platform. The PPTX will be uploaded to Moduvox itself as a live demo, so the content must showcase what the product does while the demo itself demonstrates how it works.

## Brand Reference

- **Product name:** Moduvox
- **Tagline:** "Your slides. Your voice. No recording."
- **Tone:** Professional, confident, slightly warm — not hypey, not too dry
- **Colors:** Charcoal (#18181B) for headings, muted steel (#71717A) for body, white backgrounds with subtle separation
- **Fonts:** Clean sans-serif (the slides will be converted and viewed as PDFs, so use a standard font like Arial, Calibri, or Inter)
- **Logo:** None needed — use the name "Moduvox" in bold at the top of each slide or just the title slide

## Technical Requirements

- **Format:** `.pptx` (PowerPoint Open XML)
- **Slide size:** Widescreen 16:9
- **Slide count:** 10 slides
- **Fonts:** Use standard fonts only (Arial, Calibri, etc.) — no custom fonts that won't render on a headless LibreOffice
- **Design:** Clean, minimal, professional — lots of whitespace, no cluttered slides
- **Each slide** should have a clear title and either bullet points or a short paragraph. No walls of text.

## Slide Outline

### Slide 1 — Title Slide
- **Title:** Moduvox
- **Subtitle:** Your slides. Your voice. No recording.
- **Bottom text:** AI-Powered Narrated Presentations

### Slide 2 — The Problem
- **Title:** Creating narrated presentations is slow
- **Bullets:**
  - Recording voiceovers for every slide takes hours
  - Re-recording a single changed slide means redoing the whole thing
  - You can't tell who actually watched your presentation
  - Voice actors and studio time are expensive

### Slide 3 — The Solution
- **Title:** Upload. Generate. Share.
- **Content (not bulleted — three columns or steps):**
  - Step 1: Upload your PPTX and a 30-second voice sample
  - Step 2: AI generates slide-by-slide narration in your voice
  - Step 3: Share a link and track who watched, for how long, and which slides they lingered on

### Slide 4 — Voice Cloning
- **Title:** Your voice, not a robot
- **Bullets:**
  - Clone your voice from a 30-second recording
  - Choose from preset voices (no sample needed)
  - AI narrates each slide naturally — pacing, emphasis, pauses
  - Change one slide → regenerate just that slide's audio (not the whole deck)
  - Supports re-upload: keep existing narrations on unchanged slides

### Slide 5 — AI Narration
- **Title:** Narrations written for you
- **Bullets:**
  - Gemini AI reads each slide and writes natural narration text
  - Narration adapts to your content — technical, sales, educational
  - Full edit control: tweak any narration before generating audio
  - Regenerate narrations anytime with one click

### Slide 6 — Smart Updates
- **Title:** Change one slide. Update one slide.
- **Bullets:**
  - Re-upload a revised PPTX — we detect which slides changed
  - Unchanged slides keep their narrations and audio
  - Changed slides get new narrations; regenerate audio for just those
  - No more re-recording the whole deck for one typo fix

### Slide 7 — Viewer Tracking
- **Title:** Know who actually watched
- **Bullets:**
  - See exactly who opened your presentation
  - Track time spent on each slide
  - Know if viewers watched the full presentation or dropped off
  - Optional email gate: require viewers to verify before watching
  - Optional password protection for sensitive content

### Slide 8 — Use Cases
- **Title:** Built for real presentations
- **Bullets:**
  - **Sales decks** — send personalized narrated pitches that prospects actually watch
  - **Training & onboarding** — consistent narration every time, in your voice
  - **Executive updates** — async status updates with slide-level engagement data
  - **Education** — lecture recordings with slide-by-slide navigation

### Slide 9 — How It Works (Technical)
- **Title:** Behind the scenes
- **Bullets:**
  - PPTX → PDF conversion (per-slide, via LibreOffice)
  - Narration generation (Gemini 2.5 Flash AI)
  - Voice cloning + TTS (VoxCPM neural model)
  - Per-slide audio synced to PDF slides
  - Combined audio for continuous playback
  - All data encrypted at rest (AES-256)

### Slide 10 — Get Started
- **Title:** Try Moduvox
- **Content (centered, minimal):**
  - Upload a PPTX and a voice sample. Get a narrated presentation in minutes.
  - [Website URL — placeholder: https://moduvox.pulsemonitor.dev]
  - **CTA:** It's free to start.

---

## Design Notes

- Use **dark text on light backgrounds** (readable when viewed as PDF)
- Slide backgrounds should be **white** or **very light gray** (#F9FAFB)
- **Title text:** Bold, ~28-32pt
- **Body text:** Regular, ~16-18pt
- **Bullet spacing:** 1.5 line spacing for readability
- Keep **~4-6 bullets max** per slide — fewer is better
- Slide 3 should use a **3-column layout** (not bullets) to show the three steps visually
- Slide 10 should be **minimal and centered** — like a landing page CTA
- No animations, no transitions, no embedded media — this will be viewed as static slides with synced audio

## Output

Generate the file as `moduvox-demo.pptx`. Confirm the file was created and has all 10 slides before finishing.
