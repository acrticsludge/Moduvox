# Mobile Responsiveness Pass — Design Spec

**Date:** 2026-08-01
**Status:** Approved

## Problem

The app has a poor mobile experience in the dashboard, presentation editor, and public view page:

1. **"All buttons unresponsive" bug** — `SlideEditor.tsx:2059` renders a `fixed inset-0 z-50` mobile-drawer wrapper **always** (below `lg`), but the wrapper itself has no `pointer-events-none` when the panel is closed. Its children are inert (backdrop `pointer-events-none`, panel `translate-y-full`), but the wrapper is a full-viewport transparent hit-target at `z-50` with `pointer-events: auto`. Everything beneath it — slide viewer, dashboard hamburger, voice toggle, and SlideEditor's own FAB (`z-30`) — becomes unclickable. The FAB sits *under* the wrapper, so the panel can never even be reopened.
2. **Floating buttons in odd places blocking content** —
   - Dashboard layout hamburger: `fixed left-3 top-20 z-20` (`layout.tsx:161-170`) floats over the left of every dashboard page header (titles/breadcrumbs start at y=64 because of `pt-16`).
   - Presentation editor voice-settings toggle: `fixed right-3 top-20 z-20` (`page.tsx:413-422`) floats over the editor top bar's action buttons (Rename/Archive/Delete at `page.tsx:511-554`).
3. **Tablet cramming (md–lg)** — editor content reserves `md:mr-[380px]` for a right panel that only renders at `lg` (`lg:flex`), wasting 380px and cramming content on 768–1024px screens. Same mismatch in the loading skeleton and the "upload" placeholder.
4. **Hamburger z-index conflict on main page** — `ProjectCard`'s dropdown menu is `z-20`, same layer as the floating hamburger; its backdrop (`z-10`) is below it.
5. **Touch users can't reach fullscreen controls** — prev/next/exit and the audio bar are gated behind `group-hover:` in both `SlideEditor` and the view page; no tap equivalent.
6. **View page info toggle overlaps the logo** — `fixed left-3 top-4 z-20` sits over the `ViewNavbar` logo band (0–64px).
7. **Minor** — `.touch-target` utility forces `flex justify-center` on left-aligned nav links (mis-centers icon+label); no global `overflow-x` guard.

## Goals

- Every floating control is **integrated into a page header/top bar**, positioned so it never covers content.
- The tap-blocking drawer wrapper is fixed (`pointer-events-none` when closed).
- Tablet layouts don't reserve space for panels that aren't shown.
- Fullscreen controls are reachable by tapping on touch devices.
- Desktop behavior unchanged.

**Hard constraint (user):** hamburgers (and all toggle buttons) must be in **ergonomic spots** and **must not block any data/content** on the site.

## Non-goals

- CookieConsentBanner (`z-50`, one-time, marketing concern) — out of scope.
- Landing/marketing pages — out of scope (except Navbar drawer link alignment, which is shared).
- `ViewerTable` desktop table (already has a mobile card layout).
- Full layout redesign or bottom-tab navigation — rejected in brainstorming.

## Design

### 1. Shared `SidebarToggle` component

Create `frontend/components/dashboard/SidebarToggle.tsx`:

- A hamburger button using the existing `useSidebar()` context (`open()`).
- `className` prop passthrough for positioning.
- Default: `md:hidden`, 48×48 touch target, `aria-label="Open sidebar"`, consistent with the existing button style (border, white bg, shadow-sm, `text-[#71717A] hover:text-[#18181B]`).

### 2. Dashboard layout — remove floating hamburger

`frontend/app/dashboard/layout.tsx`:

- **Remove** the floating hamburger block (`lines 161-170`).
- Keep the sidebar `<aside>` (off-canvas, `-translate-x-full` when closed), overlay, and `useSidebar` context exactly as-is.

### 3. Add `SidebarToggle` to each dashboard page header

Each of these page headers gets `<SidebarToggle className="mr-2 md:hidden" />` as the first item in its flex header row, so it appears to the LEFT of the title and pushes content right (never covering it):

- `frontend/app/dashboard/page.tsx` — "All Projects" header (line 82).
- `frontend/app/dashboard/projects/[id]/page.tsx` — breadcrumb row (line 152).
- `frontend/app/dashboard/voices/page.tsx` — header row.
- `frontend/app/dashboard/archived/page.tsx` — header row.
- `frontend/app/dashboard/settings/page.tsx` — header row.
- `frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx` — editor top bar (line 472).

All headers use `flex items-center justify-between` so adding a left sibling works cleanly. Headers are in normal flow (not fixed), so the hamburger **occupies layout space** rather than overlapping — satisfying the "must not block content" constraint.

### 4. Presentation editor — integrate voice-settings toggle into top bar

`frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx`:

- **Remove** the floating voice-settings toggle (`lines 413-422`).
- **Add** a `md:hidden` mic icon button at the START of the action-button cluster (`page.tsx:511`), before Rename. It uses the same 44×44 touch-target style as the other action buttons, opens `setMobileSidebarOpen(true)`.
- Keep the bottom-sheet drawer (`lines 424-454`) unchanged — it already has the correct `pointer-events-none` pattern.

