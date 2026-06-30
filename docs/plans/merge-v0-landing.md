# Merge v0 Landing Page Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge the v0-generated landing page components (hero, feature sections, CTA band, footer) into the existing `frontend/` project, fix color inconsistencies (blue sidebar, remaining amber), remove hallucinated images, and fix the footer.

**Architecture:** The v0 export (`moduvox-design/`) is a standalone Next.js project. We extract its landing components and images into `frontend/components/landing/` and `frontend/public/landing/`, then wire them into `frontend/app/page.tsx`. We keep the existing `frontend/` globals.css (hex-based) and throw away the v0 globals.css (oklch-based).

**Tech Stack:** Next.js App Router, Tailwind CSS v4, Geist font, lucide-react icons

---

## File Structure

### Files to CREATE
| File | Responsibility |
|------|---------------|
| `frontend/components/landing/hero.tsx` | Hero section with headline, inline thumbnail, CTA, product screenshot |
| `frontend/components/landing/feature-section.tsx` | Reusable zig-zag feature block (accepts heading, body, image, direction) |
| `frontend/components/landing/cta-band.tsx` | Bottom CTA band with heading + "Start free" button |
| `frontend/components/landing/footer.tsx` | 4-column dark footer with logo, link groups, copyright bar |
| `frontend/lib/utils.ts` | `cn()` utility for conditional class merging (used by feature-section) |

### Files to MODIFY
| File | What changes |
|------|-------------|
| `frontend/app/page.tsx` | Import and compose all landing components |
| `frontend/app/layout.tsx` | Update metadata title to "Moduvox" |

### Files to COPY (from moduvox-design/public/ → frontend/public/landing/)
| Source | Destination | Purpose |
|--------|-------------|---------|
| `moduvox-design/public/moduvox-editor.png` | `frontend/public/landing/moduvox-editor.png` | Hero product visual |
| `moduvox-design/public/moduvox-upload.png` | `frontend/public/landing/moduvox-upload.png` | Feature 1 visual |
| `moduvox-design/public/moduvox-compare.png` | `frontend/public/landing/moduvox-compare.png` | Feature 2 visual |
| `moduvox-design/public/moduvox-analytics.png` | `frontend/public/landing/moduvox-analytics.png` | Feature 3 visual |
| `moduvox-design/public/moduvox-slide-thumb.png` | `frontend/public/landing/moduvox-slide-thumb.png` | Hero inline thumbnail |

### Files to DELETE
| File | Why |
|------|-----|
| `frontend/components/ui/Navbar.tsx` | Replaced by v0's version (nearly identical, keep v0's code style) |
| `moduvox-design/` (entire directory) | Was a v0 export — content extracted |

### Files to KEEP (NOT modified)
| File | Why |
|------|-----|
| `frontend/app/globals.css` | Our hex-based design system — correct and working |
| `frontend/package.json` | Already has all deps we need (react, next, lucide-react) |
| `frontend/tsconfig.json` | Already correct |

---

## Task 1: Create `lib/utils.ts` (cn utility)

**Files:**
- Create: `frontend/lib/utils.ts`

- [ ] **Step 1: Write the cn utility**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Verify file exists and compiles**

Run: `cd frontend && npx tsc --noEmit lib/utils.ts`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/utils.ts
git commit -m "feat: add cn utility for landing components"
```

---

## Task 2: Create Hero component

**Files:**
- Create: `frontend/components/landing/hero.tsx`

- [ ] **Step 1: Create the hero component file**

```tsx
const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

