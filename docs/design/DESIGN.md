# Design System: Moduvox

> Visual design reference for the Moduvox landing page.
> **Accent:** Charcoal | **Font:** Geist | **Vibe:** Monochrome professional
> **Status:** MVP — single-page marketing site only. Dashboard, editor, and player deferred to V2.
> Date: 2026-06-24

---

## 1. Visual Theme & Atmosphere

A restrained monochrome interface with confident asymmetric layouts and fluid spring-physics motion. The atmosphere evokes a premium design studio — clean surfaces, high-contrast black-and-white composition, and a sense that the product handles complex technology so the user doesn't have to.

- **Density:** 5 / 10 — "Daily App Balanced." Generous whitespace between sections, enough density in dashboards to convey information at a glance.
- **Variance:** 6 / 10 — "Offset Asymmetric." Not perfectly symmetrical. Hero sections use asymmetric splits (60/40). Feature sections alternate layout direction. Not chaotic — intentional rhythm.
- **Motion:** 5 / 10 — "Fluid CSS." Spring-based interactions on buttons, cards, and navigation transitions. Not cinematic, not static. Feels polished and responsive.

---

## 2. Color Palette & Roles

### Core Colors

| Name | Hex | Role |
|------|-----|------|
| **Canvas** | `#F9FAFB` | Primary page background. Soft off-white. |
| **Surface** | `#FFFFFF` | Card backgrounds, modal surfaces, elevated panels. |
| **Charcoal Ink** | `#18181B` | Primary text, headings. Zinc-950 depth, not pure black. |
| **Muted Steel** | `#71717A` | Secondary text, descriptions, nav links, metadata. |
| **Border Faint** | `rgba(226, 232, 240, 0.6)` | Card borders, dividers, structural lines. Subtle. |
| **Section Alt** | `#F3F4F6` | Alternating section background. Creates visual rhythm between hero and feature sections. |

### Accent Color (Single)

| Name | Hex | Role | Restrictions |
|------|-----|------|-------------|
| **Charcoal Accent** | `#18181B` | Primary CTAs, active states, focus rings, sparse highlights | Used sparingly. Near-black for subtle high-contrast on CTAs and key interaction points. No glow. No gradient. Hover: `#27272A`. |

### Surface Variants (Dashboard)

| Name | Hex | Role |
|------|-----|------|
| **Dashboard Base** | `#FFFFFF` | Dashboard page background |
| **Sidebar** | `#18181B` | Dark sidebar, navigation rail |
| **Sidebar Text** | `#A1A1AA` | Inactive sidebar navigation links |
| **Sidebar Active** | `#FFFFFF` | Active sidebar link |
| **Sidebar Accent** | `#FFFFFF` | Active sidebar indicator (thin border-left, 3px). White maintains contrast on dark sidebar. |

### Status Colors

| State | Hex | Usage |
|-------|-----|-------|
| **Error** | `#DC2626` | Error text, error borders, destructive actions |
| **Success** | `#16A34A` | Completion badges, success states |
| **Warning** | `#52525B` | Approaching limit, attention needed |

### Absolute Bans

- ❌ No purple, blue-purple, or neon blues
- ❌ No gradient backgrounds on headers or CTAs
- ❌ No warm/cool gray fluctuation — stick to Zinc/Slate neutral grays exclusively
- ❌ No saturation above 80% on any color (exception: charcoal `#18181B` as accent)

---

## 3. Typography Rules

### Font Stack

| Context | Font | Weight | Fallback |
|---------|------|--------|----------|
| **UI / Body** | Geist | 400, 500, 600, 700 | system-ui, sans-serif |
| **Monospace / Data** | Geist Mono | 400, 500 | monospace |
| **Display / Headlines** | Geist (variable weight) | 600 (Semibold) for display, 700 (Bold) for emphasis | system-ui, sans-serif |

### Type Scale (Landing Page)

