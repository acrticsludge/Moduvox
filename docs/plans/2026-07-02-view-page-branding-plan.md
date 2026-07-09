# View Page Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add lightweight brand-awareness navbar and footer to the view page's verified state.

**Architecture:** Two new leaf components (`ViewNavbar`, `ViewFooter`) rendered inside the existing `verified` switch case in `page.tsx`. No state, no hooks, no API calls — pure presentational components.

**Tech Stack:** Next.js App Router, Tailwind CSS, TypeScript

---

### Task 1: Create ViewNavbar component

**Files:**
- Create: `frontend/components/view/ViewNavbar.tsx`

- [ ] **Step 1: Create ViewNavbar.tsx**

```tsx
export function ViewNavbar() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center px-4 sm:px-6 lg:px-8">
        <span className="text-2xl font-semibold tracking-tight text-[#18181B]">
          Moduvox
        </span>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/view/ViewNavbar.tsx
git commit -m "feat: add ViewNavbar component"
```

---

### Task 2: Create ViewFooter component

**Files:**
- Create: `frontend/components/view/ViewFooter.tsx`

- [ ] **Step 1: Create ViewFooter.tsx**

```tsx
export function ViewFooter() {
  return (
    <footer className="bg-[#18181B]">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm text-white">
            2026 Moduvox. All rights reserved.
          </p>
          <p className="text-sm text-[#71717A]">
            Powered by Gemini AI and VoxCPM
          </p>
          <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
            MVP v1.0.0
          </span>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/view/ViewFooter.tsx
git commit -m "feat: add ViewFooter component"
```

---

### Task 3: Wire components into page.tsx verified state

**Files:**
- Modify: `frontend/app/view/[shareToken]/page.tsx`

- [ ] **Step 1: Add imports and update verified case**

Add imports at the top of the file:

```tsx
import { ViewNavbar } from "@/components/view/ViewNavbar"
import { ViewFooter } from "@/components/view/ViewFooter"
```

Replace the `case "verified": return null` block with:

```tsx
    case "verified":
      return (
        <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
          <ViewNavbar />
          <main className="flex-1" />
          <ViewFooter />
        </div>
      )
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exit code 0, no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/app/view/[shareToken]/page.tsx
git commit -m "feat: wire ViewNavbar and ViewFooter into verified state"
```

---

### Task 4: Final verification

- [ ] **Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit`
Expected: exit code 0

- [ ] **Step 2: Push**

```bash
git push origin feat/share-link-improvements
```
