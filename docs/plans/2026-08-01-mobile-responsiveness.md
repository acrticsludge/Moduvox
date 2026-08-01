# Mobile Responsiveness Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all mobile responsiveness issues: integrate floating toggle buttons into page headers (never blocking content), fix the SlideEditor tap-blocking drawer, fix the md–lg breakpoint mismatch, add tap-to-reveal fullscreen controls, and clean up minor z-index/touch-target issues.

**Architecture:** Keep the existing layout (fixed navbar + off-canvas sidebar + bottom-sheet drawers). Move floating buttons into page header rows (in-flow, pushing content instead of covering it). Fix the `pointer-events` bug on the always-rendered mobile drawer. Add a `fullscreenControlsVisible` state to both editor and view page for touch-accessible fullscreen controls.

**Tech Stack:** Next.js App Router, TypeScript strict, Tailwind CSS, React state.

**Spec:** `docs/specs/2026-08-01-mobile-responsiveness-design.md`

---

### Task 0: Stash pre-existing SlideEditor.tsx change

The working tree has an **uncommitted audio-player refactor** in `frontend/components/dashboard/SlideEditor.tsx` (11 insertions / 19 deletions). Our Tasks 4 and 5 touch that file, so stash it first and restore it at the end (Task 8).

- [ ] **Step 1: Verify dirty state**

Run: `git status --short`
Expected: ` M frontend/components/dashboard/SlideEditor.tsx` (and nothing else).

- [ ] **Step 2: Stash the audio-player change**

```bash
git stash push -- frontend/components/dashboard/SlideEditor.tsx
```

Run: `git status --short`
Expected: clean.

- [ ] **Step 3: Commit nothing yet** — Task 0 is a working-tree operation only.

---

### Task 1: Create shared `SidebarToggle` component

**Files:**
- Create: `frontend/components/dashboard/SidebarToggle.tsx`
- Test: `npm run type-check` (from `frontend/`)

- [ ] **Step 1: Create the component**

Create `frontend/components/dashboard/SidebarToggle.tsx`:

```tsx
"use client"

import { Menu } from "lucide-react"
import { useSidebar } from "@/app/dashboard/layout"

export function SidebarToggle({ className = "" }: { className?: string }) {
  const { open } = useSidebar()
  return (
    <button
      type="button"
      onClick={open}
      className={`inline-flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-[#71717A] transition-colors hover:text-[#18181B] md:hidden ${className}`}
      aria-label="Open sidebar"
    >
      <Menu className="h-4 w-4" />
    </button>
  )
}
```

Note: `md:hidden` is baked in — on md+ the static sidebar is visible so no toggle is needed.

- [ ] **Step 2: Verify type-check**

Run: `npm run type-check` (from `frontend/`)
Expected: passes with no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/dashboard/SidebarToggle.tsx
git commit -m "feat: add shared SidebarToggle component"
```

---

### Task 2: Dashboard layout — remove floating hamburger, fix sidebar links

**Files:**
- Modify: `frontend/app/dashboard/layout.tsx`

- [ ] **Step 1: Remove the floating hamburger**

In `frontend/app/dashboard/layout.tsx`, delete the entire block:

```tsx
            {/* Mobile hamburger — floats above content when sidebar is closed */}
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="fixed left-3 top-20 z-20 inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg border border-zinc-200 bg-white shadow-sm text-[#71717A] transition-colors hover:text-[#18181B] md:hidden"
                aria-label="Open sidebar"
              >
                <Menu className="h-4 w-4" />
              </button>
            )}
```

- [ ] **Step 2: Remove the now-unused `Menu` import**

In `frontend/app/dashboard/layout.tsx` change:

```tsx
import { LayoutGrid, Mic, Settings, Archive, Menu } from "lucide-react"
```

to:

```tsx
import { LayoutGrid, Mic, Settings, Archive } from "lucide-react"
```

- [ ] **Step 3: Fix sidebar link alignment (`touch-target` → `touch-target-row`)**

In `frontend/app/dashboard/layout.tsx`, the sidebar nav link currently uses `touch-target`. Change it to use `touch-target-row` (defined later in Task 7 — create it in this same task to keep the file compiling):

Replace:

```tsx
className={`touch-target gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150 ${
   active
     ? "bg-zinc-100 text-[#18181B]"
     : "text-[#71717A] hover:bg-zinc-50 hover:text-[#18181B]"
 }`}
```

with:

