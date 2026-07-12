# Google Stitch Prompt — Moduvox Email Mockups

## Brand Identity

```
Brand:       Moduvox
Tagline:     "Your slides. Your voice. No recording."
Tone:        Minimal, monochromatic, utilitarian, zero decorative elements
Logo:        Wordmark only — the name "Moduvox" in Geist Sans, semibold, no icon
Fonts:       Geist Sans (body/headings), mono fallback for code
Colors:
  Charcoal   #18181B (primary text, buttons, dark footer)
  Muted Steel #71717A (secondary text, labels)
  Canvas     #F9FAFB (background)
  Surface    #FFFFFF (card backgrounds)
  Border     #E4E4E7 (subtle dividers)
  Focus      #D4D4D8 (ring)
  Success    #16A34A (green-600, used sparingly)
```

## Global Email Layout (applies to all three)

**Structure:**
```
┌─────────────────────────────┐
│  Moduvox wordmark (centered)│  ← Header, subtle, #71717A, small
├─────────────────────────────┤
│                             │
│      EMAIL-SPECIFIC         │
│      CONTENT HERE           │
│                             │
├─────────────────────────────┤
│  Moduvox — Turn slides into │  ← Footer, #71717A, 11px
│  narrated videos            │
│                             │
│  Privacy · Terms            │
│  If you didn't request this,│
│  ignore this email.         │
└─────────────────────────────┘
```

**Width:** 480px max, centered. Mobile-first — looks good at 320px too.
**Background:** #F9FAFB (canvas color).
**Card:** White (#FFFFFF), rounded-xl (12px), subtle border (#E4E4E7), no shadow.
**Padding:** 40px horizontal, 32px vertical within card.

---

## Email 1: Magic Link (Viewer Verification)

**Subject:** "You're invited to view '[Presentation Title]'"

**Layout (top to bottom, all inside white card on canvas background):**

1. **Icon area** — A subtle play-button icon (charcoal rounded square with white play triangle, 48×48px, centered, similar to the favicon)

2. **Headline** — "You're invited" — Charcoal (#18181B), 24px, semibold

3. **Body text** — "Hi {viewerName}," + paragraph. Clean, 15px, #71717A (muted steel). Reads:
   "You've been invited to view '[Presentation Title]', a narrated presentation created with Moduvox. Click the button below to verify your email and start watching."

4. **CTA button** — "Verify Email →" — Solid charcoal background (#18181B), white text, 14px semibold, 12px horizontal padding, 14px vertical padding, rounded-lg (8px), centered. The button should look like a real clickable button.

5. **Footnote** — "This link expires in 15 minutes." — 13px, #71717A. Below it: "If you didn't request this, you can safely ignore this email."

6. **Divider** — 1px line in #E4E4E7, 40px margin top/bottom

7. **Footer** — "Moduvox — Turn slides into narrated videos" — 11px, #A1A1AA (zinc-400), centered

**Tone:** Inviting, professional, trustworthy. Warm but not casual.

---

## Email 2: Welcome (Post-Signup Onboarding)

**Subject:** "Welcome to Moduvox, {name}!"

**Layout (top to bottom, all inside white card on canvas background):**

1. **Icon area** — A subtle checkmark or sparkle icon in charcoal (#18181B), 48×48px, centered, in a rounded square

2. **Headline** — "Welcome to Moduvox, {name}!" — Charcoal (#18181B), 24px, semibold. The name should appear personalized.

3. **Intro paragraph** — "We're excited to have you on board. Moduvox helps you turn slide decks into narrated training videos in minutes." — 15px, #71717A

4. **Getting started steps** — A numbered list (1-4) with each item as:
   - **Step number** — Small charcoal circle with white number, 24×24px
   - **Step title** — Semibold, charcoal
   - **Step description** — Regular weight, #71717A
   
   Steps:
   1. **Upload a PPTX** — Start by uploading a presentation you want to narrate.
   2. **Choose a voice** — Pick a preset voice or clone your own.
   3. **Generate audio** — Let AI write your narration script, then generate natural-sounding audio.
   4. **Share** — Send the link to your audience and track who watched what.

5. **CTA button** — "Go to Dashboard →" — Solid charcoal (#18181B), white text, centered, same button style as Email 1.

6. **Help note** — "Need help? Reply to this email — we're happy to help." — 13px, #71717A

7. **Divider** — 1px line in #E4E4E7

8. **Footer** — Same as global footer. "If you didn't sign up for Moduvox, you can ignore this email."

**Tone:** Warm, encouraging, actionable. Guides the user toward first value.

---

## Email 3: Feedback Notification (Internal — sent to founder)

**Subject:** "New feedback from {name} — {category} ({rating}/5)"

**Layout (top to bottom, inside white card):**

1. **Headline** — "New Feedback" — Charcoal (#18181B), 22px, semibold

2. **Feedback card** — A slightly bordered (1px #E4E4E7) sub-card with 16px padding, light gray (#F9FAFB) background:
   - **Row 1:** Category badge (small rounded pill, #F3F4F6 bg, charcoal text, 12px) + Star rating (filled ★ in charcoal, empty ☆ in #D4D4D8, 16px)
   - **Row 2:** Name (semibold, charcoal, 14px) + email (regular, #71717A, 14px) on same line
   - **Row 3 (conditional):** "✓ OK to contact" in green (#16A34A), 12px, if they consented
   - **Row 4:** Message text in a subtle bordered box (#E4E4E7, light #FAFAFA background), 14px, #52525B

3. **Metadata** — IP address in 11px, #A1A1AA

4. **Divider** — 1px line in #E4E4E7

5. **Footer** — "Moduvox — Feedback notification"

**Tone:** Clean, scannable, data-dense. This is an internal notification — prioritize information hierarchy.

---

## Visual Notes

- **No images, no illustrations, no gradients.** Pure typography and solid shapes.
- **No accent color.** Everything is charcoal, muted steel, and zinc grays.
- **CTA buttons** are always solid charcoal (#18181B) with white text. No outline buttons in emails.
- **Links** in body text are underlined charcoal (#18181B).
- **Responsive** — the email should look good at 320px wide (single column, text wraps naturally, buttons are full-width at that size).
- **Accessibility** — text/background contrast ratios meet WCAG AA. Body text is never lighter than #71717A on white.

---

## Example Header/Footer HTML Structure

```
Header:
  [Moduvox wordmark — 16px, #71717A, semibold, centered]
  [thin divider line #E4E4E7]

Footer:
  [thin divider line #E4E4E7]
  ["Moduvox — Turn slides into narrated videos" — 11px, #A1A1AA, centered]
  ["Privacy · Terms" — 11px, #A1A1AA, centered, links underlined]
  ["If you didn't request this, ignore this email." — 11px, #A1A1AA, centered]
```

---

## Files to Generate

One mockup image per email, in order:

1. `email-mockup-magic-link.png` — The viewer verification email
2. `email-mockup-welcome.png` — The post-signup onboarding email  
3. `email-mockup-feedback.png` — The internal feedback notification

Each mockup should show the full email as it would appear on a phone screen (320-480px wide), framed cleanly. No browser chrome, no device frame — just the email content itself on the canvas background.