| Element | Size | Weight | Line Height | Tracking |
|---------|------|--------|-------------|----------|
| **Display / H1** | `clamp(2.5rem, 5vw, 4rem)` | 600 | 1.1 | -0.02em |
| **Section H2** | `clamp(1.75rem, 3.5vw, 2.5rem)` | 600 | 1.15 | -0.01em |
| **Section H3** | `1.25rem` | 600 | 1.3 | 0 |
| **Body** | `1rem` / `16px` | 400 | 1.6 | 0 |
| **Body Small** | `0.875rem` / `14px` | 400 | 1.5 | 0 |
| **Caption / Meta** | `0.75rem` / `12px` | 400 | 1.4 | 0.02em |

### Type Scale (Dashboard / App)

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| **Page Title** | `1.5rem` | 600 | 1.2 |
| **Section Heading** | `1.125rem` | 600 | 1.3 |
| **Table Header** | `0.75rem` | 500 | 1.4 |
| **Table Cell** | `0.875rem` | 400 | 1.4 |
| **Button** | `0.875rem` | 500 | 1.4 |
| **Input Label** | `0.875rem` | 500 | 1.4 |
| **Error Text** | `0.75rem` | 400 | 1.4 |

### Rules

- Body text max-width: `65ch` for readability
- All numbers in tables and data displays use Geist Mono
- Never use font size alone for hierarchy — use weight AND size AND color contrast
- Landing page display headlines are track-tight (-0.02em). Never track loose.

### Banned Fonts

- ❌ Inter (prohibited for all uses)
- ❌ Any serif font (Times New Roman, Georgia, Garamond, Palatino — all banned)
- ❌ System font stacks (unless falling back after Geist)
- ❌ DM Sans, Outfit, Cabinet Grotesk (reserved for other projects; we use Geist)

---

## 4. Component Stylings

### Buttons

| Variant | Background | Text | Border | Hover | Active |
|---------|-----------|------|--------|-------|--------|
| **Primary** | Charcoal `#18181B` | White | None | `#27272A`, scale 1.02 | Scale 0.98, no shadow |
| **Ghost** | Transparent | Muted Steel `#71717A` | None | Background `rgba(0,0,0,0.04)` | Background `rgba(0,0,0,0.08)` |
| **Outline** | Transparent | Charcoal Ink `#18181B` | 1px solid Zinc-300 | Background `#F9FAFB` | Background `#F3F4F6` |
| **Danger** | Transparent | Red `#DC2626` | 1px solid Red-300 | Background `#FEF2F2` | Background `#FEE2E2` |

- **Shape:** `rounded-lg` (`0.5rem`) for all buttons
- **Padding:** Horizontal `1rem` minimum, vertical `0.5rem`
- **Touch target:** Minimum `44px` height on mobile
- **No neon outer glows. No custom mouse cursors.**
- **No button groups** with multiple stacked CTA buttons (one primary per screen maximum)

### Cards

- Corner radius: `0.75rem` (`rounded-xl`)
- Background: Surface `#FFFFFF`
- Border: Border Faint `rgba(226, 232, 240, 0.6)`, 1px
- Shadow: None by default. Only use shadow when elevation communicates hierarchy (e.g., modal overlay, draggable elements). If shadowed: `0 1px 3px rgba(0,0,0,0.08)`
- Padding: `1.5rem` (`p-6`)
- **For high-density dashboard views:** Replace card containers with simple `border-top: 1px` dividers and generous whitespace. Cards are overused in AI-generated designs.

### Inputs / Forms

- Label positioned **above** input (not floating placeholder)
- Input background: Surface `#FFFFFF`
- Input border: 1px solid Zinc-300
- Focus ring: 2px solid Charcoal `#18181B`, offset 2px
- Error state: border turns red `#DC2626`, error text below in red at `0.75rem`
- Helper text below input in Muted Steel at `0.75rem`
- Padding inside input: `0.5rem 0.75rem`
- Border radius: `0.375rem` (`rounded-md`)
- **No rounded pills for inputs. No floating labels.**