```tsx
className={`touch-target-row gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150 ${
   active
     ? "bg-zinc-100 text-[#18181B]"
     : "text-[#71717A] hover:bg-zinc-50 hover:text-[#18181B]"
 }`}
```

- [ ] **Step 4: Verify type-check**

Run: `npm run type-check` (from `frontend/`)
Expected: passes (may fail until Task 8 adds `touch-target-row` — if it fails on the utility only, that's expected; proceed).

- [ ] **Step 5: Commit**

```bash
git add frontend/app/dashboard/layout.tsx
git commit -m "fix: remove floating sidebar hamburger and align nav links"
```

---

### Task 3: Add SidebarToggle to dashboard page headers

**Files:**
- Modify: `frontend/app/dashboard/page.tsx`
- Modify: `frontend/app/dashboard/projects/[id]/page.tsx`
- Modify: `frontend/app/dashboard/voices/page.tsx`
- Modify: `frontend/app/dashboard/archived/page.tsx`
- Modify: `frontend/app/dashboard/settings/page.tsx`
- Modify: `frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx`

**Pattern for each header:** the header is a flex row (`flex items-center justify-between`). Insert `<SidebarToggle />` as the first child inside a small left group so it appears left of the title and pushes content right (never overlapping). Import it with the other dashboard component imports.

- [ ] **Step 1: `dashboard/page.tsx`**

Add import:

```tsx
import { SidebarToggle } from "@/components/dashboard/SidebarToggle"
```

Change the header (currently):

```tsx
      <div className="flex items-center justify-between border-b border-[var(--color-border-faint)] bg-white px-4 py-3 sm:px-6 sm:py-4">
        <h1 className="text-lg font-semibold text-[#18181B]">All Projects</h1>
```

to:

```tsx
      <div className="flex items-center justify-between border-b border-[var(--color-border-faint)] bg-white px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2">
          <SidebarToggle />
          <h1 className="text-lg font-semibold text-[#18181B]">All Projects</h1>
        </div>
```

- [ ] **Step 2: `projects/[id]/page.tsx`**

Add import:

```tsx
import { SidebarToggle } from "@/components/dashboard/SidebarToggle"
```

Change the header (currently):

```tsx
        <div className="flex items-center gap-1.5 text-sm sm:gap-2">
          <a
            href="/dashboard"
            className="font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
          >
            All Projects
          </a>
```

to:

```tsx
        <div className="flex items-center gap-1.5 text-sm sm:gap-2">
          <SidebarToggle />
          <a
            href="/dashboard"
            className="font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
          >
            All Projects
          </a>
```

- [ ] **Step 3: `voices/page.tsx`**

Add import:

```tsx
import { SidebarToggle } from "@/components/dashboard/SidebarToggle"
```

Change the header (currently):

```tsx
      <div className="flex items-center justify-between border-b border-[var(--color-border-faint)] bg-white px-4 py-3 sm:px-6 sm:py-4">
        <h1 className="text-lg font-semibold text-[#18181B]">My Voices</h1>
```

to:

```tsx
      <div className="flex items-center justify-between border-b border-[var(--color-border-faint)] bg-white px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2">
          <SidebarToggle />
          <h1 className="text-lg font-semibold text-[#18181B]">My Voices</h1>
        </div>
```

- [ ] **Step 4: `archived/page.tsx`**

Add import:

```tsx
import { SidebarToggle } from "@/components/dashboard/SidebarToggle"
```

Change the header (currently):

```tsx
        <div className="flex items-center gap-2 text-sm">
          <a
            href="/dashboard"
```

to:

```tsx
        <div className="flex items-center gap-2 text-sm">
          <SidebarToggle />
          <a
            href="/dashboard"
```

- [ ] **Step 5: `settings/page.tsx`**

Add import:

```tsx
import { SidebarToggle } from "@/components/dashboard/SidebarToggle"
```

Change the header (currently):

```tsx
      <div className="border-b border-[var(--color-border-faint)] bg-white px-4 py-3 sm:px-6 sm:py-4">
        <h1 className="text-lg font-semibold text-[#18181B]">Settings</h1>
```

to:

```tsx
      <div className="border-b border-[var(--color-border-faint)] bg-white px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2">
          <SidebarToggle />
          <h1 className="text-lg font-semibold text-[#18181B]">Settings</h1>
        </div>
```

- [ ] **Step 6: Verify type-check**

Run: `npm run type-check` (from `frontend/`)
Expected: passes.

- [ ] **Step 7: Commit**

```bash
git add "frontend/app/dashboard/page.tsx" "frontend/app/dashboard/projects/[id]/page.tsx" "frontend/app/dashboard/voices/page.tsx" "frontend/app/dashboard/archived/page.tsx" "frontend/app/dashboard/settings/page.tsx"
git commit -m "feat: add sidebar toggle to dashboard page headers"
```

---

### Task 4: Presentation editor — integrate voice toggle, fix md/lg margins

**Files:**
- Modify: `frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx`

- [ ] **Step 1: Add SidebarToggle to the editor top bar**

Add import (with the other dashboard component imports):

```tsx
import { SidebarToggle } from "@/components/dashboard/SidebarToggle"
```

In the editor top bar (currently):

```tsx
        <div className="flex flex-wrap items-start gap-2 border-b border-[var(--color-border-faint)] bg-white px-4 py-3 md:flex-nowrap md:items-center md:px-6 md:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-sm md:gap-2">
            <a
              href="/dashboard"
```

Change to insert the toggle before the breadcrumb group:

```tsx
        <div className="flex flex-wrap items-start gap-2 border-b border-[var(--color-border-faint)] bg-white px-4 py-3 md:flex-nowrap md:items-center md:px-6 md:py-4">
          <SidebarToggle />
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-sm md:gap-2">
            <a
              href="/dashboard"
```

- [ ] **Step 2: Remove the floating voice-settings toggle**

Delete the block (currently):

```tsx
      {/* Mobile sidebar toggle */}
      {!mobileSidebarOpen && (
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="fixed right-3 top-20 z-20 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-zinc-200 bg-white shadow-sm text-zinc-500 transition-colors hover:text-zinc-800 md:hidden"
          aria-label="Open voice settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        </button>
      )}
```

- [ ] **Step 3: Add an inline mic button to the action cluster**

In the action cluster (currently):

```tsx
            <div className="flex items-center gap-1 border-l border-zinc-200 pl-2 md:ml-4 md:pl-4">
              <button
                type="button"
                onClick={() => setShowRename(true)}
```

Change to add a `md:hidden` mic button before Rename:

```tsx
            <div className="flex items-center gap-1 border-l border-zinc-200 pl-2 md:ml-4 md:pl-4">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-zinc-100 hover:text-[#18181B] md:hidden"
                aria-label="Open voice settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>
              <button
                type="button"
                onClick={() => setShowRename(true)}
```

- [ ] **Step 4: Fix md/lg content margins**

Change (line ~470, the content wrapper):

```tsx
      <div className="ml-0 mr-0 flex min-w-0 flex-1 flex-col md:ml-80 md:mr-[380px]">
```

to:

```tsx
      <div className="ml-0 mr-0 flex min-w-0 flex-1 flex-col md:ml-80 lg:mr-[380px]">
```

Also fix the loading skeleton (line ~354):

```tsx
      <div className="ml-0 mr-0 flex min-w-0 flex-1 flex-col md:ml-80 lg:mr-[380px]">
```

- [ ] **Step 5: Fix the upload placeholder breakpoint**

Change (line ~651, right panel placeholder):

```tsx
        <div className="hidden md:flex absolute bottom-0 right-0 top-0 z-20 w-[380px] flex-col items-center justify-center border-l border-[var(--color-border-faint)] bg-white px-6">
```

to:

```tsx
        <div className="hidden lg:flex absolute bottom-0 right-0 top-0 z-20 w-[380px] flex-col items-center justify-center border-l border-[var(--color-border-faint)] bg-white px-6">
```

- [ ] **Step 6: Verify type-check**

Run: `npm run type-check` (from `frontend/`)
Expected: passes.

- [ ] **Step 7: Commit**

```bash
git add "frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx"
git commit -m "fix: integrate voice toggle into editor top bar and fix tablet margins"
```

---

### Task 5: SlideEditor — fix tap-blocking drawer and FAB position

**Files:**
- Modify: `frontend/components/dashboard/SlideEditor.tsx`

- [ ] **Step 1: Fix the always-rendered drawer wrapper**

Find (line ~2059):

```tsx
      {slides.length > 0 && (
        <div className="fixed inset-0 z-50 transition-opacity duration-300 lg:hidden">
```

Change to:

```tsx
      {slides.length > 0 && (
        <div className={`fixed inset-0 z-50 transition-opacity duration-300 lg:hidden ${showMobilePanel ? "" : "pointer-events-none"}`}>
```

This mirrors the working pattern in the editor page (`page.tsx:425`). When closed, the wrapper no longer swallows taps.

- [ ] **Step 2: Reposition the controls FAB**

Find (line ~2050):

```tsx
          className="fixed right-3 bottom-20 z-30 inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full border border-zinc-200 bg-white shadow-lg text-zinc-600 transition-colors hover:text-zinc-900 lg:hidden"
```

Change `bottom-20` to `bottom-24`:

```tsx
          className="fixed right-3 bottom-24 z-30 inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full border border-zinc-200 bg-white shadow-lg text-zinc-600 transition-colors hover:text-zinc-900 lg:hidden"
```

This clears the ~80px audio-player band at the bottom of the viewer.

- [ ] **Step 3: Verify type-check**

Run: `npm run type-check` (from `frontend/`)
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/dashboard/SlideEditor.tsx
git commit -m "fix: stop mobile drawer from blocking all taps and move FAB clear of audio player"
```

---

### Task 6: Fullscreen tap-to-reveal — SlideEditor + view page

**Files:**
- Modify: `frontend/components/dashboard/SlideEditor.tsx`
- Modify: `frontend/app/view/[shareToken]/page.tsx`

- [ ] **Step 1: Editor — add state**

In `SlideEditor.tsx`, near the other state declarations (around line 191), add:

```tsx
  const [fullscreenControlsVisible, setFullscreenControlsVisible] = useState(false)
```

- [ ] **Step 2: Editor — tap toggles overlay**

Find the fullscreen viewer container (line ~1656):

```tsx
            <div
              ref={slideViewerRef}
              className={`group relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden transition-all ${
                isFullscreen ? (fitToScreen ? "p-0 bg-black" : "p-0") : "p-4"
              }`}
            >
```

Add an `onClick` that toggles controls only in fullscreen:

```tsx
            <div
              ref={slideViewerRef}
              onClick={() => { if (isFullscreen) setFullscreenControlsVisible((v) => !v) }}
              className={`group relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden transition-all ${
                isFullscreen ? (fitToScreen ? "p-0 bg-black" : "p-0") : "p-4"
              }`}
            >
```

- [ ] **Step 3: Editor — overlay visibility + stop propagation**

Find the fullscreen overlay (line ~1683):

```tsx
                <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-between opacity-0 transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100">
```

Change to a state-driven class and add `onClick` stopPropagation so tapping a control doesn't toggle the overlay:

```tsx
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute inset-0 z-50 flex items-center justify-between transition-opacity duration-300 ${
                    fullscreenControlsVisible
                      ? "pointer-events-auto opacity-100"
                      : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
                  }`}
                >
```

- [ ] **Step 4: Editor — audio bar visibility (DEFERRED to Task 9)**

DO NOT touch the editor's fullscreen audio bar in this task. The committed code at line ~1811 has the OLD `{isFullscreen && audioUrl && ...}` structure, but the user's uncommitted audio-player refactor (stashed in Task 0) restructures that exact region. Editing it here would conflict with the stash pop at Task 9 and bake part of the user's uncommitted work into a commit. Task 9 (after `git stash pop`) will re-apply the `fullscreenControlsVisible` visibility wiring to the restored audio bar.

- [ ] **Step 5: View page — add state**

In `frontend/app/view/[shareToken]/page.tsx`, near the other state declarations, add:

```tsx
  const [fullscreenControlsVisible, setFullscreenControlsVisible] = useState(false)
```

- [ ] **Step 6: View page — tap toggles overlay**

Find the fullscreen main container (line ~777):

```tsx
            <main id="viewer-main-content" ref={viewerContentRef} className={`relative flex flex-1 flex-col items-center ${isFullscreen ? `group min-h-0 min-w-0 p-0 justify-center overflow-hidden${fitToScreen ? " bg-black" : ""}` : "p-4 md:p-8"}`}>
```

Add `onClick`:

```tsx
            <main
              id="viewer-main-content"
              ref={viewerContentRef}
              onClick={() => { if (isFullscreen) setFullscreenControlsVisible((v) => !v) }}
              className={`relative flex flex-1 flex-col items-center ${isFullscreen ? `group min-h-0 min-w-0 p-0 justify-center overflow-hidden${fitToScreen ? " bg-black" : ""}` : "p-4 md:p-8"}`}
            >
```

- [ ] **Step 7: View page — overlay visibility + stop propagation**

Find the fullscreen overlay (line ~818):

```tsx
                      <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-between opacity-0 transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100">
```

Change to:

```tsx
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute inset-0 z-50 flex items-center justify-between transition-opacity duration-300 ${
                          fullscreenControlsVisible
                            ? "pointer-events-auto opacity-100"
                            : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
                        }`}
                      >
