# View Page Features — Multi-Agent Audit

**Date:** 2026-07-02
**Method:** 4 agents (UX Design, Product, Engineering, Accessibility) debated independently, then synthesized.

---

## Left Sidebar — What Goes There?

| Feature | UX | Product | Engineering | Accessibility | Verdict |
|---------|----|---------|-------------|---------------|---------|
| **Slide titles list** | ✅ FOR — outline with current highlight | ✅ FOR — keeps viewers oriented | ✅ FOR — <1hr, trivial from `slideData[].title` | 🔴 MUST — WCAG 1.3.1, semantic `<ul>` for screen reader nav | **Build** |
| **Slide thumbnail strip** | ✅ FOR — visual navigation | ❌ SKIP — doesn't drive conversion | 🔴 TRAP — `html2canvas` fragile, tiny text not useful | ⚠️ Low — redundant with titles | **Skip** |
| **"Made with Moduvox" CTA banner** | ⚠️ Low priority | ✅ HIGH — persistent conversion lever | ✅ FOR — 30min, static component | ⚠️ Neutral — just needs aria-label | **Build** |
| **Share button** | ⚠️ Nice-to-have | ✅ HIGH — viral loop, free acquisition | ✅ FOR — 30min, `clipboard.writeText` | ⚠️ Needs aria-label + focus | **Build** |
| **Keyboard shortcuts guide `?`** | ✅ FOR — small icon, big QoL | ⚠️ Neutral | ✅ FOR — 1-2hrs, static overlay | ✅ FOR — helps motor disabilities | **Build** |
| **Viewer count / social proof** | ⚠️ Nice-to-have | ✅ Medium — drives FOMO | ✅ FOR — trivial DB count | ⚠️ Needs aria-live updates | **Defer** |
| **Dark mode toggle** | — | ❌ SKIP — no conversion impact | 🔴 TRAP — 5-7 days, every component needs `dark:` | — | **Skip** |
| **Skip to main content link** | — | — | — | 🔴 MUST — WCAG 2.4.1, first focusable element | **Build** |
| **Download presentation** | ❌ Bad UX | ❌ SKIP — cannibalizes product | ✅ FOR — trivial | — | **Skip** |

### Sidebar Recommendation

```
┌──────────────────┐
│  Slide 1: Intro  │  ← Slide titles list (scrollable, semantic <ul>)
│  Slide 2: Data   │     current slide highlighted, click to jump
│  Slide 3: Results│
│  Slide 4: ...    │
│                  │
│  ─────────────── │
│  📤 Share        │  ← Share + CTA group
│  ✨ Made with    │
│     Moduvox →    │
│                  │
│  ⌨️  ? Shortcuts │  ← Bottom, small
└──────────────────┘
```

---

## Audio Bar — What Additional Features?

| Feature | UX | Product | Engineering | Accessibility | Verdict |
|---------|----|---------|-------------|---------------|---------|
| **Playback speed (0.75-2x)** | ✅ #1 QoL pick | ✅ Table stakes | ✅ <30min, `playbackRate` | ✅ Helps cognitive disabilities | **Build** |
| **Skip next/prev slide** | ✅ Essential for non-linear | ✅ Keeps engagement | ⚠️ Medium cost, edge cases | ✅ Keyboard nav requirement | **Build** |
| **Rewind/fast-forward 10s** | ✅ Tertiary, useful | ⚠️ Low impact | ✅ <15min, `currentTime ±= 10` | ✅ Helps fine navigation | **Build** |
| **Volume slider** | ✅ Expected | ⚠️ Table stakes | ✅ <30min | 🔴 MUST — WCAG 2.1.1 keyboard | **Build** |
| **Keyboard shortcuts (space, arrows)** | ✅ Essential | ⚠️ Expected | ✅ 1-2hrs | 🔴 MUST — WCAG 2.1.1 (A) | **Build** |
| **Remaining vs elapsed toggle** | ✅ Small, useful | ⚠️ Neutral | ✅ <15min | ⚠️ Needs aria-label | **Build** |
| **Captions/transcript toggle** | ⚠️ Niche but powerful | ⚠️ Defer — infra heavy | 🔴 HIGH cost — needs STT pipeline | 🔴 P0 — WCAG 1.2.2 (A), legal requirement | **Defer (architect for it)** |
| **Loop current slide** | ❌ Edge case, clutter | ❌ Skip | ✅ Trivial | — | **Skip** |
| **Autoplay toggle** | ❌ Default behavior | ❌ Skip | ✅ Trivial | — | **Skip** |
| **Bookmark/save slide** | ⚠️ Nice but anonymous users | ❌ Skip — no auth | ⚠️ Needs user accounts | — | **Skip** |

### Audio Bar Recommendation