### 5. SlideEditor — fix the tap-blocking drawer wrapper

`frontend/components/dashboard/SlideEditor.tsx`:

- **Line 2059:** change the wrapper to `className={`fixed inset-0 z-50 transition-opacity duration-300 lg:hidden ${showMobilePanel ? "" : "pointer-events-none"}`}` — mirrors the working pattern in `page.tsx:425`.
- Reposition the controls FAB (line 2050) so it never overlaps the audio-player band at the bottom of the viewer. New position: `fixed right-3 bottom-24 z-30` (96px from bottom) — clears the ~80px audio-player band regardless of whether audio exists, and stays within the thumb zone. Do not use a conditional position based on `audioUrl`; keep it static and simple.

### 6. Fix md–lg breakpoint mismatch

`frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx`:

- **Line 470:** `md:ml-80 md:mr-[380px]` → `md:ml-80 lg:mr-[380px]` (left sidebar exists at md+, right panel only at lg).
- **Line 354** (loading skeleton): same change.
- **Line 651** (upload placeholder): `hidden md:flex` → `hidden lg:flex`.

### 7. Fullscreen tap-to-reveal controls (editor + view)

**Editor — `SlideEditor.tsx`:**

- Add state `fullscreenControlsVisible` (default false).
- On the fullscreen target (the `group` container), add `onClick` that toggles the overlay when `isFullscreen`. Use `stopPropagation` on the overlay controls so tapping a control button doesn't hide the overlay.
- The fullscreen overlay (`line 1683`) visibility: `fullscreenControlsVisible || hover` — implement via the existing `group-hover` classes plus `opacity-100` when the state is true.
- The fullscreen audio bar (`line 1817`): same treatment — visible when `fullscreenControlsVisible` or hover.

**View page — `frontend/app/view/[shareToken]/page.tsx`:**

- Add state `fullscreenControlsVisible`.
- Same tap-to-reveal behavior on the fullscreen slide container (`line 777` `group`).
- Fullscreen overlay (`line 818`) and audio bar (`line 954`): same visibility rule.

### 8. View page — integrate info toggle into ViewNavbar

`frontend/app/view/[shareToken]/page.tsx`:

- **Remove** the floating info toggle (`lines 749-758`).
- Pass `onToggleInfo={() => setSidebarOpen(true)}` and `infoOpen={sidebarOpen}` to `ViewNavbar`.
- `frontend/components/view/ViewNavbar.tsx`: add an optional `md:hidden` info button in the right cluster (before Refresh) — shows only when `onToggleInfo` provided.

### 9. Minor fixes

- **`ProjectCard.tsx:116`:** dropdown menu `z-20` → `z-30` (kills the z-tie with the old hamburger layer).
- **`globals.css`:** add a `touch-target-row` utility: `@utility touch-target-row { @apply flex min-h-[48px] items-center gap-3; }` (no `justify-center`). Use it for dashboard sidebar links (`layout.tsx:137`) and Navbar drawer links (`Navbar.tsx:166,179,188,196`) so icon+label stay left-aligned.
- **`globals.css`:** add `overflow-x: clip` on `html, body` as a defensive guard against stray horizontal scroll.

## Files touched

| File | Change |
|---|---|
| `frontend/components/dashboard/SidebarToggle.tsx` | **New** — shared hamburger |
| `frontend/app/dashboard/layout.tsx` | Remove floating hamburger; sidebar links → `touch-target-row` |
| `frontend/app/dashboard/page.tsx` | Add `<SidebarToggle />` |
| `frontend/app/dashboard/projects/[id]/page.tsx` | Add `<SidebarToggle />` |
| `frontend/app/dashboard/voices/page.tsx` | Add `<SidebarToggle />` |
| `frontend/app/dashboard/archived/page.tsx` | Add `<SidebarToggle />` |
| `frontend/app/dashboard/settings/page.tsx` | Add `<SidebarToggle />` |
| `frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx` | SidebarToggle + integrate voice toggle + md/lg fixes |
| `frontend/components/dashboard/SlideEditor.tsx` | Drawer pointer-events fix, FAB position, fullscreen tap-to-reveal |
| `frontend/app/view/[shareToken]/page.tsx` | Remove floating toggle, tap-to-reveal, ViewNavbar wiring |
| `frontend/components/view/ViewNavbar.tsx` | Mobile info button |
| `frontend/components/dashboard/ProjectCard.tsx` | z-20 → z-30 |
| `frontend/components/ui/Navbar.tsx` | Drawer links → `touch-target-row` |
| `frontend/app/globals.css` | `touch-target-row` utility, overflow-x guard |

## Testing / verification

- `npm run type-check` from `frontend` → clean.
- `npm run build` from `frontend` → success.
- Final code review over the full diff.
- Manual smoke (if dev server available): mobile viewport — hamburger visible in headers and not overlapping titles; editor controls reachable; fullscreen tap reveals controls; view page info toggle in navbar.
