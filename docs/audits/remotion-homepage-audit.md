# Audit Report: Remotion HomePage Scene vs Actual Moduvox Home Page

**Date:** 2026-07-14  
**Auditor:** Parallel Agent (Explore)  
**Files Compared:**  
- Actual: `frontend/app/page.tsx`, `frontend/components/landing/hero.tsx`, `frontend/components/landing/footer.tsx`, `frontend/components/ui/Navbar.tsx`, `frontend/app/globals.css`  
- Remotion: `remotion-demo/src/scenes/HomePage.tsx`, `remotion-demo/src/components/Navbar.tsx`, `remotion-demo/src/styles/theme.ts`

---

## Executive Summary

**Overall Match: ~25%** - The Remotion HomePage scene has fundamental gaps in almost every area. It renders a simplified placeholder version rather than a 1:1 replica.

---

## Critical Gaps (Priority: 🔴 FIX IMMEDIATELY)

### 1. Logo - Missing SVG Wordmark
| Actual | Remotion |
|--------|----------|
| `<img src="/logo-wordmark.svg" alt="Moduvox" className="h-7" />` (28px) | Text "Moduvox" only, no SVG |

**File:** `remotion-demo/src/components/Navbar.tsx` - Missing logo import and rendering

### 2. Feature Sections - Only 1 of 3 Rendered
| Actual | Remotion |
|--------|----------|
| 3 `FeatureSection` components with alternating layouts | 1 feature section only |

**Missing Sections:**
- Section 2: "Change one slide. Update one slide." with `visualRight` + `CompareMockup`
- Section 3: "Know who actually watched." with `AnalyticsMockup`

### 3. Mockup Components - All 3 Replaced with Generic Placeholders

| Actual Mockup | Remotion Placeholder |
|---------------|---------------------|
| `EditorMockup` (complex: title bar, sidebar with 5 slides, preview, narration editor) | Simple window with 4 bars |
| `UploadMockup` (drop zone, voice sample with waveform, consent checkbox, generate button) | Dashed box "Drop PPTX here" |
| `CompareMockup` (side-by-side Old/Updated slides, green highlight, badge, update button) | **MISSING ENTIRELY** |
| `AnalyticsMockup` (summary stats, viewer table with badges, export CSV) | **MISSING ENTIRELY** |

### 4. Footer - Missing 8 Links, Disabled States, MVP Badge

| Actual (4 columns × links) | Remotion |
|---------------------------|----------|
| Product: Features ✓, Smart Update ✗, Viewer Tracking ✗ | Features only |
| Company: About, Security, Privacy, Terms (4) | About only |
| Connect: Email ✓, Twitter/X ✗, LinkedIn ✗ | Email only |
| Bottom: "MVP v1.0.0" badge | **MISSING** |
| Disabled styling: `text-zinc-600 cursor-not-allowed select-none` | **NOT IMPLEMENTED** |

### 5. Navbar - Completely Different Implementation

| Actual | Remotion |
|--------|----------|
| Fixed header with scroll-triggered backdrop blur (`bg-[#FFFFFF]/90 backdrop-blur-sm`) | Static, no scroll detection |
| Mobile drawer with hamburger (48px), slide-in from right, overlay | No mobile drawer |
| Auth-aware CTAs (Supabase integration) | Static `isLoggedIn` prop |
| Logo: SVG wordmark | Text only |
| Spring animation on "Start free" buttons | No spring curve |

---

## High Priority Gaps (Priority: 🟠 FIX SOON)

### 6. Hero H1 - Wrong Layout Structure
| Property | Actual | Remotion |
|----------|--------|----------|
| Layout | `flex flex-wrap items-center gap-x-3 gap-y-1` | Block with `<br/>` |
| Text balancing | `text-balance` | Missing |
| Font size | `clamp(2.5rem,5vw,4rem)` | `clamp(40px,5vw,64px)` (px vs rem) |

### 7. Hero Subtitle - Multiple Mismatches
| Property | Actual | Remotion |
|----------|--------|----------|
| Max width | `max-w-[58ch]` | `580px` (px ≠ ch) |
| Line height | `leading-relaxed` (1.625) | 1.6 |
| Margin top | `mt-6` (24px) | 32px |
| Text balancing | `text-pretty` | Missing |

### 8. Hero CTA Button - Swapped Padding, Wrong States
| Property | Actual | Remotion |
|----------|--------|----------|
| Padding | `px-6 py-3` (24px horizontal, 12px vertical) | `12px 24px` (SWAPPED) |
| Border opacity | `/70` (70%) | `99` (60%) |
| Hover/active states | `hover:scale-[1.02] hover:bg-[#27272A] active:scale-[0.98]` | None |
| Spring timing | `cubic-bezier(0.34,1.56,0.64,1)` | None |

### 9. Feature Section Typography
| Property | Actual | Remotion |
|----------|--------|----------|
| H2 margin | `mt-5` (20px) on `<p>` | `margin: '0 0 16px'` on `<h2>` |
| H2 text-balance | Yes | No |
| H2 leading | `leading-[1.1]` | Default |
| Body font size | `text-lg` (18px) | 16px |
| Body max-width | `max-w-[52ch]` | None |
| Body text-pretty | Yes | No |
| Body line-height | 1.625 | 1.6 |

