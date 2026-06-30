# Features Page Implementation Plan

**Goal:** Create a `/features` route listing all Free tier features, wire it to the navbar.

**Architecture:** New route `app/features/page.tsx` renders a `FeaturesSection` component with organized feature groups. Navbar link updated from `#features` to `/features`.

**Features from PRD (Section 9):**
- PPTX Upload & Parsing, AI Narration, Voice Cloning, Preset Voices
- Slide-by-Slide Editor, Emotion Control (12 presets), Audio Assembly
- Hosted Player, Email-Gated Tracking, Viewer Dashboard, CSV Export
- Shareable Link + Password Protection, Smart Update
- Free Tier limits: 15 presentations lifetime, 3/day, 1 voice clone

---

## Files

| Action | File |
|--------|------|
| Create | `frontend/components/landing/features-section.tsx` |
| Create | `frontend/app/features/page.tsx` |
| Modify | `frontend/components/ui/Navbar.tsx` — change `#features` to `/features` |

Execute immediately — no approval needed.
