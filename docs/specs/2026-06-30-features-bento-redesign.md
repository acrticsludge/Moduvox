# Features Section Bento Grid Redesign

**Goal:** Replace the generic 14-card grid in the landing page features section with a bento grid showing actual product visuals that match the real dashboard UI 1:1.

**Design Read:** B2B SaaS landing for presentation-heavy teams (sales, training, compliance), with a clean Zinc-based monochrome palette, one accent (#18181B black), restrained motion, editorial typography.

**Dials:** `DESIGN_VARIANCE: 7`, `MOTION_INTENSITY: 4`, `VISUAL_DENSITY: 4`

## Layout: 3-Column Asymmetric Bento

```
┌─────────────────────────────────┬──────────────────────┐
│                                 │                      │
│                                 │     DASHBOARD        │
│         HOSTED PLAYER           │   "All Projects"     │
│      (col-span-2 wide)          │   + 2 ProjectCards   │
│                                 │                      │
│   slide card + narration        │                      │
│   + controls bar                ├──────────────────────┤
│                                 │                      │
│                                 │       UPLOAD         │
│                                 │   drag/drop zone     │
│                                 │   with Upload icon    │
├─────────────────┬───────────────┴──────────────────────┤
│                 │                                      │
│    UPLOAD       │              EDITOR                  │
│  (col-span-1)   │          (col-span-2)               │
│                 │    slide nav + textarea + play button│
│                 │    + progress bar + Generate Audio   │
├─────────────────┴──────────────────────────────────────┤
│              Feature highlights row (col-span-3)        │
│   Voice Clone · AI Narration · Email Gate · CSV Export │
│                       + CTA                             │
└────────────────────────────────────────────────────────┘
```

### Breakpoints
- **Desktop (lg+):** 3-column grid with asymmetric spans as shown
- **Mobile (< lg):** Single column stack: Player → Dashboard → Upload → Editor → Feature row
- **Grid classes:** `grid grid-cols-1 lg:grid-cols-3 gap-6`

---

## Cell 1: BentoPlayer (col-span-2 on desktop)

**Source of truth:** `ViewPlayer.tsx` lines 1-389 (loaded + main content state)

**What it shows:** A mini hosted player with a rendered slide card, narration caption, and sticky controls bar. Matches the real ViewPlayer component's loaded state pixel-for-pixel.

**Visual spec:**

```
div.rounded-xl.border.border-zinc-200.bg-white.shadow-sm.overflow-hidden
├── Slide area: div.bg-zinc-100.p-5
│   └── Slide card: div.rounded-xl.border.border-zinc-200.bg-white.shadow-sm
│       ├── Badge (absolute): div.rounded-full.bg-white/90.px-2.py-0.5.text-xs.font-semibold → "1 / 5"
│       └── Content: div.p-5
│           ├── h3 → "Q4 Revenue Overview" (text-sm font-bold text-[#18181B])
│           └── ul.space-y-2
│               ├── li → "• Market trends and competitive positioning"
│               └── li → "• Growth projections for Q1 2025"
├── Narration caption: div.border-t.border-zinc-100.px-4.py-3
│   ├── p.text-[10px].font-medium → "NARRATION"
│   └── p.text-xs.italic → "Let's walk through the key highlights..."
└── Controls bar: div.border-t.border-zinc-200.px-4.py-3
    ├── Progress bar: div.h-1.5.w-full.rounded-full.bg-zinc-200
    │   └── div.h-1.5.rounded-full.bg-[#18181B] (width: 35%)
    ├── Transport row: div.flex.items-center.justify-between.mt-2
    │   ├── SkipBack button: h-7 w-7 rounded-lg border border-zinc-200 → <SkipBack> h-3 w-3
    │   ├── Play button: h-7 w-7 rounded-full bg-[#18181B] → <Play> h-3 w-3 text-white
    │   ├── SkipForward button: same as SkipBack
    │   └── Time: "1:24 / 3:47" text-[10px] text-zinc-400
    └── Slide scrubber: div.flex.items-center.gap-1.mt-2
        ├── div.h-1.flex-1.rounded-full.bg-[#18181B]
        ├── div.h-1.flex-1.rounded-full.bg-zinc-400
        ├── div.h-1.flex-1.rounded-full.bg-zinc-200
        ├── div.h-1.flex-1.rounded-full.bg-zinc-200
        └── div.h-1.flex-1.rounded-full.bg-zinc-200
```

**Icons used:** `SkipBack`, `Play`, `SkipForward` from lucide-react

---

## Cell 2: BentoDashboard (col-span-1 on desktop)

**Source of truth:** `ProjectCard.tsx` lines 1-180, `dashboard/page.tsx` lines 50-95

**What it shows:** A mini dashboard with an "All Projects" header bar and 2 mini project cards, matching the real ProjectCard component identically.

**Visual spec:**

```
div.rounded-xl.border.border-zinc-200.bg-white.shadow-sm.overflow-hidden
├── Header: div.flex.items-center.justify-between.border-b.border-zinc-100.px-3.py-2
│   ├── h4.text-xs.font-semibold.text-[#18181B] → "All Projects"
│   └── span.text-[10px].text-[#71717A] → "+ New"
├── Content: div.p-3.space-y-2
│   ├── Mini ProjectCard 1: div.rounded-lg.border.border-zinc-200.bg-white
│   │   ├── Color bar: div.h-[3px].rounded-t-lg (bg-blue-500)
│   │   └── div.p-2.5
│   │       ├── div.flex.items-center.gap-2
│   │       │   ├── div.h-6.w-6.rounded-md.bg-blue-100 → <BookOpen> h-3 w-3
│   │       │   └── div
│   │       │       ├── p.text-[11px].font-semibold → "Sales Training Q4"
│   │       │       └── p.text-[10px].text-[#71717A] → "4 presentations"
│   │       └── p.text-[10px].text-zinc-400 → "Dec 15, 2025"
│   └── Mini ProjectCard 2: same structure (bg-green-500 / green-100 / <Presentation>)
│       → "Onboarding Guide" / "3 presentations"
├── Bottom CTA: div.border-t.border-zinc-100.p-3
│   └── "View all projects →" text-[10px] text-[#71717A]
```

---

## Cell 3: BentoUpload (col-span-1 on desktop)

**Source of truth:** `PptxUploadZone.tsx` lines 1-119

**What it shows:** A mini drag-and-drop upload zone matching the real PptxUploadZone component, showing the "no file" state identically.

**Visual spec:**

```
div.rounded-xl.border.border-zinc-200.bg-white.shadow-sm.overflow-hidden.p-5
├── Section label: p.text-[10px].font-medium.uppercase → "UPLOAD YOUR PPTX"
├── Drop zone: div.cursor-pointer.rounded-lg.border-2.border-dashed.border-zinc-300.p-5
│   ├── div.mx-auto.h-8.w-8.rounded-lg.bg-zinc-100.flex.items-center.justify-center → <Upload> h-4 w-4
│   ├── p.text-xs.font-medium → "Drop your PPTX here"
│   ├── p.text-[10px].text-[#71717A] → ".pptx files up to 50MB · max 30 slides"
├── Voice sample card: div.rounded-lg.border.border-zinc-200.bg-white.p-3
│   ├── div.flex.items-center.gap-2
│   │   ├── div.h-6.w-6.rounded-md.bg-zinc-100 → <Mic> h-3 w-3
│   │   └── div
│   │       ├── p.text-[11px].font-semibold → "Record voice sample"
│   │       └── p.text-[10px].text-[#71717A] → "30 seconds · WAV or MP3"
│   └── div.h-1.rounded-full.bg-zinc-200.mt-2 (progress bar placeholder)
```

---

## Cell 4: BentoEditor (col-span-2 on desktop)

**Source of truth:** `SlideEditor.tsx` lines 1-200 (right panel: slide nav, narration, audio section)

**What it shows:** A mini editor panel with slide navigation, narration textarea, "Generate Audio" button, and audio player, matching the real SlideEditor right panel identically.

**Visual spec:**

```
div.rounded-xl.border.border-zinc-200.bg-white.shadow-sm.overflow-hidden
├── Header: div.border-b.border-zinc-100.px-4.py-3
│   ├── p.text-[10px].font-medium.uppercase → "EDIT NARRATION"
├── Content: div.p-4.space-y-3
│   ├── Slide nav: div.flex.items-center.gap-2
│   │   ├── p.text-xs → "Slide"
│   │   ├── div.w-8.rounded.border.border-zinc-200.text-center → "1"
│   │   ├── p.text-xs → "of 5"
│   │   ├── button.h-6.w-6.rounded → ← (ChevronLeft h-3 w-3)
│   │   └── button.h-6.w-6.rounded → → (ChevronRight h-3 w-3)
│   ├── Label: p.text-[10px].font-medium → "Narration Script"
│   ├── Textarea div: div.rounded-lg.border.border-zinc-200.p-2.min-h-[60px]
│   │   └── p.text-xs.text-zinc-400 → "Let's walk through the key highlights from this quarter..."
│   ├── Generate button: div.rounded-lg.bg-[#18181B].px-3.py-1.5.text-xs.font-medium.text-white.inline-block
│   │   → "Generate Audio"
│   └── Audio player: div.flex.items-center.gap-2.rounded-lg.border.border-zinc-200.p-2
│       ├── Play button: div.h-6.w-6.rounded-full.bg-[#18181B] → <Play> h-3 w-3 text-white
│       ├── Progress: div.flex-1.h-1.rounded-full.bg-zinc-200
│       │   └── div.h-1.rounded-full.bg-[#18181B] (width: 60%)
│       └── Time: "2:15" text-[10px] text-zinc-400 tabular-nums
```

**Icons used:** `ChevronLeft`, `ChevronRight`, `Play` from lucide-react

---

## Feature Highlights Row (col-span-3 on desktop)

A compact row of key feature highlights below the bento grid, replacing the old card descriptions with scannable one-liner pills.

```
div.grid.grid-cols-2.lg:grid-cols-4.gap-4
├── Feature pill 1:
│   div.rounded-lg.border.border-zinc-200.bg-white.px-4.py-3
│   ├── div.flex.items-center.gap-2
│   │   ├── <Mic> h-4 w-4
│   │   └── p.text-sm.font-semibold → "Voice Cloning"
│   └── p.text-xs.text-[#71717A] → "30-second sample creates a realistic clone"
├── Feature pill 2
│   → "AI Narration" / "Gemini generates natural narration from your notes"
├── Feature pill 3
│   → "Email Gate" / "Viewers verify before watching. You know who watched."
└── Feature pill 4
    → "CSV Export" / "Export viewer data for compliance and audits."
```

---

## Mobile Behavior (< lg)

All cells stack vertically in order: Player → Dashboard → Upload → Editor → Feature row.

```css
/* lg: grid with spans */
/* < lg: single column stack — Tailwind default */
grid grid-cols-1 lg:grid-cols-3 gap-6
/* All cells default to col-span-1 on mobile naturally */
/* Player starts col-span-2 on lg: */
lg:col-span-2
/* Editor starts col-span-2 on lg: */
lg:col-span-2
/* Feature row starts col-span-3 on lg: */
lg:col-span-3
```

Each cell should be self-contained — no horizontal overflow, no absolute positioning breaking on mobile widths.

---

## File Structure

**New files to create:**
1. `frontend/components/landing/bento/BentoPlayer.tsx` — mini hosted player
2. `frontend/components/landing/bento/BentoDashboard.tsx` — mini project cards
3. `frontend/components/landing/bento/BentoUpload.tsx` — mini upload zone
4. `frontend/components/landing/bento/BentoEditor.tsx` — mini editor panel

**Existing files to modify:**
5. `frontend/components/landing/features-section.tsx` — replace card grid with bento grid

---

## Design Principles Applied

1. **1:1 matching with real dashboard** — every class, color, border-radius, spacing, and icon choice mirrors the actual component code
2. **Bento cell diversity** — Player has a dark slide area (zinc-100), Dashboard shows multiple cards, Upload has dashed border, Editor has form controls — not all white-on-white
3. **No eyebrow** — the section headline is self-explanatory, no uppercase label needed
4. **Feature row below** — the 4 feature pills replace the old 14-card descriptions with scannable one-liners, following the "long list needs a different UI component" rule
5. **Static mockups, no animation** — MOTION_INTENSITY is 4, so just CSS hover transitions on interactive elements
6. **Mobile collapse explicit** — single column stack below lg breakpoint