---

## Medium Priority Gaps (Priority: 🟡 FIX FOR POLISH)

### 10. Colors - Missing Zinc Scale
Remotion has core brand colors but misses Tailwind zinc scale used throughout actual:
- `zinc-100`, `zinc-200`, `zinc-300`, `zinc-400`, `zinc-600` (for disabled items)

### 11. Responsive Behavior - Fixed Desktop Only
| Actual | Remotion |
|--------|----------|
| `sm:px-6 lg:px-8 lg:pt-44`, `lg:grid-cols-[50%_50%]`, `md:grid-cols-4` | Fixed `padding: '180px 32px 80px'`, always 2-col/4-col |
| Mobile hamburger + drawer | None |
| `touch-target` utilities (48px) | None |

### 12. Hero Layout Padding Conflict
Remotion has conflicting padding:
```tsx
paddingTop: theme.spacing.navbarHeight + 144,  // 208px
padding: '180px 32px 80px',  // Overrides to 180px
```
Actual: `pt-36` (144px) / `lg:pt-44` (176px), responsive horizontal padding

---

## Low Priority Gaps (Priority: 🟢 NICE TO HAVE)

### 13. Accessibility
- No ARIA attributes, no semantic landmarks (`<nav>`, `<header>`, `<footer>`, `<section>`, `<main>`)
- No focus-visible styles

### 14. Animations - Different Paradigm
Actual: CSS transitions for interactive web  
Remotion: Frame-based for video export (acceptable difference)

---

## Remediation Map (Line-by-Line)

| Remotion File:Line | Actual Reference | Fix Required |
|--------------------|------------------|--------------|
| `Navbar.tsx` | `Navbar.tsx:67` | Add `/logo-wordmark.svg` import and render |
| `HomePage.tsx:21-35` | `hero.tsx:20-22` | Fix hero padding, gap, responsive grid |
| `HomePage.tsx:38-50` | `hero.tsx:24-27` | Convert H1 to flex with spans + gap, add `text-balance` |
| `HomePage.tsx:51-61` | `hero.tsx:28-31` | Fix subtitle: `max-width: 58ch`, `line-height: 1.625`, `margin-top: 24px`, `text-pretty` |
| `HomePage.tsx:62-76` | `hero.tsx:41-47` | Fix CTA: padding `px-6 py-3`, border opacity `/70`, add spring + hover/active |
| `HomePage.tsx:80-131` | `editor-mockup.tsx:1-83` | Replace with actual EditorMockup structure |
| `HomePage.tsx:134-189` | `page.tsx:15-34` | Add 2 missing FeatureSections with correct mockups |
| `HomePage.tsx:137` | `feature-section.tsx:20` | Fix background alternating (`canvas` / `section-alt`) |
| `HomePage.tsx:152-166` | `feature-section.tsx:30-35` | Fix H2/P typography: margins, text-balance, text-pretty, sizes |
| `HomePage.tsx:168-187` | `upload-mockup.tsx:1-51` | Replace with actual UploadMockup |
| `HomePage.tsx:191-240` | `footer.tsx:1-94` | Add all 3 link groups with disabled items, MVP badge, responsive layout |

---

## Files to Create/Modify in Remotion Demo

### New Components Needed
1. `remotion-demo/src/components/EditorMockup.tsx` - Complex hero mockup
2. `remotion-demo/src/components/UploadMockup.tsx` - Feature section 1 mockup
3. `remotion-demo/src/components/CompareMockup.tsx` - Feature section 2 mockup
4. `remotion-demo/src/components/AnalyticsMockup.tsx` - Feature section 3 mockup
5. `remotion-demo/src/components/Footer.tsx` - Complete footer with all links

### Components to Rewrite
1. `remotion-demo/src/components/Navbar.tsx` - Add SVG logo, scroll backdrop, mobile drawer
2. `remotion-demo/src/scenes/HomePage.tsx` - Complete rewrite with all 3 feature sections
3. `remotion-demo/src/styles/theme.ts` - Add zinc scale colors

---

## Verification Checklist

After fixes, verify:
- [ ] Logo renders as SVG (28px height)
- [ ] Hero H1: two-line flex with gap, text-balance, clamp(2.5rem,5vw,4rem)
- [ ] Hero subtitle: 58ch max-width, leading-relaxed, mt-6, text-pretty
- [ ] Hero CTA: px-6 py-3, border 70% opacity, spring hover/active
- [ ] 3 FeatureSections with correct alternating backgrounds
- [ ] EditorMockup, UploadMockup, CompareMockup, AnalyticsMockup all present
- [ ] Footer: 4 columns, 10 links (3 disabled), MVP badge, responsive
- [ ] Navbar: scroll backdrop blur, mobile drawer, SVG logo
- [ ] All colors match actual design tokens exactly