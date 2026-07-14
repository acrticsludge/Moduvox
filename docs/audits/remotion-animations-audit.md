# Audit Report: Remotion Animations & Layout Issues vs Actual Moduvox

**Date:** 2026-07-14  
**Auditor:** Parallel Agent (Explore)  
**Files Compared:**  
- Actual: `frontend/app/globals.css` (animations), `frontend/components/landing/hero.tsx` (EditorMockup), `frontend/components/landing/footer.tsx`, all actual components  
- Remotion: `remotion-demo/src/scenes/*.tsx` (all 13 scenes), `remotion-demo/src/lib/animations.ts`

---

## Executive Summary

**Overall Match: ~15%** - The Remotion animations use a completely different paradigm (frame-based for video export) vs actual (CSS transitions for interactive web). The "grid of grey and white squares" dead space issue stems from missing mockup components replaced with placeholder divs. The SVG logo is missing entirely.

---

## Dead Space / "Grid of Grey and White Squares" Issue

### Root Cause: Missing Mockup Components Replaced with Placeholder Grids

| Scene | Actual Component | Remotion Placeholder | Visual Result |
|-------|------------------|---------------------|---------------|
| **Hero** | `EditorMockup.tsx` (83 lines) - Title bar, 5 slide thumbnails, preview with title/body, narration editor | `HomePage.tsx:80-131` - Window header + 4 sidebar bars + 1 large box + 2 small boxes | **Grey/white checkerboard** from placeholder divs |
| **Feature 1** | `UploadMockup.tsx` (51 lines) - Drop zone, voice sample waveform, consent checkbox, generate button | `HomePage.tsx:168-187` - Single dashed box "Drop PPTX here" | **Large empty grey box** |
| **Feature 2** | `CompareMockup.tsx` - Side-by-side Old/Updated slides, green highlight, badge, update button | **MISSING ENTIRELY** | **Dead space** (section not rendered) |
| **Feature 3** | `AnalyticsMockup.tsx` - Summary stats, viewer table with badges, export CSV | **MISSING ENTIRELY** | **Dead space** (section not rendered) |

**Total Dead Space:** ~40% of home page vertical space is either wrong component or missing entirely.

---

## Animation System Mismatch

### Actual (CSS Transitions - Interactive Web)

| Feature | Implementation |
|---------|----------------|
| **Navbar scroll backdrop** | `transition-colors duration-300` on header |
| **Mobile drawer** | `transition-opacity duration-300` (overlay), `transition-transform duration-300 ease-out` (panel) |
| **Button hover/active** | `transition-transform duration-200` + `SPRING` cubic-bezier(0.34,1.56,0.64,1) on "Start free" |
| **Slide-up animation** | `@utility animate-slide-up` → `animation: slide-up 0.25s ease-out` |
| **Skeleton loading** | `animate-pulse` on `bg-zinc-100` elements |
| **Focus states** | `focus-visible:ring-1 focus-visible:ring-ring` |

### Remotion (Frame-Based - Video Export)

| Feature | Implementation (`animations.ts`) |
|---------|----------------------------------|
| **fadeIn** | `interpolate(frame, [0, duration], [0, 1])` |
| **slideUp** | `spring({ frame, fps, config: { damping: 15, mass: 0.8 } })` |
| **scaleIn** | `interpolate(spring, [0, 1], [0.95, 1])` |
| **typingEffect** | `Math.floor(frame / speed)` char-by-char |
| **progressFill** | `interpolate(frame, [start, start+duration], [0, target])` |

**Key Mismatch:** Actual uses **ease-out** (0.25s) for slide-up; Remotion uses **spring** (damping: 15, mass: 0.8) which overshoots.

---

## Specific Animation Gaps by Scene

### HomePage.tsx
| Element | Actual | Remotion | Gap |
|---------|--------|----------|-----|
| Hero entrance | None (server component) | `fadeIn(15)` + `slideUp` (30px) | **Different paradigm** - acceptable for video |
| Scroll simulation | CSS scroll | Frame interpolation `[60, 180] → [0, -600]` | **Fake scroll** for video |
| Feature section entrance | None | Frame-based opacity | **Different paradigm** |

### Dashboard.tsx
| Element | Actual | Remotion | Gap |
|---------|--------|----------|-----|
| Skeleton loading | `animate-pulse` on 6 cards | CSS `opacity` animation | **Wrong animation type** |
| Modal open | `animate-slide-up` (0.25s ease-out) | `fadeIn(15)` + `slideUp` (spring) | **Wrong curve/duration** |
| Project card hover | `transition-colors` (Tailwind) | None | **Missing** |

### UploadPptx.tsx
| Element | Actual | Remotion | Gap |
|---------|--------|----------|-----|
| Upload progress | Real XHR progress + conversion polling | Frame-based `progressFill(30, 60, 100)` | **Fake progress** |
| Conversion status | Polling 2s × 150 max with elapsed time | Frame counter `Math.min(Math.floor((frame-90)/10)+1, 12)` | **Fake logic** |
| Spinner | CSS `@keyframes spin 1s linear infinite` | Same (CSS in JSX) | **OK** |

