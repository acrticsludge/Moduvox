# Pricing Page Implementation Plan

> **For agentic workers:** Use subagent-driven-development to implement this plan task-by-task.

**Goal:** Create a `/pricing` route with 3 pricing cards — one active Free tier, two "Coming Soon" cards with a skeleton/ghosted design for Pro and Team.

**Architecture:** New route `app/pricing/page.tsx` renders a `PricingSection` component containing 3 card components. The navbar link is updated from `#pricing` (anchor) to `/pricing` (route). The pricing page uses the same layout as the landing page (navbar + footer) for visual consistency.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, Geist font

---

## File Structure

### Files to CREATE
| File | Responsibility |
|------|---------------|
| `frontend/app/pricing/page.tsx` | Pricing route — renders Navbar + PricingSection + Footer |
| `frontend/components/landing/pricing-section.tsx` | The 3-card pricing grid with Free (active) + Pro/Team (coming soon) |

### Files to MODIFY
| File | What changes |
|------|-------------|
| `frontend/components/ui/Navbar.tsx` | Change `<a>` href from `#pricing` to `/pricing` |

---

## Task 1: Create PricingSection component

**Files:**
- Create: `frontend/components/landing/pricing-section.tsx`

- [ ] **Step 1: Create the pricing section component**

```tsx
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started with narrated presentations.",
    features: [
      "15 presentations lifetime",
      "Up to 3 presentations per day",
      "1 voice clone",
      "12 emotion presets",
      "Email-gated viewer tracking",
      "CSV export reports",
      "Preset AI voices",
    ],
    cta: "Get started",
    ctaHref: "#",
    active: true,
  },
  {
    name: "Pro",
    price: "$20",
    period: "per month",
    description: "For regular training content creators.",
    features: [
      "100 slides per month",
      "3 voice clones",
      "Smart Update (changed slides only)",
      "Password protection",
      "Priority generation",
      "Extended viewer history",
    ],
    cta: "Coming soon",
    ctaHref: null,
    active: false,
    comingSoon: true,
  },
  {
    name: "Team",
    price: "$50",
    period: "per month",
    description: "For teams creating training content together.",
    features: [
      "500 slides per month",
      "10 voice clones",
      "Team workspace (3 seats)",
      "Custom branding on player",
      "SCORM / xAPI export",
      "Everything in Pro",
    ],
    cta: "Coming soon",
    ctaHref: null,
    active: false,
    comingSoon: true,
  },
];

export function PricingSection() {
  return (
    <section className="bg-[#F9FAFB]">
      <div className="mx-auto max-w-[1400px] px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-semibold leading-[1.1] tracking-[-0.02em] text-[#18181B] [font-size:clamp(1.75rem,3.5vw,2.5rem)]">
            Simple pricing. Free to start.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[#71717A]">
            Start with the Free tier — no credit card. Upgrade when you outgrow it.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-xl border p-8 ${
                plan.active
                  ? "border-zinc-200 bg-white shadow-lg"
                  : "border-dashed border-zinc-300 bg-zinc-50/50"
              }`}
            >
              {/* Coming Soon badge */}
              {plan.comingSoon && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-zinc-200 bg-white px-3 py-0.5 text-[11px] font-medium text-zinc-400">
                  Coming soon
                </span>
              )}

              {/* Card header */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#18181B]">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className={`text-4xl font-bold tracking-tight ${plan.active ? "text-[#18181B]" : "text-zinc-300"}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ${plan.active ? "text-[#71717A]" : "text-zinc-300"}`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`mt-2 text-sm leading-relaxed ${plan.active ? "text-[#71717A]" : "text-zinc-300"}`}>
                  {plan.description}
                </p>
              </div>

              {/* Features */}
              <ul className="mb-8 flex flex-1 flex-col gap-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        plan.active ? "text-zinc-800" : "text-zinc-300"
                      }`}
                    />
                    <span
                      className={`text-sm leading-snug ${
                        plan.active ? "text-[#71717A]" : "text-zinc-300"
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {plan.active ? (
                <a
                  href="/"
                  className="block rounded-lg bg-[#18181B] px-4 py-2.5 text-center text-sm font-medium text-white transition-transform duration-200 hover:scale-[1.02] hover:bg-[#27272A] active:scale-[0.98]"
                >
                  {plan.cta}
                </a>
              ) : (
                <span className="block cursor-not-allowed rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-2.5 text-center text-sm font-medium text-zinc-300">
                  {plan.cta}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/landing/pricing-section.tsx
git commit -m "feat: add pricing section with free + coming-soon cards"
```

---

## Task 2: Create pricing route

**Files:**
- Create: `frontend/app/pricing/page.tsx`

- [ ] **Step 1: Create the pricing page**

The pricing page uses the same Navbar and Footer as the landing page for visual consistency.

```tsx
import { Navbar } from "@/components/ui/Navbar"
import { PricingSection } from "@/components/landing/pricing-section"
import { Footer } from "@/components/landing/footer"

export default function PricingPage() {
  return (
    <main className="bg-[#F9FAFB] text-[#18181B]">
      <Navbar />
      <div className="pt-16" /> {/* Offset for fixed navbar */}
      <PricingSection />
      <Footer />
    </main>
  )
}
```

The `pt-16` accounts for the fixed navbar height (64px) so the pricing section starts below the navbar.

- [ ] **Step 2: Commit**

```bash
git add app/pricing/page.tsx
git commit -m "feat: add /pricing route"
```

---

## Task 3: Update navbar link

**Files:**
- Modify: `frontend/components/ui/Navbar.tsx`

- [ ] **Step 1: Change the Pricing link href**

Find the `NAV_LINKS` array at the top of the file and change `#pricing` to `/pricing`.

```tsx
const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "/pricing" },
];
```

This ensures clicking "Pricing" navigates to the new route instead of jumping to an anchor on the same page.

- [ ] **Step 2: Commit**

```bash
git add frontend/components/ui/Navbar.tsx
git commit -m "fix: update pricing nav link from anchor to /pricing route"
```

---

## Task 4: Build and verify

- [ ] **Step 1: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 2: Run build**

```bash
cd frontend && npm run build
```
Expected: 
```
Route (app)
┌ ○ /pricing
┌ ○ /
```

- [ ] **Step 3: Push**

```bash
git push origin main
```
