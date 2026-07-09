# View Page Branding — Navbar & Footer

**Date:** 2026-07-02
**Status:** Approved for implementation
**Branch:** `feat/share-link-improvements`

## Purpose

After a viewer passes the gate on a public share link (`/view/[shareToken]`), the verified state currently renders a blank page (`null`). This spec adds lightweight brand-awareness chrome (navbar + footer) so viewers know the presentation was made with Moduvox.

## Design

### Layout

```
┌──────────────────────────────────────┐
│  Moduvox                             │  ← ViewNavbar (white bar, logo only)
├──────────────────────────────────────┤
│                                      │
│          (empty — blank)             │  ← flex-1, bg-[#F9FAFB]
│                                      │
├──────────────────────────────────────┤
│  2026 Moduvox                        │
│  Powered by Gemini AI and VoxCPM     │  ← ViewFooter (dark bg, minimal)
│  MVP v1.0.0                          │
└──────────────────────────────────────┘
```

- Navbar + footer appear **only** in the `verified` state (after gate success)
- Full viewport height with sticky footer via `flex min-h-screen flex-col`
- Static navbar (not fixed) — part of normal document flow

### ViewNavbar

- Location: `components/view/ViewNavbar.tsx`
- White background (`bg-white`), subtle border-bottom
- Just the "Moduvox" wordmark: `text-2xl font-semibold tracking-tight text-[#18181B]`
- No links, no buttons, no CTAs — pure brand awareness
- Height: `h-16` (matching main site navbar height)
- Inner max-width: `max-w-[1400px]` with `px-4 sm:px-6 lg:px-8`

### ViewFooter

- Location: `components/view/ViewFooter.tsx`
- Dark background: `bg-[#18181B]` with white/zinc text — matching main site footer
- Three lines:
  1. `2026 Moduvox. All rights reserved.` — white text
  2. `Powered by Gemini AI and VoxCPM` — `text-[#71717A]`
  3. `MVP v1.0.0` — badge: `rounded bg-white/5 px-2 py-0.5 text-[11px] font-medium text-zinc-500`
- Centered layout, one column, tight spacing
- Inner max-width: `max-w-[1400px]` with `px-4 sm:px-6 lg:px-8`
- Small padding: `py-6`

### Page.tsx Changes

- `verified` case in the switch renders:

```tsx
case "verified":
  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
      <ViewNavbar />
      <main className="flex-1" />
      <ViewFooter />
    </div>
  )
```

- Add imports for `ViewNavbar` and `ViewFooter`

## Scope

- Only touches: `page.tsx`, new `ViewNavbar.tsx`, new `ViewFooter.tsx`
- No changes to gate flow, API routes, email flow, tracking, or any other state
- No new dependencies
