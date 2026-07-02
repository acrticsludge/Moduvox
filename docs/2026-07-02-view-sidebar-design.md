# View Page Sidebar — Design Spec

**Date:** 2026-07-02
**Status:** Spec

## Purpose

Replace the empty left sidebar on the view page (`/view/[shareToken]`) with useful viewer-facing information using shadcn components.

## Layout

```
┌────────────────────────┐
│ Presentation           │  ← section header
│                        │
│ 📅 Created             │
│   Jan 15, 2026         │
│                        │
│ ⏱️ Duration            │
│   9:45                 │
│                        │
│ 🔢 Slides              │
│   8                    │
├────────────────────────┤
│ Link                   │  ← section header
│                        │
│ [🔗 Copy Link]         │  ← shadcn Button
│                        │
│ ⏰ Expires: Never      │
├────────────────────────┤
│ Session                │  ← section header
│                        │
│ ✓ Progress saved       │
│   across sessions      │
│                        │
│ 🕐 First viewed        │
│   Today at 2:30 PM     │
├────────────────────────┤
│ ✨ Made with Moduvox   │  ← CTA banner row
├────────────────────────┤
│ Privacy  ·  Terms      │  ← footer links
└────────────────────────┘
```

## Sections

### 1. Presentation Info
- Header: "Presentation" in small uppercase label
- Created date: `📅 Jan 15, 2026` (formatted from `created_at`)
- Duration: `⏱️ 9:45` (from `slide_count * estimated time` or `total_duration_ms`)
- Slides: `🔢 8` (from `slide_count`)
- Each item is a row with icon + label + value

### 2. Link
- Header: "Link" in small uppercase label
- Copy button: shadcn `Button` with variant="outline", shows "🔗 Copy Link"
  - On click: `navigator.clipboard.writeText(window.location.href)`, changes to "Copied!" for 2s
- Expiration status: `⏰ Expires: Never` or `⏰ Expires: Mar 20, 2026`
  - Uses the presentation's `expires_at` field

### 3. Session
- Header: "Session" in small uppercase label
- Progress indicator: `✓ Progress saved across sessions` with a green checkmark
- First viewed: `🕐 First viewed: Today at 2:30 PM` (from viewer's `created_at`)

### 4. Brand CTA
- A single row: `✨ Made with Moduvox`
- Links to `/`
- Subtle hover effect

### 5. Legal Links
- `Privacy  ·  Terms` at the very bottom
- Links to `/privacy` and `/terms`
- Small text, muted color

## Data Requirements

Extend the view API GET response to include:
```typescript
{
  verified: true,
  title: string,
  created_at: string,
  slide_count: number,
  expires_at: string | null,
}
```

The viewer's first-viewed time needs a separate source:
- From the verify API response (`viewer.created_at`) stored in the verified state
- Or from the gate API response (`viewer.created_at`)

For now, use demo/hardcoded values where API data isn't available.

## Components

- `Button` (shadcn) — for Copy Link action
- `Tooltip` (shadcn) — for hover hints on icons
- lucide-react icons: `Calendar`, `Clock`, `Layers`, `Link`, `Shield`, `ExternalLink`