```

- [ ] **Step 8: View page — audio bar visibility**

Find (line ~954):

```tsx
            <div className={isFullscreen ? 'absolute bottom-0 left-0 right-0 z-[100] opacity-0 transition-opacity duration-300 hover:opacity-100' : ''}>
```

Change to:

```tsx
            <div
              onClick={(e) => e.stopPropagation()}
              className={isFullscreen ? `absolute bottom-0 left-0 right-0 z-[100] transition-opacity duration-300 ${fullscreenControlsVisible ? "opacity-100" : "opacity-0 hover:opacity-100"}` : ''}
            >
```

- [ ] **Step 9: Verify type-check**

Run: `npm run type-check` (from `frontend/`)
Expected: passes.

- [ ] **Step 10: Commit**

```bash
git add frontend/components/dashboard/SlideEditor.tsx "frontend/app/view/[shareToken]/page.tsx"
git commit -m "feat: add tap-to-reveal fullscreen controls on touch devices"
```

---

### Task 7: View page — integrate info toggle into ViewNavbar

**Files:**
- Modify: `frontend/components/view/ViewNavbar.tsx`
- Modify: `frontend/app/view/[shareToken]/page.tsx`

- [ ] **Step 1: ViewNavbar — add optional info button**

In `frontend/components/view/ViewNavbar.tsx`:

Add prop to the type and destructuring:

```tsx
export function ViewNavbar({ onRefresh, onToggleInfo }: { onRefresh?: () => void; onToggleInfo?: () => void }) {
```

Add the info button in the right cluster, before the refresh button (inside the `ml-auto` group). Change:

```tsx
        <div className="ml-auto" />
        {onRefresh && (
```

to:

```tsx
        <div className="ml-auto" />
        {onToggleInfo && (
          <button
            type="button"
            aria-label="Show presentation info"
            onClick={onToggleInfo}
            className="touch-target-sm mr-1 flex items-center justify-center rounded-lg text-zinc-500 transition-colors hover:text-zinc-800 md:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </button>
        )}
        {onRefresh && (
```

- [ ] **Step 2: View page — remove floating info toggle**

In `frontend/app/view/[shareToken]/page.tsx`, delete:

```tsx
            {/* Mobile sidebar toggle */}
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="fixed left-3 top-4 z-20 inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg border border-zinc-200 bg-white shadow-sm text-zinc-500 transition-colors hover:text-zinc-800 md:hidden"
                aria-label="Show info"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              </button>
            )}
```

- [ ] **Step 3: View page — pass props to ViewNavbar**

Find the ViewNavbar usage:

```tsx
          <ViewNavbar
            onRefresh={() => {
```

Add the `onToggleInfo` prop:

```tsx
          <ViewNavbar
            onToggleInfo={() => setSidebarOpen(true)}
            onRefresh={() => {
```

- [ ] **Step 4: Verify type-check**

Run: `npm run type-check` (from `frontend/`)
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/view/ViewNavbar.tsx "frontend/app/view/[shareToken]/page.tsx"
git commit -m "feat: move view page info toggle into navbar"
```

---

### Task 8: Minor polish — ProjectCard z-index, touch-target-row, overflow guard

**Files:**
- Modify: `frontend/components/dashboard/ProjectCard.tsx`
- Modify: `frontend/components/ui/Navbar.tsx`
- Modify: `frontend/app/globals.css`

- [ ] **Step 1: ProjectCard — bump dropdown z-index**

In `frontend/components/dashboard/ProjectCard.tsx`, find:

```tsx
        <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg">
```

Change `z-20` → `z-30`:

```tsx
        <div className="absolute right-0 z-30 mt-1 w-40 rounded-lg">
```

- [ ] **Step 2: Add `touch-target-row` utility**

In `frontend/app/globals.css`, after the existing `@utility touch-target` block, add:

```css
@utility touch-target-row {
  @apply flex min-h-[48px] items-center gap-3;
}
```

- [ ] **Step 3: Navbar drawer links — use `touch-target-row`**

In `frontend/components/ui/Navbar.tsx`, replace `touch-target` with `touch-target-row` on the drawer links (they currently mis-center icon+label). Change all four occurrences:

1. Line ~166 (`className="touch-target rounded-lg px-3 py-2.5 text-base font-medium ..."`)
2. Line ~179 (Dashboard button `className="touch-target rounded-lg border ..."`)
3. Line ~188 (Log in `className="touch-target rounded-lg px-3 py-2.5 text-base font-medium ..."`)
4. Line ~196 (Start free `className="touch-target rounded-lg border ..."`)

Each: `touch-target` → `touch-target-row`.

- [ ] **Step 4: Add overflow-x guard**

In `frontend/app/globals.css`, at the top of the base styles (where `html, body` are styled), add:

```css
  html, body {
    overflow-x: clip;
  }
```

(If `html, body` already has a rule, merge into it — do not duplicate selectors.)

- [ ] **Step 5: Verify type-check + build**

Run: `npm run type-check` (from `frontend/`) → passes.
Run: `npm run build` (from `frontend/`) → succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/dashboard/ProjectCard.tsx frontend/components/ui/Navbar.tsx frontend/app/globals.css
git commit -m "fix: bump card menu z-index, add touch-target-row, guard horizontal overflow"
```

---

### Task 9: Restore stashed audio-player change + re-apply editor audio-bar visibility

- [ ] **Step 1: Pop the stash**

```bash
git stash pop
```

Run: `git status --short`
Expected: `frontend/components/dashboard/SlideEditor.tsx` modified (audio-player refactor restored). If the pop reports a conflict (because Task 6's nav-overlay changes are in the same file), resolve by keeping BOTH: the audio-player refactor AND the `fullscreenControlsVisible` nav-overlay changes.

- [ ] **Step 2: Re-apply audio-bar visibility wiring**

The restored (refactored) fullscreen audio bar in `SlideEditor.tsx` now looks like:

```tsx
        {/* Audio player — single instance, never unmounts during fullscreen toggle (matches view page pattern).
            In normal mode sits at the bottom of the slide viewer; in fullscreen overlays at viewport bottom. */}
        {audioUrl && (
          <div
            className={
              isFullscreen
                ? "absolute bottom-0 left-0 right-0 z-[100] opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-auto"
                : "mt-auto pt-3"
            }
          >
```

Change the `isFullscreen` branch to also show when `fullscreenControlsVisible`, and add `onClick` stopPropagation on the wrapper so tapping audio controls doesn't hide the overlay:

```tsx
        {/* Audio player — single instance, never unmounts during fullscreen toggle (matches view page pattern).
            In normal mode sits at the bottom of the slide viewer; in fullscreen overlays at viewport bottom. */}
        {audioUrl && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={
              isFullscreen
                ? `absolute bottom-0 left-0 right-0 z-[100] transition-opacity duration-300 ${
                    fullscreenControlsVisible
                      ? "opacity-100 pointer-events-auto"
                      : "opacity-0 group-hover:opacity-100 pointer-events-auto"
                  }`
                : "mt-auto pt-3"
            }
          >
```

Do NOT commit this file — it must remain as the user's uncommitted audio-player work (now including the visibility wiring). Verify with `git diff --stat frontend/components/dashboard/SlideEditor.tsx` that the change is confined to SlideEditor.tsx.

---

### Task 10: Final verification

- [ ] **Step 1: Full test + type-check + build**

From `frontend/`:

```bash
npm run type-check
npm run build
```

Both expected: clean.

- [ ] **Step 2: Run existing unit tests to catch regressions**

From `frontend/`:

```bash
npx --yes tsx --test lib/__tests__/image-analysis.test.ts
npx --yes tsx --test lib/__tests__/voice-description.test.ts
```

Expected: all pass (18 + 8).

- [ ] **Step 3: Final code review** — dispatch reviewer over `git log --oneline <spec-commit>..HEAD` (spec commit is the `docs: add mobile responsiveness design spec` commit). Verify: end-to-end coherence (hamburger in headers not overlapping content, no floating toggles remaining, drawer pointer-events fixed, md/lg margins consistent, fullscreen tap works — including the audio-bar wiring in the uncommitted SlideEditor diff), no `any`, no regressions to desktop layout, commit hygiene (audio-player change NOT in any commit).

- [ ] **Step 4: Working-tree check**

Run: `git status --short`
Expected: only ` M frontend/components/dashboard/SlideEditor.tsx` (the restored audio-player refactor + the audio-bar visibility wiring).