### Loading States

- Skeletal loaders matching exact layout dimensions — rectangles for cards, lines for text
- Shimmer animation: diagonal sweep from transparent → white → transparent over 1.5s
- **No generic circular spinners** (exception: initial page load spinner only)
- Each loader should be distinguishable: a "card loader" looks like a card outline, a "table loader" looks like rows

### Empty States

- Composed composition: centered illustration (simple line-art or SVG icon within a React component) + heading explaining why it's empty + CTA to fill it
- No raw "No data" text
- Example for dashboard: illustration of a slide + microphone → "No presentations yet" → "Upload your first PPTX to get started" → CTA: "Upload presentation"

### Error States

- Inline error below the failing input, not a toast at the top of the page
- Page-level errors: centered panel with icon + message + retry button
- Toast errors: reserved for ephemeral failures (generation failed, network timeout). Positioned top-right. Auto-dismiss at 5s.
- Error message text: actionable, not technical. "Audio generation failed for slide 7. Try again." Not "Error 503 from VoxCPM2 Gradio endpoint."

---

## 5. Layout Principles

### Grid

- Landing page: CSS Grid with max-width `1400px` centered
- Dashboard: full-width fluid with fixed `280px` dark sidebar
- **No `calc()` percentage hacks.** Use CSS Grid or flexbox, not arithmetic.

### Section Spacing

- Landing page sections: `py-24` on desktop (`py-16` on mobile)
- Dashboard sections: `p-6` from sidebar + `gap-6` between cards
- Between elements within a card or section: `gap-4` or `gap-6` depending on density

### Hero Layout (Landing Page)

- **Asymmetric split:** text left (60% width), visual right (40% width)
- **Centered hero is BANNED** — never center headlines
- Text: Headline at top, subheadline below, CTA below that
- Visual: React mockup component (`EditorMockup`) rendering a simulated editor interface — not a real screenshot, not abstract shapes.
- **Inline thumbnail:** A React component (`SlideThumbnail`) renders a tiny simulated slide between headline words as visual punctuation.
- Example: "Your slides. {SlideThumbnail} Your voice. No recording."
- **No overlapping elements** — text and visual have their own clean spatial zones
- **No scroll-down arrow, no bouncing chevron, no "Scroll to explore" text**

> **Note:** All product visuals on the landing page are Tailwind-based React mockups (`components/landing/mockups/`). These keep the page self-contained and crisp at any resolution. Replace with real product screenshots when the UI is finalized.

### Feature Section Layout (Landing Page)

- Alternate direction every section:
  - Feature 1: Text left, visual right
  - Feature 2: Visual left, text right
  - Feature 3: Text left, visual right
- One feature gets spotlight emphasis per section
- **3-column equal card rows are BANNED.** Never three cards in a row with an icon + title + description.
- Use `max-w-65ch` on text columns for readability

### Dashboard Layout (V2 — Not in MVP)

- Fixed left sidebar (`280px`) — always visible, not collapsible in MVP
- Main content area: page title at top, scrollable content below
- Tables: full-width, sticky header, alternating row backgrounds (`#FFFFFF` / `#F9FAFB`)
- Status badges: inline pill shapes with colored text on tinted background

### Mobile Rules (< 768px)

- All multi-column layouts collapse to single column
- Landing page: hero stacks vertically (text on top, visual below)
- Dashboard sidebar: collapses to bottom tab bar or slide-out drawer
- Typography scales down via `clamp()` values (already defined above)
- Touch targets: minimum `44px`
- **No horizontal scroll allowed**

---

## 6. Motion & Interaction

### Spring Physics (Default)

```css
/* Premium, weighty feel — not floaty, not rigid */
transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
```

- All interactive elements (buttons, cards, nav links) use this spring curve on hover/active
- Never use `linear` or `ease-in` — they feel robotic

### Perpetual Micro-Interactions