```
┌──────────────────────────────────────────────────────────┐
│ ⏪ ⏮ ▶ ⏭ ⏩   ●━━━━━━━━━━━━━○━━━━━━━━  1:23 / 9:45  1x │
│  ^^^^ ^^ ^^   ^^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^ ^^ │
│  ││││ ││ ││   │                              │        └─ speed pill
│  ││││ ││ ││   └─ progress slider (role="slider")        │
│  ││││ ││ ││                                            │
│  ││││ ││ └─ Play/Pause (largest, dark circle)           │
│  ││││ │└── Skip to next slide                            │
│  ││││ └─── Skip to previous slide                       │
│  │││└───── Skip forward 10s                             │
│  ││└───── Skip back 10s (smaller than slide skip)       │
│  │└─────── Volume (click → slider, expandable)          │
│  └──────── Keyboard shortcuts ? icon                    │
└──────────────────────────────────────────────────────────┘
```

---

## Main Content Area

| Feature | UX | Product | Engineering | Accessibility | Verdict |
|---------|----|---------|-------------|---------------|---------|
| **Slide display (title + bullets)** | ✅ The product | ✅ The product | ✅ 1hr, from `slideData` | 🔴 MUST — semantic HTML | **Build** |
| **Watermark "Made with Moduvox"** | ⚠️ Subtle | ✅ Medium — brand exposure | ✅ <15min, CSS | ⚠️ Needs aria-hidden | **Build** |
| **End-of-presentation CTA screen** | ✅ Natural funnel | 🔴 Highest conversion moment | ⚠️ Medium — edge cases | ✅ Focus management | **Build** |
| **Empty state (no slides)** | ✅ Better than blank | ⚠️ Low | ✅ <15min | ✅ Announce to screen reader | **Build** |
| **Slide transitions (animation)** | ✅ Polish | ⚠️ Low | ✅ Easy CSS | ❌ `prefers-reduced-motion` | **Build (respect motion pref)** |

---

## Top QoL Picks (Across All Agents)

| Rank | Feature | Why | Effort |
|------|---------|-----|--------|
| 1 | **Playback speed** | Highest impact across all personas — UX says essential, Eng says trivial, A11y says helps cognition | <30min |
| 2 | **Skip to previous/next slide** | The primary navigation pattern. UX says non-linear watching is the norm. Eng flags edge cases but doable. | 1-2 days |
| 3 | **Slide titles list in sidebar** | Gives orientation, keyboard nav, screen reader structure. Trivial engineering. High accessibility value. | <1hr |
| 4 | **End-of-presentation CTA** | Product says highest conversion moment. Viewer just consumed the product's output. Strike when engagement peaks. | 1 day |
| 5 | **Keyboard shortcuts** | Space for play/pause, arrows for skip. Low effort, high return for power users and accessibility. | 1-2hrs |
| 6 | **Volume slider** | Current mute icon only — no keyboard-accessible volume. Required for WCAG. | <30min |
| 7 | **Rewind/FF 10s** | Trivial (15min), frequent use case for re-hearing a sentence. | <15min |

---

## Must-Fix Before Launch (WCAG 2.2 AA)

| # | Issue | WCAG | Fix |
|---|-------|------|-----|
| 1 | No `aria-label` on any button | 4.1.2 (A) | Add `aria-label="Play"`, `aria-label="Skip forward"`, etc. |
| 2 | No captions for narrated audio | 1.2.2 (A) | Architect transcript panel now, populate later |
| 3 | Progress bar is plain `<div>`, no `role="slider"` | 4.1.2 (A) | Add `role="slider"`, `aria-valuenow`, `tabindex="0"` |
| 4 | No keyboard controls for audio | 2.1.1 (A) | Space = play/pause, arrows = seek/skip |
| 5 | No skip-to-content link | 2.4.1 (A) | First focusable element, visually hidden until focused |
| 6 | Slide content not semantic HTML | 1.1.1 (A) | Use `<h1>`, `<p>`, `<ul>` — never images of text |
| 7 | No ARIA live region for play state | 4.1.3 (AA) | `aria-live="polite"` for "Playing" / "Paused" / slide changes |
| 8 | Focus not managed on slide change | 2.4.3 (A) | Programmatic `.focus()` on new slide heading |

---

## Engineering Watch List (Traps)

| Feature | Looks Like | Actually Is |
|---------|-----------|-------------|
| Skip to next/prev slide | "change index, swap audio" | Async signed URL load, loading state, race conditions, boundary handling |
| End-of-presentation CTA | "check if audio ended + last slide" | Multiple false positives: skipped slides, no audio, reload mid-presentation |
| Slide thumbnails | "generate small previews" | html2canvas (fragile) or pre-generated (new infra). Both bad. Skip. |
| Dark mode | "flip a class" | Now every component needs `dark:`. 5-7 days if done properly. Skip. |

---

## API Gap (Critical Blocker)

The view API (`GET /api/view/[shareToken]`) currently returns only `{ verified: true, title }` for verified sessions. **No slide data or audio URLs.** Everything in this audit depends on closing this gap first.

**Needed:** Extend the API response to include:
- `slideData`: `{ title: string, bullets: string[] }[]` (from `editor_state`)
- `presentationId`: for constructing audio URLs
- `slide_count`: total slides

Signed audio URLs can be generated per-slide on the client using the existing `/api/presentations/[id]/audio/slide/[slideNumber]` endpoint with the session token.
