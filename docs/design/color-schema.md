# Moduvox — Exact Color Schema

## Tailwind Config (copy-paste into `tailwind.config.ts`)

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Surfaces ──
        canvas: "#F9FAFB",        // Page background
        surface: "#FFFFFF",       // Card backgrounds
        "section-alt": "#F3F4F6", // Alternating section backgrounds

        // ── Text ──
        charcoal: "#18181B",      // Headings, primary text
        "muted-steel": "#71717A", // Secondary text, nav links, metadata

        // ── Accent (Black — use sparingly, CTAs only) ──
        black: "#000000",
        "black-hover": "#333333",

        // ── Dashboard Sidebar ──
        sidebar: {
          bg: "#18181B",
          text: "#A1A1AA",
          active: "#FFFFFF",
          "active-indicator": "#FFFFFF",
        },

        // ── Borders ──
        border: {
          faint: "rgba(226, 232, 240, 0.6)",
          DEFAULT: "#D4D4D8",     // Zinc-300
        },

        // ── Status ──
        success: "#16A34A",
        warning: "#D97706",
        error: {
          DEFAULT: "#DC2626",
          bg: "#FEF2F2",
          border: "#FECACA",
        },
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",     // buttons, cards
        xl: "0.75rem",    // cards
      },
      maxWidth: {
        content: "65ch",  // readable body text
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "monospace"],
      },
      fontSize: {
        // Landing page scale
        display: ["clamp(2.5rem, 5vw, 4rem)", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "600" }],
        "h2-landing": ["clamp(1.75rem, 3.5vw, 2.5rem)", { lineHeight: "1.15", letterSpacing: "-0.01em", fontWeight: "600" }],

        // Dashboard scale
        "page-title": ["1.5rem", { lineHeight: "1.2", fontWeight: "600" }],
        "section-heading": ["1.125rem", { lineHeight: "1.3", fontWeight: "600" }],
      },
    },
  },
  plugins: [],
};

export default config;
```

## CSS Custom Properties (alternative: add to `globals.css`)

```css
@layer base {
  :root {
    --color-canvas: #F9FAFB;
    --color-surface: #FFFFFF;
    --color-charcoal: #18181B;
    --color-muted-steel: #71717A;
    --color-black: #000000;
    --color-black-hover: #333333;
    --color-section-alt: #F3F4F6;
    --color-border-faint: rgba(226, 232, 240, 0.6);
    --color-border: #D4D4D8;
    --color-success: #16A34A;
    --color-warning: #D97706;
    --color-error: #DC2626;
  }
}
```

## Usage in Components

```tsx
// Button component example
<button className="px-6 py-2.5 bg-black text-white font-medium text-sm rounded-lg hover:bg-black-hover active:scale-95 transition-all duration-200">
  Start free
</button>

// Text example
<h1 className="text-charcoal font-sans text-display">
  Your slides. Your voice. No recording.
</h1>

<p className="text-muted-steel max-w-content">
  Upload a PPTX, clone your voice in 30 seconds...
</p>

// Card example
<div className="bg-surface border border-faint rounded-xl p-6">
  ...
</div>
```
