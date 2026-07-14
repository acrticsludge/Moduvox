# Audit Report: Remotion Theme Tokens vs Actual Moduvox Design System

**Date:** 2026-07-14  
**Auditor:** Parallel Agent (Explore)  
**Files Compared:**  
- Actual: `frontend/app/globals.css` (Tailwind v4 `@theme inline` + `:root` semantic colors + utilities), `frontend/components.json` (shadcn/ui config)  
- Remotion: `remotion-demo/src/styles/theme.ts`

---

## Executive Summary

**Overall Match: ~24%** - The Remotion theme captures only the **6 custom brand colors** but **completely misses the shadcn/ui semantic color system** (19 tokens), **dark mode**, **custom utilities**, and **font CSS variables**. It also includes **23 extra color tokens** and **4 app-specific spacing tokens** not in the design system.

---

## Token Comparison Table

### ✅ Matching Tokens (6/6)

| Token | Actual (`globals.css`) | Remotion (`theme.ts`) | Match |
|-------|------------------------|----------------------|-------|
| `canvas` | `#f9fafb` | `#F9FAFB` | ✅ |
| `surface` | `#ffffff` | `#FFFFFF` | ✅ |
| `charcoal` | `#18181b` | `#18181B` | ✅ |
| `mutedSteel` | `#71717a` | `#71717A` | ✅ |
| `sectionAlt` | `#f3f4f6` | `#F3F4F6` | ✅ |
| `borderFaint` | `rgba(226, 232, 240, 0.6)` | `rgba(226, 232, 240, 0.6)` | ✅ |

---

### ❌ CRITICAL: Missing shadcn/ui Semantic Colors (19 tokens)

**Actual** (`globals.css:14-37` - `:root` block with oklch values):
```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.965 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.965 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.965 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.87 0 0);
  --radius: 0.625rem;
}
```

**Remotion theme.ts**: **ALL 19 MISSING** - Only has raw brand colors.

---

### ❌ CRITICAL: Missing Dark Mode Support

**Actual** (`globals.css:39`):
```css
@custom-variant dark (&:is(.dark *));
```
- Dark mode variant exists but no dark `:root` overrides defined yet

**Remotion theme.ts**: **NO DARK MODE STRUCTURE** at all

---

### ❌ CRITICAL: Missing Custom Utilities (4 utilities)

**Actual** (`globals.css:41-53`):
```css
@utility hide-scrollbar {
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; width: 0; height: 0; }
}

@utility touch-target {
  @apply flex min-h-[48px] min-w-[48px] items-center justify-center;
}

@utility touch-target-sm {
  @apply flex min-h-[44px] min-w-[44px] items-center justify-center;
}

@utility animate-slide-up {
  animation: slide-up 0.25s ease-out;
}

@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
```

**Remotion theme.ts**: **ALL 4 MISSING**

---

### ❌ CRITICAL: Missing Font CSS Variables

**Actual** (`globals.css:55-57`):
```css
--font-sans: var(--font-geist-sans);
--font-mono: var(--font-geist-mono);
```
- Set by `next/font/google` at runtime

**Remotion theme.ts**: Hardcoded font stacks
```ts
fonts: {
  sans: 'Geist, system-ui, -apple-system, sans-serif',
  mono: 'Geist Mono, monospace',
}
```

---

### ❌ MISMATCH: Radius Token

**Actual**: Single semantic token `--radius: 0.625rem` (10px) mapped via `@theme`

**Remotion**: Object with px values not matching semantic system
```ts
radius: {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  full: 9999,
}
```

---

### ⚠️ EXTRA: Tokens in Remotion NOT in Actual Design System

| Category | Remotion Tokens | Count |
|----------|-----------------|-------|
| **Zinc scale** | `zinc50` through `zinc900` | 10 |
| **Red scale** | `red50`, `red500`, `red600` | 3 |
| **Green scale** | `green50`, `green100`, `green500`, `green600`, `green700` | 5 |
| **Blue scale** | `blue50`, `blue500` | 2 |
| **Amber scale** | `amber50`, `amber100`, `amber700` | 3 |
| **App-specific spacing** | `navbarHeight`, `sidebarWidth`, `editorSidebarWidth`, `editorRightPanelWidth` | 4 |
| **Duplicates** | `charcoalHover` = `zinc800`, `zinc500` = `mutedSteel`, `zinc900` = `charcoal` | 3 |

**Total Extra: 27 tokens** not in the actual design system

---

## shadcn/ui Config Mismatch

**Actual** (`components.json`):
```json
{
  "style": "default",
  "baseColor": "neutral",
  "cssVariables": true,
  "rsc": true,
  "iconLibrary": "lucide"
}
```

**Remotion**: No config, no shadcn integration

---

## Required Theme.ts Rewrite

