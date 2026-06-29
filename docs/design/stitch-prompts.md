# Google Stitch Prompts — Moduvox

Copy these prompts into [labs.google.com/stitch](https://labs.google.com/stitch) to generate mockups.

> Design system reference: `docs/DESIGN.md`
> Product context: `docs/PRD.md`

---

## Prompt 1: Navbar

```
Generate a navbar for a B2B SaaS product called "Moduvox" that converts PowerPoint slides into AI-narrated training videos. The navbar must use:

Typography: Geist font. Logo text "Moduvox" in semibold weight.

Layout: Horizontal navigation, left-aligned logo, right-aligned nav links + CTA. Transparent background on scroll, solid on scroll-down. Max-width 1400px centered.

Color: Deep Charcoal background (#18181B), body text in Muted Steel (#71717A). One accent: Warm Amber (#D97706) for the CTA button only.

Links: "How it works" | "Features" | "Pricing" (even though MVP is free, include for future) — styled as ghost links, no underlines, subtle hover to white.

CTA: One button on the far right — "Start free" — filled Warm Amber background, white text, rounded-lg. Subtle spring-scale on hover (scale 1.02). No glow. No gradient.

Mobile: Links collapse to a slide-out drawer triggered by a hamburger icon. No horizontal scroll.

BANNED: No emojis. No "Login" as a filled button. No dropdown mega-menus. No sticky banner announcements. No "NEW" badges. No Inter font.
```

---

## Prompt 2: Main Landing Page

```
Generate the full landing page hero + 3 feature sections for "Moduvox" — a B2B SaaS tool that converts PowerPoint presentations into AI-narrated training videos in the user's own voice, with built-in viewer tracking.

Typography: Geist for body, Geist SemiBold for headings. Display headline at clamp(2.5rem, 5vw, 4rem).


HERO SECTION:
- ASYMMETRIC layout: text block left (60%), product visual right (40%). NOT centered.
- Headline: "Your slides. Your voice. No recording." (large, tight tracking)
- Subheadline below: "Upload a PPTX, clone your voice in 30 seconds, and get a complete narrated presentation with proof of who watched it."
- One CTA: "Start free" — filled Warm Amber, no secondary "Learn more" link.
- Right side: Show an actual screenshot or mockup of the Moduvox slide editor interface, not abstract shapes. Rounded corners, subtle shadow.
- Inline image technique: embed a small rounded photo of a slide thumbnail between headline words — acting as visual punctuation.
- NO scroll-down arrow. NO "Trusted by" logos. NO gradient background.

FEATURE SECTION 1 (How it works):
- ASYMMETRIC 2-column zig-zag. Left: visual (screenshot of PPTX upload screen). Right: text.
- Heading: "Upload, generate, share."
- Body: "Drop in your PowerPoint file and a 30-second voice sample. Our AI extracts speaker notes, writes natural narration, and clones your voice. Edit anything before it's final."
- NO 3 equal cards in a row.

FEATURE SECTION 2 (Smart Update):
- Alternate direction: Right: visual (before/after comparison showing changed slides). Left: text.
- Heading: "Change one slide. Update one slide."
- Body: "Updated a policy? Upload the revised deck. Only the changed slides get re-narrated. Your share link updates automatically. No re-recording the whole thing."
- Background: slightly darker than the hero (#F3F4F6) to create visual rhythm.

FEATURE SECTION 3 (Know who watched):
- Back to text-left, visual-right.
- Heading: "Know who actually watched."
- Body: "Require viewers to enter their email before watching. See completion rates, time spent, and who skipped. Export CSV reports for compliance audits."
- Visual: dashboard screenshot showing viewer report table.

Call to action before footer: "Start free" button, centered in a generous whitespace band.

BANNED: No emojis. No gradient heroes. No 3-column equal card grids. No "Seamless", "Unleash", "Elevate", "Next-Gen" copy. No fake round numbers. No Inter font. No scroll-down arrows or bouncing chevrons. No "Trusted by" logos.
```

---

## Prompt 3: Footer

```
Generate a footer for "Moduvox" — a B2B SaaS product. Clean, minimal, professional.

Typography: Geist font. Small body text (0.875rem).

Layout: 4-column grid. Left column: Logo + 1-line description. Columns 2-4: Link groups.
- Column 1 (wider): "Moduvox" logo mark + "Turn slides into narrated training, in your voice." in Muted Steel (#71717A)
- Column 2: "Product" — How it works, Features, Smart Update, Viewer Tracking
- Column 3: "Company" — About, Blog, Privacy, Terms
- Column 4: "Connect" — Email, Twitter/X, LinkedIn

Colors: Deep Charcoal background (#18181B). White/light gray text. Column headings in white semibold. Links in Muted Steel (#71717A) with hover to white.

Bottom bar: Full-width thin border-top. "2026 Moduvox. All rights reserved." centered. Small text.

Mobile: All columns stack to single column. Logo on top, link groups below.

BANNED: No emojis. No social media icons as colorful circles. No newsletter signup form (unnecessary for MVP). No "Made with love" cliché. No copyright symbol in huge text. No Inter font.
```

---

## Dashboard Prompt (Bonus)

```
Generate a dark-sidebar dashboard for "Moduvox" — a B2B SaaS tool that converts PowerPoint to narrated training videos.

Layout: 280px fixed dark sidebar (#18181B) on the left. Main content area on the right.

Sidebar:
- Logo "Moduvox" at top in white semibold
- Nav links: Dashboard, Library, Analytics, Settings — white text with charcoal active state
- Active link indicator: Warm Amber (#D97706) 3px border-left
- Bottom: user avatar circle + name + "Free plan" badge

Main Content Header:
- Page title "Presentations" (left), "New Presentation" Warm Amber filled CTA button (right)

Content: Two utility cards in a row:
- Card 1: "Usage" — "3 of 15 presentations used this month" with a thin progress bar
- Card 2: "Voice" — "Voice clone: My Voice v2" with a small waveform icon

Below: Full-width table
- Columns: Presentation Title | Slides | Views | Last Updated | Status
- Data rows alternating #FFFFFF / #F9FAFB backgrounds
- Status badges: "Ready" in green, "Draft" in gray, "Error" in red — inline pill shapes
- Sticky table header
- Each row clickable → navigates to presentation detail

BANNED: No emojis. No gradient. No Inter font. No rounded card borders larger than 0.75rem. No avatars in table rows. No pagination (MVP has fewer than 25 presentations).
```
