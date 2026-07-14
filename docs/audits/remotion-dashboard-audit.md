# Audit Report: Remotion Dashboard Scene vs Actual Moduvox Dashboard

**Date:** 2026-07-14  
**Auditor:** Parallel Agent (Explore)  
**Files Compared:**  
- Actual: `frontend/app/dashboard/page.tsx`, `frontend/app/dashboard/layout.tsx`, `frontend/components/dashboard/ProjectCard.tsx`, `frontend/components/dashboard/CreateProjectModal.tsx`, `frontend/components/ui/Navbar.tsx`, `frontend/components/ui/ErrorBoundary.tsx`  
- Remotion: `remotion-demo/src/scenes/Dashboard.tsx`, `remotion-demo/src/components/Sidebar.tsx`, `remotion-demo/src/components/Navbar.tsx`, `remotion-demo/src/styles/theme.ts`

---

## Executive Summary

**Overall Match: ~15%** - The Remotion Dashboard scene is a visual mockup only. It lacks all real components, interactions, data fetching, and uses emojis instead of proper icons.

---

## Critical Gaps (Priority: 🔴 FIX IMMEDIATELY)

### 1. Sidebar - Emojis Instead of Lucide Icons, No Mobile Support

| Actual (`Sidebar` in `layout.tsx:34-74`) | Remotion (`Sidebar.tsx`) |
|------------------------------------------|--------------------------|
| `LayoutGrid`, `Mic`, `Archive`, `Settings` from `lucide-react` | `⊞`, `🎤`, `📦`, `⚙` (emojis) |
| Active state: `bg-zinc-100 text-[#18181B]` | Same visual but hardcoded |
| Touch target: `touch-target` (48px min) | No touch target utility |
| Fixed positioning: `fixed inset-y-0 left-0 z-40` with slide animation | Flex child, no fixed positioning |
| Mobile: hamburger button → slide-in drawer with overlay | **MISSING** |
| Icons: 16px (`h-4 w-4`) | Emoji sizing inconsistent |

### 2. ProjectCard - Hardcoded Mock Data, No Interactions

| Actual (`ProjectCard.tsx`) | Remotion (`Dashboard.tsx` inline) |
|----------------------------|-----------------------------------|
| Dynamic color bar: `bg-[${project.color}]` (4px top) | Hardcoded `background: project.color` |
| Icon: `project.icon` from 8-icon palette (FolderKanban, FileText, Presentation, Users, BookOpen, Briefcase, Megaphone, Globe) | Hardcoded `📊` emoji |
| Presentation count: **Lazy-fetched** from Supabase `presentations` table | Hardcoded numbers |
| Hover menu: `MoreVertical` → Dropdown (Rename, Delete) | **MISSING** |
| Rename/Delete modals: Separate components with "Type DELETE to confirm" | **MISSING** |
| Card structure: Color bar → Icon → Name + count + description + date | Simplified: Color bar → Icon → Name + count |

### 3. CreateProjectModal - Static Display, Not Functional Form

| Actual (`CreateProjectModal.tsx:1-180`) | Remotion (`Dashboard.tsx:191-239`) |
|----------------------------------------|-------------------------------------|
| **Form fields**: name, description, color picker (6 colors), icon picker (8 icons in 4×2 grid) | **Static display**: name + 5 colors only |
| Color palette: `#3B82F6`, `#22C55E`, `#F59E0B`, `#EF4444`, `#8B5CF6`, `#EC4899` (6 colors) | 5 colors, missing `#EC4899` |
| Icon picker: 8 icons in 4×2 grid with `touch-target-sm` | **MISSING** |
| Description field: textarea | **MISSING** |
| POST to `/api/projects` with loading state | **MISSING** |
| Handles 429 quota limits with `WaitlistDialog` | **MISSING** |

### 4. Empty State - Wrong Icon, Wrong CTA Type

| Actual (`Dashboard.tsx:77-95`) | Remotion (`Dashboard.tsx:130-155`) |
|-------------------------------|-------------------------------------|
| Icon: `FolderKanban` in `rounded-xl bg-zinc-100` | Emoji `📁` in `rounded-full bg-zinc-100` |
| Title: "No projects yet" | Same |
| Description: "Create your first project to get started." | "Create your first project to get started." |
| CTA: **Link** `<Link href="/dashboard/projects/new">Create your first project</Link>` | **Button** styled div |

### 5. Navbar - Same as Homepage Audit (No Mobile Drawer, No Scroll Backdrop)

| Actual | Remotion |
|--------|----------|
| Scroll-triggered backdrop blur at scrollY > 8 | Static |
| Mobile drawer with hamburger | **MISSING** |
| Auth-aware CTAs | Static prop |
| Logo: SVG wordmark | Text "Moduvox" |