```typescript
// remotion-demo/src/styles/theme.ts - COMPLETE REWRITE NEEDED

export const theme = {
  // 1. shadcn/ui semantic colors (oklch) - MATCH globals.css :root exactly
  colors: {
    // Brand colors (keep these 6)
    canvas: '#F9FAFB',
    surface: '#FFFFFF',
    charcoal: '#18181B',
    mutedSteel: '#71717A',
    sectionAlt: '#F3F4F6',
    borderFaint: 'rgba(226, 232, 240, 0.6)',
    
    // ADD: shadcn semantic colors (oklch format)
    background: 'oklch(1 0 0)',
    foreground: 'oklch(0.145 0 0)',
    card: 'oklch(1 0 0)',
    cardForeground: 'oklch(0.145 0 0)',
    popover: 'oklch(1 0 0)',
    popoverForeground: 'oklch(0.145 0 0)',
    primary: 'oklch(0.205 0 0)',
    primaryForeground: 'oklch(0.985 0 0)',
    secondary: 'oklch(0.965 0 0)',
    secondaryForeground: 'oklch(0.205 0 0)',
    muted: 'oklch(0.965 0 0)',
    mutedForeground: 'oklch(0.556 0 0)',
    accent: 'oklch(0.965 0 0)',
    accentForeground: 'oklch(0.205 0 0)',
    destructive: 'oklch(0.577 0.245 27.325)',
    destructiveForeground: 'oklch(0.577 0.245 27.325)',
    border: 'oklch(0.922 0 0)',
    input: 'oklch(0.922 0 0)',
    ring: 'oklch(0.87 0 0)',
    
    // REMOVE: All zinc/red/green/blue/amber scales (not in design system)
  },
  
  // 2. Fonts - USE CSS VARIABLES to match next/font/google
  fonts: {
    sans: 'var(--font-geist-sans)',
    mono: 'var(--font-geist-mono)',
  },
  
  // 3. Radius - MATCH --radius: 0.625rem semantic token
  radius: {
    DEFAULT: '0.625rem',  // 10px - matches --radius
    sm: '0.25rem',   // 4px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    full: '9999px',
  },
  
  // 4. Custom utilities - MATCH globals.css @utility definitions
  utilities: {
    hideScrollbar: {
      msOverflowStyle: 'none',
      scrollbarWidth: 'none',
      '&::-webkit-scrollbar': { display: 'none', width: 0, height: 0 },
    },
    touchTarget: {
      display: 'flex',
      minHeight: '48px',
      minWidth: '48px',
      alignItems: 'center',
      justifyContent: 'center',
    },
    touchTargetSm: {
      display: 'flex',
      minHeight: '44px',
      minWidth: '44px',
      alignItems: 'center',
      justifyContent: 'center',
    },
    animateSlideUp: {
      animation: 'slide-up 0.25s ease-out',
    },
  },
  
  // 5. Keyframes for animations
  keyframes: {
    'slide-up': {
      from: { transform: 'translateY(100%)' },
      to: { transform: 'translateY(0)' },
    },
  },
  
  // 6. Dark mode structure
  darkMode: {
    // Define when globals.css adds dark :root overrides
    // Structure ready for: colors.dark = { background: 'oklch(...)', ... }
  },
  
  // 7. Animation curve - MATCH actual CSS
  animation: {
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',  // Used on "Start free" button
    easeOut: 'ease-out',  // Used for animate-slide-up (0.25s ease-out)
    duration200: '200ms',
    duration300: '300ms',
  },
  
  // REMOVE: App-specific spacing (navbarHeight, sidebarWidth, etc.)
  // These belong in component layout, not design tokens
};
```

---

## Priority Fix Order

| Priority | Fix | Impact |
|----------|-----|--------|
| 🔴 **P0** | Add 19 shadcn semantic colors (oklch) | Enables all shadcn components to render correctly |
| 🔴 **P0** | Add dark mode structure | Parity with CSS `@custom-variant dark` |
| 🔴 **P0** | Add 4 custom utilities (hide-scrollbar, touch-target, touch-target-sm, animate-slide-up) | Required for component parity |
| 🔴 **P0** | Fix fonts to use CSS variables | Matches `next/font/google` behavior |
| 🔴 **P0** | Fix radius to match `--radius: 0.625rem` | Consistent border radius |
| 🟠 **P1** | Remove 23 extra color tokens (zinc/red/green/blue/amber scales) | Clean design system, no drift |
| 🟠 **P1** | Remove 4 app-specific spacing tokens | Separation of concerns |
| 🟡 **P2** | Fix animation curve naming (ease-out vs cubic-bezier) | Consistency with CSS |
| 🟢 **P3** | Add keyframes for slide-up | Complete animation parity |

---

## Verification Checklist

After rewrite, verify:
- [ ] All 19 shadcn semantic colors present in oklch format matching globals.css exactly
- [ ] Dark mode structure exists (ready for dark overrides)
- [ ] 4 custom utilities: hide-scrollbar, touch-target, touch-target-sm, animate-slide-up
- [ ] Fonts reference `var(--font-geist-sans)` and `var(--font-geist-mono)`
- [ ] Radius uses rem values with DEFAULT = 0.625rem
- [ ] No zinc50-900, red/green/blue/amber scales
- [ ] No app-specific spacing tokens
- [ ] Animation curves match: spring = cubic-bezier(0.34,1.56,0.64,1), ease-out for slide-up
- [ ] Keyframes defined for slide-up animation