### AudioGeneration.tsx
| Element | Actual (`RegenerateModal.tsx`) | Remotion (`AudioGeneration.tsx` modal) | Gap |
|---------|-------------------------------|----------------------------------------|-----|
| Step transition | 3 distinct steps (Review→Generating→Complete) | Single generating modal | **Missing 2 steps** |
| Slide progress | "Slide X of Y: Title" with progress bar | "Slide X of 12" calculated from progress | **Missing slide title** |
| Cancel button | Yes (hard cancel reloads page) | None | **Missing** |
| Retry failed | "Retry Failed" button on partial failure | None | **Missing** |

### ViewerPlayer.tsx
| Element | Actual (`ViewAudioBar.tsx` + Howler.js) | Remotion | Gap |
|---------|-----------------------------------------|----------|-----|
| Audio progress | RAF polling (smooth) | Frame-based `progressFill` | **Choppy in video** |
| Time toggle | Click elapsed ↔ remaining | Static elapsed | **Missing interaction** |
| Speed selector | 5 speeds cycling | Static "1x" | **Missing** |
| Volume hover | Slider reveals on hover | Static icon | **Missing** |
| Version badge | Dynamic (green/yellow) | Static green | **Missing state** |
| Keyboard shortcuts | Space, ←/→ | None | **Missing** |

---

## SVG Logo Missing

| Actual | Remotion |
|--------|----------|
| `<img src="/logo-wordmark.svg" alt="Moduvox" className="h-7" />` in Navbar (28px) | Text "Moduvox" in Navbar and Footer |
| **File:** `frontend/public/logo-wordmark.svg` | **No SVG import or rendering** |

---

## Layout Issues Causing Visual Artifacts

### 1. Conflicting Padding in Hero
```tsx
// HomePage.tsx:21-35 - CONFLICT
paddingTop: theme.spacing.navbarHeight + 144,  // 208px
padding: '180px 32px 80px',  // Overrides to 180px
```
Result: Unpredictable spacing

### 2. Fixed Grid vs Responsive
| Actual | Remotion |
|--------|----------|
| `lg:grid-cols-[50%_50%]`, `md:grid-cols-4` | Always `1fr 1fr` or `repeat(4, 1fr)` |

### 3. Missing Touch Targets
| Actual | Remotion |
|--------|----------|
| `touch-target` (48px), `touch-target-sm` (44px) utilities | No minimum touch targets |

### 4. Missing Focus/Accessibility
| Actual | Remotion |
|--------|----------|
| `focus-visible:ring-1`, semantic HTML, ARIA | Generic divs, no ARIA, no focus styles |

---

## Fix Priority for Remotion Demo

| Priority | Issue | Fix |
|----------|-------|-----|
| 🔴 **P0** | Replace all placeholder mockups with actual component structures | Create `EditorMockup`, `UploadMockup`, `CompareMockup`, `AnalyticsMockup` |
| 🔴 **P0** | Add `/logo-wordmark.svg` to Remotion public assets, import in Navbar | Copy SVG from actual project |
| 🔴 **P0** | Fix animation curves to match actual (ease-out 0.25s for slide-up) | Update `animations.ts` spring config |
| 🔴 **P0** | Fix hero padding conflict | Single padding declaration |
| 🟠 **P1** | Add skeleton loading with `animate-pulse` (simulated via frame) | Simulate pulse in Remotion |
| 🟠 **P1** | Add 3 missing feature sections (Compare, Analytics) | Create components |
| 🟠 **P1** | Fix Dashboard modal animation to use ease-out 0.25s | Match `animate-slide-up` |
| 🟡 **P2** | Add touch target minimums (48px) to all interactive elements | Layout fix |
| 🟡 **P2** | Add focus-visible styles | CSS fix |
| 🟢 **P3** | Simulate keyboard shortcuts in viewer (visual indicators) | Visual only |

---

## Animations.ts Corrections Needed

```typescript
// CURRENT (wrong spring for slide-up)
export const slideUp = (frame: number, fps: number, delay: number = 0) => {
  return spring({ frame: frame - delay, fps, config: { damping: 15, mass: 0.8 } });
};

// SHOULD BE (matching animate-slide-up: 0.25s ease-out)
export const slideUp = (frame: number, fps: number, delay: number = 0) => {
  const startFrame = delay * fps;
  const durationFrames = 0.25 * fps; // 0.25 seconds
  const progress = Math.min(Math.max((frame - startFrame) / durationFrames, 0), 1);
  // ease-out: 1 - (1 - x)^2
  return 1 - Math.pow(1 - progress, 2);
};

// SPRING CURVE - Only for "Start free" button per actual
export const springCurve = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
```

---

## Verification Checklist

After fixes, verify:
- [ ] Hero shows `EditorMockup` (not grey grid)
- [ ] Feature section 1 shows `UploadMockup` (not dashed box)
- [ ] Feature section 2 shows `CompareMockup` (not missing)
- [ ] Feature section 3 shows `AnalyticsMockup` (not missing)
- [ ] Logo renders as SVG (28px) in Navbar and Footer
- [ ] Hero padding: single declaration, matches `pt-36 lg:pt-44 pb-20`
- [ ] Dashboard skeleton: 6 pulse cards (simulated)
- [ ] Dashboard modal: ease-out 0.25s slide-up
- [ ] Upload progress: realistic frame-based simulation
- [ ] Audio generation: 3-step modal (Review→Generating→Complete)
- [ ] Viewer audio bar: visual indicators for speed/volume/version
- [ ] All interactive elements: 48px minimum touch target
- [ ] Focus-visible styles present
- [ ] Animation curves: ease-out for slide-up, spring only for "Start free" button