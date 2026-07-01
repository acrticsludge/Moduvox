# Features Section Bento Grid Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic 14-card grid in `features-section.tsx` with a bento grid showing real product mockups (Player, Dashboard, Upload, Editor) that match the actual dashboard UI 1:1.

**Architecture:** 4 new "bento mockup" components under `frontend/components/landing/bento/` that visually replicate the real dashboard UIs using static demo data + identical Tailwind classes. The existing `features-section.tsx` imports them into a 3-column asymmetric grid.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, lucide-react

---

## File Structure

**Create:**
- `frontend/components/landing/bento/BentoPlayer.tsx` — mini hosted player (matches ViewPlayer.tsx)
- `frontend/components/landing/bento/BentoDashboard.tsx` — mini project cards (matches ProjectCard.tsx)
- `frontend/components/landing/bento/BentoUpload.tsx` — mini upload zone (matches PptxUploadZone.tsx)
- `frontend/components/landing/bento/BentoEditor.tsx` — mini editor panel (matches SlideEditor right panel)

**Modify:**
- `frontend/components/landing/features-section.tsx` — replace card grid with bento grid

### Task 1: Create BentoPlayer component

**Files:**
- Create: `frontend/components/landing/bento/BentoPlayer.tsx`

- [ ] **Step 1: Write BentoPlayer.tsx**

```tsx
import { SkipBack, Play, SkipForward } from "lucide-react"

export function BentoPlayer() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      {/* Slide area */}
      <div className="bg-zinc-100 p-5">
        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-zinc-500 shadow-sm">
            1 / 5
          </div>
          <div className="p-5">
            <h3 className="text-sm font-bold text-[#18181B]">
              Q4 Revenue Overview
            </h3>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2 text-xs text-zinc-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                Market trends and competitive positioning
              </li>
              <li className="flex items-start gap-2 text-xs text-zinc-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                Growth projections for Q1 2025
              </li>
              <li className="flex items-start gap-2 text-xs text-zinc-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                Key strategic initiatives and roadmap
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Narration caption */}
      <div className="border-t border-zinc-100 px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          Narration
        </p>
        <p className="mt-1 text-xs italic text-zinc-600">
          &ldquo;Let&rsquo;s walk through the key highlights from this quarter&rsquo;s performance.&rdquo;
        </p>
      </div>

      {/* Controls bar */}
      <div className="border-t border-zinc-200 px-4 py-3">
        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-zinc-200">
          <div className="h-1.5 w-[35%] rounded-full bg-[#18181B] transition-all" />
        </div>

        {/* Transport controls */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button type="button" className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 hover:text-[#18181B]">
              <SkipBack className="h-3 w-3" />
            </button>
            <button type="button" className="flex h-7 w-7 items-center justify-center rounded-full bg-[#18181B] text-white">
              <Play className="h-3 w-3" />
            </button>
            <button type="button" className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 hover:text-[#18181B]">
              <SkipForward className="h-3 w-3" />
            </button>
          </div>
          <span className="text-[10px] tabular-nums text-zinc-400">
            1:24 / 3:47
          </span>
        </div>

        {/* Slide scrubber */}
        <div className="mt-2 flex items-center gap-1">
          <div className="h-1 flex-1 rounded-full bg-[#18181B]" />
          <div className="h-1 flex-1 rounded-full bg-zinc-400" />
          <div className="h-1 flex-1 rounded-full bg-zinc-200" />
          <div className="h-1 flex-1 rounded-full bg-zinc-200" />
          <div className="h-1 flex-1 rounded-full bg-zinc-200" />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors.

---

### Task 2: Create BentoDashboard component

**Files:**
- Create: `frontend/components/landing/bento/BentoDashboard.tsx`

- [ ] **Step 1: Write BentoDashboard.tsx**

```tsx
import { BookOpen, Presentation } from "lucide-react"

const mockProjects = [
  {
    name: "Sales Training Q4",
    count: "4 presentations",
    date: "Dec 15, 2025",
    color: "#3B82F6",
    icon: BookOpen,
  },
  {
    name: "Onboarding Guide",
    count: "3 presentations",
    date: "Dec 10, 2025",
    color: "#22C55E",
    icon: Presentation,
  },
]