- **One** element per page should have a subtle infinite loop, maximum:
  - **Landing page:** The hero visual can have a gentle, slow float (10s cycle, 5px amplitude). NOT a spinning wheel or pulsing glow.
  - **Dashboard:** The "create new" button can have a subtle pulse on page load that fades out after 3s. Not perpetual.
- **Never put animation on more than one element at a time.** The brain reads chaos.

### Staggered Reveals

- Lists/rows mount with cascading delay: each item appears 80ms after the previous
- Cards reveal with `opacity: 0 → 1` + `translateY(8px) → translateY(0)` over 300ms
- **Only animate on first render, not on every scroll** — use `IntersectionObserver` once

### Performance Rules

- **Animate exclusively on `transform` and `opacity`** — never `top`, `left`, `width`, `height`, `margin`, `padding`
- Hardware-accelerated animations only (GPU-composited properties)
- No animations on page load that block paint (no render-blocking JS animations)
- Grain/noise filter effects: use on fixed pseudo-elements only, never on animated containers

---

## 7. Page-Specific Patterns

### Landing Page (Marketing)

```
┌──────────────────────────────────────────────────────────────┐
│  Navbar (transparent, absolute)                               │
│  ┌──────┐  ┌──────────────┐  ┌───────────┐  ┌──────────┐   │
│  │LOGO  │  │ How it works │  │Features   │  │[Start]   │   │
│  └──────┘  └──────────────┘  └───────────┘  └──────────┘   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  HERO: Asymmetric split                                       │
│  ┌─────────────────────┐  ┌──────────────────┐               │
│  │ Headline + inline   │  │ Product screenshot│               │
│  │ image punctuation   │  │ (rounded, shadowed)│              │
│  │ Subheadline         │  │                   │               │
│  │ [Start free]        │  │                   │               │
│  └─────────────────────┘  └──────────────────┘               │
│                                                               │
│  FEATURE 1: Zig-zag (text left, visual right)                  │
│  FEATURE 2: Zig-zag (visual left, text right)                  │
│  FEATURE 3: Zig-zag (text left, visual right)                  │
│                                                               │
│  CTA BANNER: "Start free" (generous whitespace)               │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│  FOOTER (Dark background)                                     │
│  4-column grid → Logo + description + 3 link groups          │
│  Bottom bar: copyright                                        │
└──────────────────────────────────────────────────────────────┘
```

> **MVP scope:** This is the only page. Dashboard, slide editor, and viewer player are deferred to V2.
┌──────────────┬───────────────────────────────────────────────┐
│  NAVIGATION   │  MAIN CONTENT                                 │
│  ──────       │                                               │
│               │  Page Title: "Presentations"                  │
│  📊 Dashboard │  [New Presentation] (Charcoal CTA)          │
│  📁 Library   │                                               │
│  🔍 Analytics │  ┌──────────────┐  ┌──────────────┐          │
│  ⚙️ Settings  │  │ Usage card  │  │ Voice clone  │          │
│               │  │ 3/15 slides │  │ Active: My   │          │
│               │  │             │  │ Voice v2     │          │
│               │  └──────────────┘  └──────────────┘          │
│               │                                               │
│               │  ┌──────────────────────────────────────┐    │
│               │  │ Presentation Table                    │    │
│               │  │ Title    | Slides  | Views  | Date   │    │
│               │  │──────────|────────|────────|──────── │    │
│               │  │ Security | 35     | 12 of  | Jun 24 │    │
│               │  │ Training |        | 34     |        │    │
│               │  │──────────|────────|────────|──────── │    │
│               │  │ ...      | ...    | ...    | ...    │    │
│               │  └──────────────────────────────────────┘    │
└──────────────┴───────────────────────────────────────────────┘
```

### Slide Editor

```
┌──────────────────────────────────────────────────────────────┐
│  Back to Dashboard ←  "Security Training Q3"                 │
│                                                               │
│  ┌──────┐  ┌────────────────────────────┐  ┌────────────┐   │
│  │Slide │  │   Narration Text           │  │ Next →     │   │
│  │5 of  │  │                            │  │            │   │
│  │  12  │  │  ┌──────────────────────┐  │  └────────────┘   │
│  │      │  │  │ Edit narration here… │  │                   │
│  │thumb-│  │  │                      │  │  Emotion          │
│  │nails │  │  └──────────────────────┘  │  ┌────────────┐   │
│  │strip │  │                            │  │ Calm ▼     │   │
│  │      │  │  Status: Pending review    │  └────────────┘   │
│  └──────┘  └────────────────────────────┘                   │
│                                                               │
│  [Confirm Narration & Generate Audio]                        │
└──────────────────────────────────────────────────────────────┘
```

### Viewer Player

```
┌──────────────────────────────────────────────────────────────┐
│                         PLAYER                                │
│                                                               │
│                                                               │
│    ┌────────────────────────────────────────────────┐         │
│    │                                                │         │
│    │            [Slide visual displayed]            │         │
│    │                                                │         │
│    │                                                │         │
│    └────────────────────────────────────────────────┘         │
│                                                               │
│    ────────────────────────────────────────────────           │
│    ⏸  ◄ ►    Progress: ████████████░░░░ 67%                  │
│                                                               │
│    Slide 8 of 30                                              │
│    "Configure the firewall rules..."                          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 8. Anti-Patterns (Banned — Never Do)