export function Hero() {
  return (
    <section className="mx-auto max-w-[1400px] px-4 pb-20 pt-36 sm:px-6 lg:px-8 lg:pt-44">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[60%_40%]">
        {/* Text block */}
        <div>
          <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-balance font-semibold leading-[1.05] tracking-[-0.03em] text-[#18181B] [font-size:clamp(2.5rem,5vw,4rem)]">
            <span>Your slides.</span>
            <img
              src="/landing/moduvox-slide-thumb.png"
              alt="Presentation slide thumbnail"
              className="inline-block h-[0.85em] w-[1.4em] rounded-md object-cover align-middle shadow-sm ring-1 ring-black/5"
            />
            <span>Your voice. No recording.</span>
          </h1>
          <p className="mt-6 max-w-[58ch] text-pretty text-lg leading-relaxed text-[#71717A]">
            Upload a PPTX, clone your voice in 30 seconds, and get a complete narrated
            presentation with proof of who watched it.
          </p>
          <div className="mt-8">
            <a
              href="#start"
              style={{ transitionTimingFunction: SPRING }}
              className="inline-block rounded-lg bg-[#18181B] px-6 py-3 text-base font-medium text-white transition-transform duration-200 hover:scale-[1.02] hover:bg-[#27272A] active:scale-[0.98]"
            >
              Start free
            </a>
          </div>
        </div>

        {/* Product visual */}
        <div className="lg:justify-self-end">
          <img
            src="/landing/moduvox-editor.png"
            alt="Moduvox slide narration editor showing a slide preview and narration text"
            className="w-full rounded-xl border border-black/5 shadow-xl"
          />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/landing/hero.tsx
git commit -m "feat: add hero landing component"
```

---

## Task 3: Create FeatureSection component

**Files:**
- Create: `frontend/components/landing/feature-section.tsx`

- [ ] **Step 1: Create the feature section component**

```tsx
import { cn } from "@/lib/utils";

type FeatureSectionProps = {
  heading: string;
  body: string;
  imageSrc: string;
  imageAlt: string;
  visualRight?: boolean;
  darker?: boolean;
};

export function FeatureSection({
  heading,
  body,
  imageSrc,
  imageAlt,
  visualRight = false,
  darker = false,
}: FeatureSectionProps) {
  return (
    <section className={cn(darker ? "bg-[#F3F4F6]" : "bg-[#F9FAFB]")}>
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Visual */}
          <div className={cn("lg:order-1", visualRight && "lg:order-2")}>
            <img
              src={imageSrc}
              alt={imageAlt}
              className="w-full rounded-xl border border-black/5 shadow-lg"
            />
          </div>

          {/* Text */}
          <div className={cn("lg:order-2", visualRight && "lg:order-1")}>
            <h2 className="text-balance font-semibold leading-[1.1] tracking-[-0.02em] text-[#18181B] [font-size:clamp(1.75rem,3vw,2.5rem)]">
              {heading}
            </h2>
            <p className="mt-5 max-w-[52ch] text-pretty text-lg leading-relaxed text-[#71717A]">
              {body}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/landing/feature-section.tsx
git commit -m "feat: add feature-section landing component"
```

---

## Task 4: Create CTA Band component

**Files:**
- Create: `frontend/components/landing/cta-band.tsx`

- [ ] **Step 1: Create the CTA band component**

```tsx
const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

export function CtaBand() {
  return (
    <section className="bg-[#F9FAFB]">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center px-4 py-28 text-center sm:px-6 lg:px-8 lg:py-36">
        <h2 className="max-w-[20ch] text-balance font-semibold leading-[1.1] tracking-[-0.02em] text-[#18181B] [font-size:clamp(2rem,4vw,3rem)]">
          Turn your next deck into a narrated training video.
        </h2>
        <div className="mt-8">
          <a
            href="#start"
            style={{ transitionTimingFunction: SPRING }}
            className="inline-block rounded-lg bg-[#18181B] px-6 py-3 text-base font-medium text-white transition-transform duration-200 hover:scale-[1.02] hover:bg-[#27272A] active:scale-[0.98]"
          >
            Start free
          </a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/landing/cta-band.tsx
git commit -m "feat: add cta-band landing component"
```

---

## Task 5: Create Footer component

**Files:**
- Create: `frontend/components/landing/footer.tsx`

- [ ] **Step 1: Create the footer component**

```tsx
const linkGroups = [
  {
    heading: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Features", href: "#features" },
      { label: "Smart Update", href: "#smart-update" },
      { label: "Viewer Tracking", href: "#viewer-tracking" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "#about" },
      { label: "Privacy", href: "#privacy" },
      { label: "Terms", href: "#terms" },
    ],
  },
  {
    heading: "Connect",
    links: [
      { label: "Email", href: "mailto:hello@moduvox.com" },
      { label: "Twitter / X", href: "https://x.com" },
      { label: "LinkedIn", href: "https://linkedin.com" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-[#18181B] text-white">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4 md:gap-8">
          <div className="md:pr-8">
            <span className="text-lg font-semibold tracking-tight text-white">Moduvox</span>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#71717A]">
              Turn slides into narrated training, in your voice.
            </p>
          </div>

          {linkGroups.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <h2 className="text-sm font-semibold text-white">{group.heading}</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-[#71717A] transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-[#71717A]">
            2026 Moduvox. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
```

Changes from v0's version:
- Removed "Blog" from Company links (no blog exists in MVP)
- Uses `/landing/` prefix for image paths (consistent with where we'll store them)

- [ ] **Step 2: Commit**

```bash
git add frontend/components/landing/footer.tsx
git commit -m "feat: add footer landing component"
```

---

## Task 6: Copy images from moduvox-design/public to frontend/public/landing

**Files:**
- Copy: `moduvox-design/public/moduvox-*.png` → `frontend/public/landing/`

- [ ] **Step 1: Create landing images directory**

```bash
New-Item -ItemType Directory -Path "C:\Anubhav\Web Dev Projects\Moduvox\frontend\public\landing" -Force
```

- [ ] **Step 2: Copy all 5 moduvox PNGs**

```bash
Copy-Item "C:\Anubhav\Web Dev Projects\Moduvox\moduvox-design\public\moduvox-*.png" -Destination "C:\Anubhav\Web Dev Projects\Moduvox\frontend\public\landing\"
```

- [ ] **Step 3: Verify files copied**

Run: `Get-ChildItem "C:\Anubhav\Web Dev Projects\Moduvox\frontend\public\landing\"`
Expected: 5 files (editor, upload, compare, analytics, slide-thumb)

> **Note:** These images are AI-generated placeholders. They show the intended UI but are not real product screenshots. Replace with real screenshots before launch.

- [ ] **Step 4: Commit**

```bash
git add frontend/public/landing/
git commit -m "feat: add landing page placeholder images from v0"
```

---

## Task 7: Wire all components into page.tsx

**Files:**
- Modify: `frontend/app/page.tsx`

- [ ] **Step 1: Replace page.tsx content**

```tsx
import { Navbar } from "@/components/ui/Navbar"
import { Hero } from "@/components/landing/hero"
import { FeatureSection } from "@/components/landing/feature-section"
import { CtaBand } from "@/components/landing/cta-band"
import { Footer } from "@/components/landing/footer"

export default function Home() {
  return (
    <main className="bg-[#F9FAFB] text-[#18181B]">
      <Navbar />
      <Hero />

      <FeatureSection
        heading="Upload, generate, share."
        body="Drop in your PowerPoint file and a 30-second voice sample. Our AI extracts speaker notes, writes natural narration, and clones your voice. Edit anything before it's final."
        imageSrc="/landing/moduvox-upload.png"
        imageAlt="Moduvox upload screen with a drop zone for a PPTX file and a voice sample recorder"
      />

      <FeatureSection
        heading="Change one slide. Update one slide."
        body="Updated a policy? Upload the revised deck. Only the changed slides get re-narrated. Your share link updates automatically. No re-recording the whole thing."
        imageSrc="/landing/moduvox-compare.png"
        imageAlt="Before and after comparison of presentation slides with the changed slide highlighted"
        visualRight
        darker
      />

      <FeatureSection
        heading="Know who actually watched."
        body="Require viewers to enter their email before watching. See completion rates, time spent, and who skipped. Export CSV reports for compliance audits."
        imageSrc="/landing/moduvox-analytics.png"
        imageAlt="Moduvox analytics dashboard showing a viewer report table with completion rates"
      />

      <CtaBand />
      <Footer />
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/page.tsx
git commit -m "feat: wire landing components into page"
```

---

## Task 8: Update layout metadata

**Files:**
- Modify: `frontend/app/layout.tsx`

- [ ] **Step 1: Change the title and description**

Replace lines 12-14:
```tsx
export const metadata: Metadata = {
  title: "Moduvox — Your slides. Your voice. No recording.",
  description:
    "Upload a PPTX and a voice sample. Moduvox generates a complete narrated presentation in your voice, with viewer tracking.",
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/layout.tsx
git commit -m "fix: update layout metadata to Moduvox branding"
```

---

## Task 9: Replace old Navbar with v0's version

**Files:**
- Modify: `frontend/components/ui/Navbar.tsx`

- [ ] **Step 1: Check if existing Navbar differs from v0's version**

Run: `diff --brief frontend/components/ui/Navbar.tsx moduvox-design/components/navbar.tsx`
If they differ significantly, replace with v0's version (which is cleaner).
If identical, skip this task.

- [ ] **Step 2 (if needed): Replace with v0's navbar**

Copy v0's navbar.tsx content into `frontend/components/ui/Navbar.tsx`.
v0's version uses cleaner import style (quotes, no semicolons) and matches the rest of the landing components.

- [ ] **Step 3 (if changed): Commit**

```bash
git add frontend/components/ui/Navbar.tsx
git commit -m "fix: align navbar with v0 landing component style"
```

---

## Task 10: Add Navbar re-export for cleaner imports

**Files:**
- Create: `frontend/components/landing/index.ts` (optional barrel export)

For cleaner imports, create a barrel file:

```ts
export { Hero } from "./hero";
export { FeatureSection } from "./feature-section";
export { CtaBand } from "./cta-band";
export { Footer } from "./footer";
```

Then page.tsx can import from one path:
```ts
import { Hero, FeatureSection, CtaBand, Footer } from "@/components/landing";
```

- [ ] **Step 1: Write or skip — barrel export is optional for 4 components**
- [ ] **Step 2: Commit**

---

## Task 11: Clean up moduvox-design directory

**Files:**
- Delete: `moduvox-design/` (entire directory)

- [ ] **Step 1: Remove the v0 export directory**

```bash
Remove-Item -LiteralPath "C:\Anubhav\Web Dev Projects\Moduvox\moduvox-design" -Recurse -Force
```

- [ ] **Step 2: Verify removal**

Run: `Test-Path "C:\Anubhav\Web Dev Projects\Moduvox\moduvox-design"`
Expected: False

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove v0 export directory after extracting components"
```

---

## Task 12: Final review and push

- [ ] **Step 1: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No TypeScript errors.

- [ ] **Step 2: Push all commits**

```bash
git push origin main
```