export function BentoDashboard() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
        <h4 className="text-xs font-semibold text-[#18181B]">All Projects</h4>
        <span className="text-[10px] text-[#71717A]">+ New</span>
      </div>

      {/* Project cards */}
      <div className="space-y-2 p-3">
        {mockProjects.map((project) => {
          const Icon = project.icon
          return (
            <div
              key={project.name}
              className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
            >
              <div
                className="h-[3px] rounded-t-lg"
                style={{ backgroundColor: project.color }}
              />
              <div className="p-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${project.color}20` }}
                  >
                    <Icon className="h-3 w-3 text-zinc-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-[#18181B]">
                      {project.name}
                    </p>
                    <p className="text-[10px] text-[#71717A]">
                      {project.count}
                    </p>
                  </div>
                </div>
                <p className="mt-1 text-[10px] text-zinc-400">{project.date}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-zinc-100 p-3">
        <p className="text-[10px] text-[#71717A] hover:text-[#18181B]">
          View all projects &rarr;
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: No errors.

---

### Task 3: Create BentoUpload component

**Files:**
- Create: `frontend/components/landing/bento/BentoUpload.tsx`

- [ ] **Step 1: Write BentoUpload.tsx**

```tsx
import { Upload, Mic } from "lucide-react"

export function BentoUpload() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="p-5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          Upload your PPTX
        </p>

        {/* Drop zone */}
        <div className="mt-3 cursor-pointer rounded-lg border-2 border-dashed border-zinc-300 p-5 text-center hover:border-zinc-400 hover:bg-zinc-50">
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100">
            <Upload className="h-4 w-4 text-[#18181B]" />
          </div>
          <p className="mt-2 text-xs font-medium text-[#18181B]">
            Drop your PPTX here
          </p>
          <p className="mt-1 text-[10px] text-[#71717A]">
            .pptx files up to 50MB &middot; max 30 slides
          </p>
        </div>

        {/* Voice sample card */}
        <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-100">
              <Mic className="h-3 w-3 text-zinc-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-[#18181B]">
                Record voice sample
              </p>
              <p className="text-[10px] text-[#71717A]">
                30 seconds &middot; WAV or MP3
              </p>
            </div>
          </div>
          <div className="mt-2 h-1 w-full rounded-full bg-zinc-200">
            <div className="h-1 w-0 rounded-full bg-[#18181B]" />
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: No errors.

---

### Task 4: Create BentoEditor component

**Files:**
- Create: `frontend/components/landing/bento/BentoEditor.tsx`

- [ ] **Step 1: Write BentoEditor.tsx**

```tsx
import { ChevronLeft, ChevronRight, Play } from "lucide-react"

export function BentoEditor() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-zinc-100 px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          Edit Narration
        </p>
      </div>

      {/* Content */}
      <div className="space-y-3 p-4">
        {/* Slide nav */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#71717A]">Slide</span>
          <div className="flex w-8 items-center justify-center rounded border border-zinc-200 py-0.5 text-xs text-[#18181B]">
            1
          </div>
          <span className="text-xs text-[#71717A]">of 5</span>
          <div className="ml-auto flex items-center gap-1">
            <button type="button" className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-[#18181B]">
              <ChevronLeft className="h-3 w-3" />
            </button>
            <button type="button" className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-[#18181B]">
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Narration textarea */}
        <div>
          <p className="text-[10px] font-medium text-[#71717A]">
            Narration Script
          </p>
          <div className="mt-1 min-h-[60px] rounded-lg border border-zinc-200 p-2">
            <p className="text-xs leading-relaxed text-zinc-400">
              Let&rsquo;s walk through the key highlights from this quarter&rsquo;s performance...
            </p>
          </div>
          <p className="mt-1 text-right text-[10px] text-zinc-400">142 chars</p>
        </div>

        {/* Generate button */}
        <div className="inline-block rounded-lg bg-[#18181B] px-3 py-1.5 text-xs font-medium text-white">
          Generate Audio
        </div>

        {/* Audio player */}
        <div className="flex items-center gap-2 rounded-lg border border-zinc-200 p-2">
          <button type="button" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#18181B] text-white">
            <Play className="h-3 w-3" />
          </button>
          <div className="flex-1">
            <div className="h-1 w-full rounded-full bg-zinc-200">
              <div className="h-1 w-[60%] rounded-full bg-[#18181B]" />
            </div>
          </div>
          <span className="text-[10px] tabular-nums text-zinc-400">2:15</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: No errors.

---

### Task 5: Replace features-section.tsx with bento grid

**Files:**
- Modify: `frontend/components/landing/features-section.tsx` (full rewrite)

- [ ] **Step 1: Rewrite features-section.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Mic, Sparkles, Mail, BarChart3 } from "lucide-react";
import { BentoPlayer } from "./bento/BentoPlayer";
import { BentoDashboard } from "./bento/BentoDashboard";
import { BentoUpload } from "./bento/BentoUpload";
import { BentoEditor } from "./bento/BentoEditor";

const highlights = [
  {
    icon: Mic,
    name: "Voice Cloning",
    desc: "30-second sample creates a realistic clone of your voice.",
  },
  {
    icon: Sparkles,
    name: "AI Narration",
    desc: "Gemini generates natural narration from your slide notes.",
  },
  {
    icon: Mail,
    name: "Email Gate",
    desc: "Viewers verify before watching. You know who watched.",
  },
  {
    icon: BarChart3,
    name: "Viewer Dashboard",
    desc: "Completion rates, time spent, and CSV export for audits.",
  },
];

export function FeaturesSection() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, [supabase]);

  return (
    <section className="bg-[#F9FAFB]">
      <div className="mx-auto max-w-[1400px] px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-semibold leading-[1.1] tracking-[-0.02em] text-[#18181B] [font-size:clamp(1.75rem,3.5vw,2.5rem)]">
            Everything you need to turn slides into training.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[#71717A]">
            No recording. No editing. No re-recording when something changes.
          </p>
        </div>

        {/* Bento grid */}
        <div className="mt-16 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Player — hero cell */}
          <div className="lg:col-span-2">
            <BentoPlayer />
          </div>

          {/* Dashboard — top right */}
          <div className="lg:col-span-1">
            <BentoDashboard />
          </div>

          {/* Upload — bottom left */}
          <div className="lg:col-span-1">
            <BentoUpload />
          </div>

          {/* Editor — bottom right, wider */}
          <div className="lg:col-span-2">
            <BentoEditor />
          </div>
        </div>

        {/* Feature highlights row */}
        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {highlights.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.name}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100">
                    <Icon className="h-3.5 w-3.5 text-[#18181B]" />
                  </div>
                  <p className="text-sm font-semibold text-[#18181B]">
                    {feature.name}
                  </p>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#71717A]">
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA — only for logged-out users */}
        {!user && (
          <div className="mt-16 text-center">
            <p className="text-lg text-[#71717A]">
              All features included in the Free tier.
            </p>
            <a
              href="/signup"
              className="mt-4 inline-block rounded-lg border border-[#18181B]/70 bg-[#18181B] px-6 py-3 text-base font-medium text-white transition-transform duration-200 hover:scale-[1.02] hover:border-[#18181B] hover:bg-[#27272A] active:scale-[0.98]"
            >
              Get started free
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: No errors.

---

### Task 6: Create directory and final verification

- [ ] **Step 1: Create bento directory**

Run: `New-Item -ItemType Directory -Path "frontend\components\landing\bento" -Force`

- [ ] **Step 2: Create all 4 components and modify features-section.tsx**

Tasks 1-5 above executed in order.

- [ ] **Step 3: Full TypeScript check**

Run: `npx tsc --noEmit`
Expected: Exit code 0, no errors.

- [ ] **Step 4: Commit all changes**

```bash
git add frontend/components/landing/bento/ frontend/components/landing/features-section.tsx docs/superpowers/specs/2026-06-30-features-bento-redesign.md
git commit -m "feat: replace feature cards with bento grid showing real product mockups"
```

- [ ] **Step 5: Push**

```bash
git push origin feat/UI-improvements
```