### Typography
- ❌ Inter font — banned for all uses
- ❌ Any serif font — Times New Roman, Georgia, Garamond, Palatino
- ❌ DM Sans, Outfit, Cabinet Grotesk (we use Geist)
- ❌ Loose tracking on display headlines
- ❌ All-caps nav links or buttons (unless brand-required)
- ❌ Using font-size alone for hierarchy (must use weight + size + color)

### Color
- ❌ Overuse of accent — use charcoal sparingly (CTAs, focus rings, active states). Never as full backgrounds.
- ❌ Purple/neon blue anything — buttons, glows, backgrounds, gradients
- ❌ Gradient backgrounds on headers, CTAs, or hero sections
- ❌ Saturation above 80% on any color
- ❌ Warm/cool gray fluctuation — pick one gray family and stay within it

### Layout
- ❌ Centered hero sections (variance is 6; centered is banned above 4)
- ❌ Three identical cards in a row with icon + title + description
- ❌ "Trusted by 1,000+ companies" logo strip
- ❌ 3-column equal grid rows for features
- ❌ Overlapping elements — each element must occupy its own spatial zone
- ❌ `calc()` percentage hacks — use CSS Grid or flexbox
- ❌ `h-screen` — use `min-h-[100dvh]` instead
- ❌ Horizontal scroll on mobile

### Content
- ❌ Emojis anywhere in UI
- ❌ AI copywriting clichés: "Elevate", "Seamless", "Unleash", "Next-Gen", "Revolutionary", "Game-changing"
- ❌ Generic placeholder names: "John Doe", "Acme Corp", "Nexus"
- ❌ Fake round statistics: "99.99%", "50%", "10x"
- ❌ Broken Unsplash image links — use React mockup components instead (see `components/landing/mockups/`)
- ❌ Real product screenshots in MVP — use Tailwind-based React mockups until the real UI is built
- ❌ "Scroll to explore", "Swipe down", scroll arrows, bouncing chevrons

### Motion
- ❌ Neon outer glow on buttons or cards
- ❌ Spinning infinite loaders (exception: initial page load)
- ❌ Animating `top`, `left`, `width`, `height` — transform + opacity only
- ❌ Custom mouse cursors
- ❌ Page-load animations that block first paint

### Components
- ❌ Floating input labels — labels always above inputs
- ❌ Rounded pill inputs — use `rounded-md` (0.375rem)
- ❌ Button groups with multiple CTA buttons (one primary per view)
- ❌ "Login" as a filled primary button — it's a ghost link
- ❌ Dropdown mega-menus in navigation
- ❌ "NEW" badges on nav items
- ❌ Sticky announcement banners
