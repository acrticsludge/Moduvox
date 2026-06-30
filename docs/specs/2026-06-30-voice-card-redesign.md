# VoiceCard Redesign — Compact Inline Card

**Goal:** Eliminate uneven card heights in the voices grid by redesigning the VoiceCard component with a compact inline layout that is height-consistent regardless of content.

## Design

```
┌───────────────────────────────────────────────┐
│                                               │
│  ┌────┐                                       │
│  │ 🎵 │  Voice Name                 [▶]  [🗑]  │  ← Row 1: icon + name + actions
│  └────┘                                       │
│         Preset · Short description truncated   │  ← Row 2: type badge + desc (1 line)
│                                               │
│  ────────▪▪▪▪▪▪─────────────────────           │  ← Row 3: thin progress bar (playback only)
│                                               │
│  Test voice                            Dec 10 │  ← Row 4: compact footer
│                                               │
└───────────────────────────────────────────────┘
```

## Key Changes from Current

| Element | Current | New |
|---------|---------|-----|
| Header row | Icon + name + type label + delete | Icon + name + **play button** + delete |
| Description | Separate paragraph, varies 1-3 lines | **Inline** with type badge, `line-clamp-1` |
| Play/Test | "Test voice" text button in standalone row | **▶** icon button in header **+** "Test voice" in footer |
| Audio preview (cloned) | 40px button or 40px `<audio>` element | Thin 6px progress bar visible **only during playback** |
| Date | Lone item at bottom | Footer row, same line as "Test voice" |

## Behavior

- **▶ Play button** (header): For cloned voices with `sample_path` — loads signed URL and plays inline with thin progress bar. For preset or cloned without sample — opens TestVoiceModal.
- **Test voice** (footer): Always opens TestVoiceModal for detailed preview (existing behavior).
- **Progress bar**: `h-1.5 rounded-full bg-zinc-200` with child `h-1.5 rounded-full bg-[#18181B]`. Driven by `<audio>` element's `timeupdate` event. Only rendered during playback.
- **Description**: `line-clamp-1` with ellipsis overflow.

## File Changes

- Modify: `frontend/app/dashboard/voices/page.tsx` — rewrite the inline `VoiceCard` component (lines 42-147)

## Visual Tokens (unchanged from existing)

- Card: `rounded-xl border border-zinc-200 bg-white` with `hover:border-zinc-300 hover:shadow-sm`
- Icon container: `h-10 w-10 rounded-xl bg-zinc-100`
- Name: `font-medium text-[#18181B]`
- Type badge: `text-xs text-[#71717A]`
- Description: `text-xs text-zinc-500`
- Delete: `h-8 w-8 rounded-lg text-[#71717A] hover:bg-red-50 hover:text-red-600`
- Play: `h-8 w-8 rounded-full bg-[#18181B] text-white hover:bg-[#27272A]`
- Date: `text-xs text-zinc-400`
- Progress bar: `h-1.5 rounded-full bg-zinc-200` / `bg-[#18181B]`