### 6. Loading State - No Skeletons, Uses Opacity Animation

| Actual (`Dashboard.tsx:53-69`) | Remotion (`Dashboard.tsx:118-126`) |
|-------------------------------|-------------------------------------|
| 6 skeleton cards with `animate-pulse bg-zinc-100` | CSS `opacity` animation on content |
| Skeletons match card structure exactly | Generic opacity fade |

### 7. Color System - Custom Theme vs Tailwind Zinc Scale

| Actual | Remotion |
|--------|----------|
| Uses Tailwind `zinc-50` through `zinc-900` throughout | Custom `theme.colors` object with limited palette |
| `bg-zinc-100`, `text-zinc-600`, `border-zinc-200`, `hover:bg-zinc-50` | Hardcoded hex values from `theme.colors` |

---

## High Priority Gaps (Priority: 🟠 FIX SOON)

### 8. Dashboard Layout - No Error Boundaries

| Actual (`layout.tsx:97-112`) | Remotion |
|------------------------------|----------|
| Sidebar wrapped in `<ErrorBoundary fallback={<ErrorFallback />}`> | **MISSING** |
| Main content wrapped in `<ErrorBoundary>` | **MISSING** |
| `SidebarContext` with `open/close` for mobile | **MISSING** |

### 9. Project Count Fetching - Actual Uses Supabase, Remotion Hardcoded

```tsx
// Actual (ProjectCard.tsx:35-45)
useEffect(() => {
  supabase.from('presentations').select('id', { count: 'exact' })
    .eq('project_id', project.id)
    .then(({ count }) => setPresentationCount(count ?? 0));
}, [project.id]);
```

Remotion: Hardcoded `{ presentations: 3 }`, `{ presentations: 1 }`, `{ presentations: 2 }`

---

## Medium Priority Gaps (Priority: 🟡 FIX FOR POLISH)

### 10. Touch Targets - Actual Enforces 48px Minimum

| Actual | Remotion |
|--------|----------|
| `touch-target` utility (48×48) on all interactive elements | No minimum touch targets |
| `touch-target-sm` (44×44) for compact elements | Standard button padding only |

### 11. Icon System - Lucide vs Emojis

| Actual | Remotion |
|--------|----------|
| 4 sidebar icons + 8 project icons + numerous UI icons from `lucide-react` | 0 lucide icons, all emojis or text |

### 12. Responsive Breakpoints

| Actual | Remotion |
|--------|----------|
| `md:` sidebar static, mobile drawer | Fixed desktop layout |
| `lg:grid-cols-3` for project grid | Always 3-col grid |

---

## Files to Create/Modify in Remotion Demo

### New Components Needed
1. `remotion-demo/src/components/ProjectCard.tsx` - Full card with color bar, dynamic icon, presentation count, hover menu
2. `remotion-demo/src/components/CreateProjectModal.tsx` - Full form with 6 colors, 8 icons, description
3. `remotion-demo/src/components/SkeletonLoader.tsx` - Pulse skeletons matching card structure
4. `remotion-demo/src/components/ErrorBoundary.tsx` - React error boundary wrapper
5. `remotion-demo/src/components/icons.ts` - Lucide icon imports (or SVG equivalents)

### Components to Rewrite
1. `remotion-demo/src/components/Sidebar.tsx` - Complete rewrite with lucide icons, fixed positioning, mobile drawer
2. `remotion-demo/src/scenes/Dashboard.tsx` - Extract ProjectCard, CreateProjectModal, add skeletons, mock data fetching
3. `remotion-demo/src/components/Navbar.tsx` - Add mobile drawer, scroll backdrop, SVG logo
4. `remotion-demo/src/styles/theme.ts` - Replace custom colors with Tailwind zinc scale tokens

---

## Verification Checklist

After fixes, verify:
- [ ] Sidebar uses 4 lucide icons (LayoutGrid, Mic, Archive, Settings)
- [ ] Sidebar fixed positioning with slide-in mobile drawer
- [ ] ProjectCard shows dynamic color bar from project.color
- [ ] ProjectCard uses one of 8 actual icons (not emoji)
- [ ] ProjectCard displays fetched presentation count
- [ ] ProjectCard hover reveals MoreVertical dropdown
- [ ] CreateProjectModal has name, description, 6 colors, 8 icons
- [ ] Empty state uses FolderKanban icon in rounded-xl
- [ ] Empty state CTA is a link (not button)
- [ ] Loading shows 6 pulse skeletons matching card structure
- [ ] Navbar has scroll backdrop blur + mobile drawer
- [ ] ErrorBoundary wraps sidebar and main content
- [ ] All interactive elements meet 48px touch target minimum
- [ ] Color system uses zinc scale throughout