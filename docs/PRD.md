# Moduvox — Product Requirements Document

> **Version:** 1.0  
> **Date:** 2026-06-24  
> **Status:** Draft — awaiting final stakeholder review  
> **Author:** Product + Architecture Discovery Session

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Problem Statement](#2-problem-statement)
3. [Vision](#3-vision)
4. [Target Audience](#4-target-audience)
5. [User Personas](#5-user-personas)
6. [Jobs To Be Done](#6-jobs-to-be-done)
7. [Existing Workflow](#7-existing-workflow)
8. [Proposed Workflow](#8-proposed-workflow)
9. [Core Features](#9-core-features)
10. [Future Features](#10-future-features)
11. [Non-Goals](#11-non-goals)
12. [User Stories](#12-user-stories)
13. [Functional Requirements](#13-functional-requirements)
14. [Non-Functional Requirements](#14-non-functional-requirements)
15. [Technical Architecture](#15-technical-architecture)
16. [Data Model](#16-data-model)
17. [API Dependencies](#17-api-dependencies)
18. [Infrastructure Plan](#18-infrastructure-plan)
19. [Monetization Strategy](#19-monetization-strategy)
20. [Go-To-Market Plan](#20-go-to-market-plan)
21. [Success Metrics](#21-success-metrics)
22. [Risks & Mitigations](#22-risks--mitigations)
23. [Open Questions](#23-open-questions)
24. [MVP Scope](#24-mvp-scope)
25. [V2 Roadmap](#25-v2-roadmap)

---

## 1. Product Overview

**Moduvox** is a platform that converts PowerPoint presentations into narrated, voice-cloned training videos with built-in viewer tracking and compliance reporting. Users upload a PPTX file + a short voice sample, and Moduvox generates a complete narrated presentation in their voice, hosted at a shareable link with per-viewer analytics.

**One-liner:** *Slides + notes + your voice = a complete narrated presentation, in minutes, with proof of who watched it.*

---

## 2. Problem Statement

Corporate training and onboarding content creation is broken:

- **Recording narration is manual and painful.** IT/HR teams spend hours recording slide-by-slide voiceovers in PowerPoint, re-recording mistakes, and manually syncing audio to slides.
- **Updates break everything.** When one slide changes, the entire narration must be re-recorded or the audio desyncs.
- **No visibility into consumption.** Teams email slide decks or post PDFs, but have no way to verify who actually watched the training — a critical gap for compliance and audit requirements.
- **Existing tools are either expensive or overkill.** Enterprise video platforms (Synthesia, HeyGen) require building AI avatars and cost $89+/mo. Free tools (Loom, PowerPoint native) require real recording and manual editing.

**The status quo is "send a PDF and hope they read it."** For IT security training, HR policy rollouts, and software onboarding — where misunderstanding has real consequences — this is insufficient.

---

## 3. Vision

**Phase 1 (Year 1):** Become the default tool for IT/HR training teams to create, share, and verify compliance training content. Own the "PPTX → narrated training → proof of completion" pipeline.

**Phase 2 (Year 2):** Expand to education (teachers, university lecturers), sales enablement, and general content creators. Add SCORM/xAPI export for LMS integration. Introduce team collaboration and templating.

**Phase 3 (Year 3+):** Become a platform for AI-generated learning content — not just narration, but interactive quizzes, branching scenarios, and adaptive learning paths generated from slide content.

---

## 4. Target Audience

### Primary (V1 Wedge)
**Corporate IT and HR training teams** at companies with 50–2,000 employees, responsible for:
- Security policy training (phishing awareness, data handling)
- Software rollout onboarding (new CRM, new intranet, tool migrations)
- HR compliance training (harassment prevention, safety procedures)
- Internal process documentation (SOPs, workflow guides)

### Secondary (V2 Expansion)
- **K-12 and university educators** creating narrated lessons from slide decks
- **Sales enablement managers** creating product walkthroughs for distributed teams
- **SaaS customer success teams** creating onboarding tutorials from slide decks
- **Independent course creators** building narrated curriculum

---

## 5. User Personas

### Persona A: Priya — IT Training Manager
- **Role:** IT Training Manager at a 400-person fintech company
- **Goal:** Roll out a new phishing detection tool to all 400 employees within 2 weeks
- **Pain:** Has a 35-slide PPTX with detailed speaker notes. Recording narration slide-by-slide in PowerPoint takes 6+ hours. When the tool updates next quarter, she has to re-record everything.
- **Requirement:** Must prove to auditors that all employees completed the training
- **Budget:** Has a $200/mo tools budget; can swipe a corporate card without procurement approval
- **Workflow:** Creates PPTX → writes speaker notes → currently sends as PDF and hopes people read it

### Persona B: Marcus — HR Compliance Lead
- **Role:** HR Compliance Lead at a 1,200-person manufacturing company
- **Goal:** Conduct annual harassment prevention training for all staff (office + floor workers)
- **Pain:** Floor workers don't have desk computers — training must work on mobile. Current process involves in-person sessions that cost thousands in lost productivity.
- **Requirement:** Must track completion rates and export reports for regulatory audit
- **Budget:** Department-level approval needed for anything above $50/mo
- **Workflow:** Creates training deck → hires external trainer ($2,000/session) → no digital tracking exists

### Persona C: David — Solo IT Manager
- **Role:** IT Manager at a 60-person startup
- **Goal:** Onboard new hires to internal tools (Slack, Notion, GitHub) without 1-on-1 sessions
- **Pain:** Every new hire costs him 3 hours of screen-share walkthroughs. He's built slide decks but never records narration because it's too time-consuming.
- **Requirement:** Needs a simple, fast solution — zero learning curve
- **Budget:** Free to $20/mo — anything higher needs CEO approval
- **Workflow:** Creates slide decks → does live walkthroughs (repeatedly) → documents rot

---

## 6. Jobs To Be Done

| # | Job | Current Solution | Frustration |
|---|-----|-----------------|-------------|
| 1 | Turn my slide deck into a narrated training video | Record narration in PowerPoint slide-by-slide | Takes hours, mistakes require full re-records |
| 2 | Update one slide without redoing everything | Manually re-record that slide and splice audio | Audio levels don't match, sync is off, most people just don't update |
| 3 | Know who actually watched the training | Email tracking pixels (if they bother), LMS reports (if they have one) | No reliable per-person tracking for non-LMS users |
| 4 | Share training content securely | Attach PDF to email, upload MP4 to unlisted YouTube | No access control, no expiration, no audit trail |
| 5 | Make training feel personal without recording myself | Hire a voice actor, use generic TTS, or just use text | Expensive, robotic, or impersonal |

---

## 7. Existing Workflow

```
IT Manager creates PPTX with speaker notes (2 hours)
        │
        ▼
Opens PowerPoint → Slide Show → Record Slide Show
        │
        ▼
Records narration slide-by-slide (3–6 hours for a 30-slide deck)
  ├── Mistakes → re-record entire slide
  ├── Background noise → re-record
  └── Voice fatigue → quality degrades across session
        │
        ▼
Exports as MP4 (15 minutes of rendering)
        │
        ▼
Uploads to Google Drive / SharePoint / unlisted YouTube
        │
        ▼
Emails link to team → "Please watch this by Friday"
        │
        ▼
No way to verify who watched. Follows up manually. Some people never watch.
        │
        ▼
3 months later: Slide 7 is outdated. Process repeats from scratch.
```

**Total time per deck: 5–8 hours. Re-do on every update. Zero tracking. Zero security.**

---

## 8. Proposed Workflow

### Happy Path (First-Time Creation)

```
1. User opens Moduvox → clicks "New Presentation"
2. Uploads PPTX file (drag-and-drop or file picker)
3. Records or uploads a 30-second voice sample
   └── Checks consent checkbox: "I confirm this is my own voice"
4. Clicks "Generate Narration"
        │
        ▼
   [SYSTEM]: Extracts slide notes from PPTX
   [SYSTEM]: Sends notes + slide context to LLM → generates natural narration per slide
   [SYSTEM]: Renders slide thumbnails for editor
        │
        ▼
5. "Edit Narration" screen opens:
   ├── Shows Slide 1: thumbnail + generated narration text + emotion selector
   ├── User reviews text → edits if needed → selects emotion → clicks "Next"
   ├── Navigates freely between slides (prev/next, or click thumbnail strip)
   └── When satisfied → clicks "Confirm Narration"
        │
        ▼
   [SYSTEM]: Queues audio generation for each slide using voice clone engine
   [SYSTEM]: Assemblies final audio with slide timings
        │
        ▼
6. "Your presentation is ready" screen:
   ├── Embedded player preview (can watch immediately)
   ├── Shareable link: moduvox.com/view/abc123
   └── Settings: enable email gate, set password (optional), set expiration
        │
        ▼
7. User copies link → shares via Slack/Teams/email

8. IT Manager returns to Dashboard → clicks presentation → sees Viewer Report
   ├── Who watched, completion %, time spent, date
   └── Export CSV for compliance audit
```

### Smart Update Flow (Updating Existing Presentation)

```
1. User opens Dashboard → finds existing presentation → clicks "Update"
2. Uploads the revised PPTX
        │
        ▼
   [SYSTEM]: Compares new PPTX with stored original
   └── Hash comparison per slide: notes text + slide content
        │
        ▼
3. "Changes detected" screen:
   ├── Slide 7: CHANGED (speaker notes modified) → will re-narrate
   ├── Slide 12: NEW (added slide) → will narrate
   ├── Slide 3: REMOVED (deleted from deck) → will drop
   └── All other slides: UNCHANGED (26 slides preserved)
        │
        ▼
4. User reviews changed slides only → confirms → only those slides generate new audio
5. Existing shareable link updates automatically. Viewer tracking preserved.
```

### Viewer Experience

```
1. Viewer clicks shared link → opens Moduvox player page
2. Email gate appears (if enabled): viewer enters work email + name
3. Presentation plays in hosted player:
   ├── Slide transitions synced to narration
   ├── Navigation: play/pause, prev/next slide, progress bar
   ├── Optional: password prompt before access
   └── Tracking events fire: slide viewed, time spent, completion
4. Completion page: "Training complete" confirmation
```

---

## 9. Core Features

### V1 (MVP) — Must Have

| Feature | Description | Priority |
|---------|-------------|----------|
| **PPTX Upload & Parsing** | Accept .pptx files, extract slide content + speaker notes + render thumbnails | P0 |
| **AI Narration Generation** | Send slide notes + context to LLM (Gemini, free tier) → generate natural, conversational narration per slide | P0 |
| **Voice Cloning** | Accept 30-second voice sample → clone voice via VoxCPM2 → synthesize narration audio | P0 |
| **Preset Voices** | Offer preset AI voices (VoxCPM2 built-in) for users who don't upload a voice sample | P1 |
| **Slide-by-Slide Editor** | Show each slide thumbnail + generated narration text. User can edit text, change emotion, navigate slides. Confirm before audio generation. | P0 |
| **Emotion Control** | 12 preset emotions (excited, whisper, angry, calm, etc.) → selectable per slide → affects voice delivery | P1 |
| **Audio Assembly** | Concatenate per-slide audio with proper transitions → final WAV/MP3 | P0 |
| **Hosted Player** | Playable presentation at a unique URL. Slides auto-advance synced to narration. Play/pause/seek controls. | P0 |
| **Email-Gated Tracking** | Optional email gate before viewing. Tracks per-viewer: opened, completion %, time spent, date. | P0 |
| **Viewer Dashboard** | Per-presentation viewer report with table + CSV export. | P0 |
| **Shareable Link + Access Control** | Unique URL per presentation. Optional password protection. | P0 |
| **Smart Update** | Upload revised PPTX → compare with original → re-narrate only changed slides. Existing link updates. | P1 |
| **User Auth & Account** | Supabase Auth: email/password signup + email verification. Session management. | P0 |
| **Abuse Prevention** | Email verification required. Hard usage caps per account (see Section 19). IP-based rate limiting. reCAPTCHA on signup. | P0 |

### P0 = Cannot ship without. P1 = Strongly recommended for MVP competitiveness.

---

## 10. Future Features

### V2 (Post-MVP)

| Feature | Why |
|---------|-----|
| **SCORM/xAPI Export** | Package narrated presentation as LMS-compatible zip. Critical for enterprise LMS users. |
| **Team Workspaces** | Multiple users under one org account. Shared presentation library. |
| **Custom Branding** | Add company logo, colors to player page. |
| **Advanced Analytics** | Slide-level heatmaps, drop-off analysis, viewer trends over time. |
| **Multi-Language Narration** | Generate narration in 20+ languages from the same slide notes. |
| **Interactive Elements** | Embed quiz questions between slides with tracked responses. |
| **Auto-Subtitles** | Burn-in or toggleable captions synced to narration. |
| **API Access** | REST API for programmatic presentation generation (for LMS/platform integrations). |
| **Bulk/Batch Processing** | Upload multiple PPTX files → generate all in one batch. |
| **Background Music** | Library of royalty-free background tracks, adjustable volume. |

### V3 (Platform Vision)

| Feature | Why |
|---------|-----|
| **AI Slide Generation** | Generate slides + notes from a topic prompt (not just narration). |
| **Adaptive Learning Paths** | Branching scenarios based on viewer quiz responses. |
| **Template Marketplace** | Pre-built training templates for common IT/HR scenarios. |
| **White Label** | Fully branded subdomain for enterprise customers. |

---

## 11. Non-Goals

These are explicitly NOT in scope for V1 (or ever):

| Non-Goal | Reason |
|----------|--------|
| **AI avatar video generation** | Competing with Synthesia/HeyGen on avatars is a resource sink. Audio-only narration is the wedge. |
| **Live/collaborative editing** | Not real-time Google Docs-style. Async, single-user editing only for V1. |
| **Video timeline editor** | No frame-by-frame video editing. The editor is text-based (narration script) with slide thumbnails. |
| **Screen recording** | Not a Loom/Camtasia competitor. No screen capture. |
| **Two-way LMS integration** | SCORM export is V2. No API integration with specific LMS platforms in V1. |
| **Mobile app** | Web-responsive only. Player works on mobile; creation is desktop-first. |
| **Custom TTS model training** | We use VoxCPM2 as-is. No fine-tuning custom voice models for individual users. |
| **Real-time voice cloning from live speech** | Offline cloning from pre-recorded sample only. |

---

## 12. User Stories

### Epic 1: Create a New Presentation
- As an IT manager, I want to upload a PPTX file and a 30-second voice sample, so that Moduvox generates a narrated presentation in my voice.
- As a user without a mic, I want to select a preset AI voice, so that I can still generate a narrated presentation.
- As a user, I want to see the slides properly rendered as thumbnails in the editor, so that I know which slide I'm editing.

### Epic 2: Edit & Refine Narration
- As a user, I want to see the AI-generated narration text for each slide and edit it, so that I can fix mistakes or adjust tone before audio is generated.
- As a user, I want to select an emotion for each slide, so that the narration delivery matches the content (e.g., serious for policy, enthusiastic for product launches).
- As a user, I want to navigate freely between slides in the editor, so that I can review and edit in any order.
- As a user, I want to see which slides I've already reviewed vs. not yet reviewed, so that I don't accidentally skip slides.

### Epic 3: Share & Track
- As an IT manager, I want a shareable link for my presentation, so that I can distribute it to my team instantly.
- As an IT manager, I want to require viewers to enter their email before watching, so that I know exactly who has and hasn't completed the training.
- As an IT manager, I want to set a password on the presentation link, so that only authorized viewers can access it.
- As an IT manager, I want a dashboard showing who watched my presentation, their completion percentage, and when they watched, so that I can report compliance to auditors.
- As an IT manager, I want to export the viewer report as CSV, so that I can attach it to compliance documentation.

### Epic 4: Update Existing Presentation
- As an IT manager, I want to upload a revised PPTX and have only changed slides re-narrated, so that I don't waste time and credits re-generating everything.
- As an IT manager, I want the existing shareable link to update automatically with the new version, so that I don't have to redistribute links.
- As an IT manager, I want the viewer tracking data preserved across updates, so that my compliance records remain intact.

### Epic 5: Account & Limits
- As a new user, I want to sign up with my email and password and verify my email, so that I can start using Moduvox.
- As a user who hit my daily limit, I want to see a clear message telling me when I can create more, so that I'm not confused about why generation failed.
- As a user approaching my lifetime cap, I want to see how many presentations I have left, so that I can plan my usage.

---

## 13. Functional Requirements

### FR-1: PPTX Processing
- **FR-1.1:** System shall accept .pptx file uploads up to 50MB.
- **FR-1.2:** System shall extract all slide text content (titles, body text, alt text).
- **FR-1.3:** System shall extract speaker notes from each slide.
- **FR-1.4:** System shall generate a thumbnail image (PNG) of each slide for the editor.
- **FR-1.5:** If PPTX parsing fails, system shall return a user-facing error: "Unable to parse this file. Please ensure it's a valid .pptx file and try again."

### FR-2: Narration Generation
- **FR-2.1:** System shall send extracted slide notes + slide text context to the LLM (Gemini API, free tier) with a system prompt optimized for training narration tone.
- **FR-2.2:** System shall generate one narration segment per slide.
- **FR-2.3:** Generated narration shall be conversational, not robotic — using contractions, natural pacing cues, and slide-appropriate tone.
- **FR-2.4:** If a slide has no speaker notes, system shall generate narration from slide text content alone.
- **FR-2.5:** LLM generation errors shall be caught and surfaced: "Narration generation failed for slide X. You can write it manually or retry."

### FR-3: Voice Cloning & Audio Generation
- **FR-3.1:** System shall accept a 30-second to 3-minute voice sample upload (WAV, MP3, M4A).
- **FR-3.2:** System shall require a consent checkbox: "I confirm that this is my own voice and I have the right to use it."
- **FR-3.3:** System shall store the consent timestamp and user ID for audit purposes.
- **FR-3.4:** System shall offer preset AI voices as an alternative to voice cloning.
- **FR-3.5:** System shall synthesize narration audio per slide using VoxCPM2 via HuggingFace Gradio API.
- **FR-3.6:** System shall apply selected emotion to each slide's audio generation (emotion markers + control instructions).
- **FR-3.7:** System shall assemble per-slide audio into a single audio track with proper slide transition timing (200ms crossfade).
- **FR-3.8:** Audio generation errors shall surface per-slide: "Audio generation failed for slide X. You can retry this slide individually."

### FR-4: Slide Editor
- **FR-4.1:** Editor shall display one slide at a time: thumbnail image + editable narration text + emotion dropdown.
- **FR-4.2:** User shall navigate slides via Previous/Next buttons and a clickable thumbnail strip at the bottom.
- **FR-4.3:** Each slide shall show a status: "Pending review" (default), "Reviewed" (user clicked through), "Edited" (user modified text).
- **FR-4.4:** User shall select an emotion per slide from 12 presets: Excited, Whisper, Slow & Dramatic, Fast, Nervous, Crying, Angry, Calm, Laughing, Sarcastic, Storytelling, Breathless.
- **FR-4.5:** User shall click "Confirm Narration" to proceed to audio generation. System shall warn if any slides are unreviewed: "You have 3 slides still marked 'Pending review.' Continue anyway?"

### FR-5: Hosted Player
- **FR-5.1:** Each presentation shall have a unique, unguessable URL: `moduvox.com/view/{uuid}`.
- **FR-5.2:** Player shall display current slide, narration audio, and navigation controls (play/pause, prev/next slide, progress bar).
- **FR-5.3:** Slides shall auto-advance in sync with narration audio.
- **FR-5.4:** Player shall be responsive — functional on mobile, tablet, and desktop.
- **FR-5.5:** Player shall track view events: presentation opened, slide viewed, completion percentage, total time spent.

### FR-6: Email Gate & Tracking
- **FR-6.1:** Presentation owner shall toggle email gate on/off per presentation.
- **FR-6.2:** When enabled, viewer must enter name + email before the presentation plays.
- **FR-6.3:** System shall store viewer identity + tracking events (slide progress, time per slide, completion status) in database.
- **FR-6.4:** Dashboard shall display viewer table: Name, Email, Status (Not viewed / In progress / Completed), Completion %, Time Spent, Date.
- **FR-6.5:** Owner shall export viewer report as CSV.

### FR-7: Access Control
- **FR-7.1:** Owner shall optionally set a password on a presentation link.
- **FR-7.2:** When password is set, viewer must enter it before accessing the player.
- **FR-7.3:** Owner shall optionally set an expiration date, after which the link becomes inaccessible.

### FR-8: Smart Update
- **FR-8.1:** System shall store the original PPTX (or extracted slide data + hashes) for each presentation.
- **FR-8.2:** On re-upload, system shall hash each slide's speaker notes and text content.
- **FR-8.3:** System shall compare hashes against stored version to identify: Changed, New, Removed, and Unchanged slides.
- **FR-8.4:** Only changed/new slides shall enter the narration + audio generation pipeline.
- **FR-8.5:** Existing shareable link shall serve the updated presentation. Existing viewer tracking data shall be preserved.

### FR-9: Auth & Account
- **FR-9.1:** Users shall sign up with email + password via Supabase Auth.
- **FR-9.2:** Email verification shall be required before account activation. Unverified accounts cannot create presentations.
- **FR-9.3:** Users shall log in with email + password.
- **FR-9.4:** Password reset flow shall be available.
- **FR-9.5:** All API routes and pages under `/dashboard` shall require authenticated + verified session.

### FR-10: Abuse Prevention (Free Tier Only)
- **FR-10.1:** Each verified account shall be limited to 15 presentations total (lifetime cap). This prevents fake-account abuse — creating a new account resets the counter, but email verification makes mass account creation costly.
- **FR-10.2:** Each verified account shall be limited to 3 presentations per day. This prevents one user from consuming all API quota.
- **FR-10.3:** Signup endpoint shall be rate-limited to 3 signups per IP per hour.
- **FR-10.4:** reCAPTCHA v2 (free) shall be required on the signup form.
- **FR-10.5:** Generation endpoints shall be rate-limited to 5 requests per account per hour.
- **FR-10.6:** When a user hits a limit, system shall show a clear message: "You've reached your daily limit of 3 presentations. You can create more tomorrow." (No upgrade prompt — there is no paid tier yet.)
- **FR-10.7:** Voice clone storage shall be limited to 1 voice per account. Uploading a new voice sample replaces the previous one.

---

## 14. Non-Functional Requirements

| # | Requirement | Target |
|---|-------------|--------|
| NFR-1 | **Narration generation latency** | LLM narration text generated within 15 seconds per slide (parallelized) |
| NFR-2 | **Audio generation latency** | Voice synthesis within 10 seconds per slide (via VoxCPM2) |
| NFR-3 | **Total end-to-end time** | 30-slide deck: < 10 minutes from upload to "ready to review" |
| NFR-4 | **Player time-to-first-frame** | < 3 seconds for viewer page load |
| NFR-5 | **Uptime** | 99.5% for player + dashboard (excluding third-party API downtime) |
| NFR-6 | **Security** | HTTPS everywhere. RLS on all DB tables. AES-256 encryption for stored API keys. No voice samples stored permanently. |
| NFR-7 | **Input validation** | Zod schemas on all API route inputs. Reject unknown fields. |
| NFR-8 | **Error resilience** | Third-party API failures (Gemini, VoxCPM2) must not crash the application. Graceful degradation with user-facing retry options. |
| NFR-9 | **Responsive design** | Player and landing page functional on mobile (360px+). Creator dashboard optimized for desktop (1024px+). |
| NFR-10 | **Accessibility** | WCAG 2.1 AA minimum. Keyboard navigation, screen reader support, sufficient color contrast. |
| NFR-11 | **Rate limiting** | Auth endpoints: max 10 requests/minute per IP. Generation endpoints: 5 per account per hour. Signup: 3 per IP per hour. |
| NFR-12 | **File size limits** | PPTX: 50MB max. Voice sample: 10MB max. Enforced server-side. |
| NFR-13 | **Abuse resistance** | Email verification mandatory before any generation. reCAPTCHA on signup. Lifetime cap per account: 15 presentations. Daily cap: 3 presentations. |

---

## 15. Technical Architecture

### Guiding Principle: Zero-Cost MVP

All tools and services must have a usable free tier. No paid APIs, no paid hosting add-ons. The MVP runs entirely on free tiers. Monetization and paid infrastructure are V2 decisions.

### Tech Stack

| Layer | Technology | Rationale | Free Tier Limit |
|-------|-----------|-----------|-----------------|
| **Frontend Framework** | Next.js 15 (App Router) | Server components, API routes, Vercel-native | N/A (open source) |
| **Language** | TypeScript (strict mode) | Type safety, maintainability | N/A |
| **Styling** | Tailwind CSS + shadcn/ui | Utility-first CSS, pre-built accessible components | N/A |
| **UI Primitives** | Radix UI | Headless accessible components | N/A |
| **State Management** | @tanstack/react-query | Server state, caching, background refresh | N/A |
| **Forms + Validation** | react-hook-form + Zod | Form state management + schema validation | N/A |
| **Charts (Dashboard)** | Recharts | Composable React charting library | N/A |
| **Database** | Supabase (PostgreSQL) | RLS, auth, real-time, managed service | 500MB DB, 2 projects |
| **Auth** | Supabase Auth | Email/password + email verification | 50,000 MAU |
| **File Storage** | Supabase Storage | PPTX files, voice samples, thumbnails, audio | 1GB storage, 2GB bandwidth |
| **Email** | Resend | Email verification, password reset | 100 emails/day |
| **LLM (Narration)** | Google Gemini (free tier) | Narrative text generation from slide notes | 1,500 requests/day |
| **TTS (Voice)** | VoxCPM2 via HuggingFace Gradio | Voice cloning + emotion-controlled speech synthesis | Free public space |
| **Hosting** | Vercel (Hobby) | Next.js native, edge network, preview URLs | 100GB bandwidth, 6K build minutes |
| **Design/Prototyping** | Google Stitch (labs.google.com/stitch) | AI-generated screen designs from natural language. Free. Used for rapid prototyping before code. | Free |
| **Implementation** | v0 by Vercel (optional) | AI-generated React/Tailwind components from prompts. Accelerates UI development. | Free tier |
| **Monitoring** | Vercel Analytics (Web Vitals) + console.error logging | Performance + error tracking | Free tier included |

### Key Change: No Background Worker

For MVP cost reasons, there is **no separate Railway worker**. All generation happens synchronously within Vercel API routes (60s timeout on Hobby plan). The flow:

1. **PPTX parse + thumbnail render + LLM narration** — fast enough to complete within 60s (parallelized per slide)
2. **TTS audio generation** — returned progressively. User waits ~2-3 minutes for a 30-slide deck. Acceptable for MVP.
3. If a generation takes >60s, the route returns a `202 Accepted` with a polling URL. The frontend polls until complete.

This eliminates the $5/mo Railway cost at the expense of longer user wait times on large decks. A background worker is a V2 optimization.

### Architecture Diagram (MVP — No Worker)

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                              │
│                                                                   │
│  Dashboard (React) ←→ Editor ←→ Player (Viewer)                  │
│       │                  │           │                            │
│       │    ┌─────────────┘           │                            │
│       ▼    ▼                         ▼                            │
│  Next.js API Routes (Vercel Serverless)                           │
│       │                                                           │
│       ├── /api/auth/*         → Supabase Auth                    │
│       ├── /api/presentations  → CRUD + generate + status poll    │
│       └── /api/view           → Viewer tracking events            │
└───────┬───────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES (All Free Tier)            │
│                                                                   │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐                       │
│  │ Gemini  │  │ VoxCPM2  │  │  Resend    │                       │
│  │ (LLM)   │  │ (TTS)    │  │  (Email)   │                       │
│  │ Free    │  │ Free HF  │  │  100/day   │                       │
│  └─────────┘  └──────────┘  └────────────┘                       │
└──────────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SUPABASE (Free Tier)                           │
│                                                                   │
│  PostgreSQL: users, presentations, slides, narrations,            │
│              viewer_events, rate_limits                           │
│  Storage: pptx files, voice samples (ephemeral), thumbnails,      │
│            generated audio                                        │
│  Auth: email/password + email verification, RLS policies          │
└──────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Two-phase generation:** Narration text (LLM) and audio synthesis (TTS) are separate steps. Users review and edit text before audio is generated. This saves API calls and gives editing control.

2. **Synchronous generation in API routes (no worker):** For MVP, PPTX parsing and LLM narration happen within the API route (parallelized per slide, completes within Vercel's 60s timeout). TTS audio generation may exceed 60s for large decks — in that case the route returns `202 Accepted` with a status polling URL. The frontend polls until complete. A dedicated worker (Railway) is a V2 optimization.

3. **Ephemeral voice samples:** Voice samples are decoded, sent to VoxCPM2, and then deleted from server storage. They are not persisted. This reduces data privacy risk.

4. **PPTX storage for Smart Update:** Original PPTX files (or extracted slide data + hashes) are stored in Supabase Storage for comparison on re-upload.

5. **Separate Viewer domain:** The viewer/player page (`/view/{uuid}`) is unauthenticated (public). The dashboard and API are behind auth middleware with an explicit matcher config.

---

## 16. Data Model

### Core Tables (Supabase PostgreSQL + RLS)

```sql
-- Users (extends Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Presentations
CREATE TABLE presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating_narration', 'review', 'generating_audio', 'ready', 'error', 'archived')),
  voice_type TEXT DEFAULT 'preset' CHECK (voice_type IN ('preset', 'cloned')),
  voice_preset_id TEXT,            -- Which preset voice used
  voice_sample_path TEXT,          -- Temp path to voice sample (deleted after processing)
  voice_consent_at TIMESTAMPTZ,    -- When user checked consent checkbox
  voice_consent_ip TEXT,           -- IP address at time of consent
  total_slides INTEGER DEFAULT 0,
  share_token UUID DEFAULT gen_random_uuid(), -- Unique URL token
  password_hash TEXT,              -- Optional bcrypt hash for password protection
  expires_at TIMESTAMPTZ,          -- Optional expiration
  email_gate_enabled BOOLEAN DEFAULT FALSE,
  original_pptx_path TEXT,         -- Stored for Smart Update comparison
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Slides
CREATE TABLE slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  slide_number INTEGER NOT NULL,
  title TEXT,
  content_text TEXT,              -- Extracted slide text
  speaker_notes TEXT,             -- Original speaker notes from PPTX
  thumbnail_path TEXT,            -- Supabase Storage path to thumbnail PNG
  content_hash TEXT,              -- Hash of slide content + notes for Smart Update
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'narration_generated', 'reviewed', 'audio_generated', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Narrations
CREATE TABLE narrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_id UUID NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
  generated_text TEXT,            -- AI-generated narration text
  edited_text TEXT,               -- User-edited narration text (overrides generated)
  emotion TEXT DEFAULT 'calm',    -- Selected emotion for this slide
  audio_path TEXT,                -- Supabase Storage path to synthesized audio (WAV)
  audio_duration_ms INTEGER,      -- Duration of audio in milliseconds
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'text_generated', 'reviewed', 'audio_generating', 'audio_ready', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Viewer Events (for analytics/tracking)
CREATE TABLE viewer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  viewer_email TEXT,
  viewer_name TEXT,
  event_type TEXT CHECK (event_type IN ('opened', 'slide_viewed', 'completed', 'closed')),
  slide_number INTEGER,          -- Only for 'slide_viewed' events
  progress_pct NUMERIC(5,2),     -- 0.00 to 100.00
  time_spent_seconds INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Usage Tracking (for abuse prevention + limits)
CREATE TABLE usage_tracking (
  id UUID PRIMARY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  presentations_lifetime INTEGER DEFAULT 0,  -- Incremented on each generation
  presentations_today INTEGER DEFAULT 0,     -- Reset daily via cron or on-read check
  last_presentation_date DATE,               -- For resetting daily counter
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tier Usage Tracking
CREATE TABLE usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  slides_generated INTEGER DEFAULT 0,
  presentations_created INTEGER DEFAULT 0,
  voice_clones_saved INTEGER DEFAULT 0
);

-- Tier Usage Tracking
CREATE TABLE usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  slides_generated INTEGER DEFAULT 0,
  presentations_created INTEGER DEFAULT 0,
  voice_clones_saved INTEGER DEFAULT 0
);
```

### RLS Policies (Example)

```sql
-- Users can only read/write their own presentations
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own presentations"
ON presentations
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Viewer events: owner can read, anyone can insert (tracking)
CREATE POLICY "Anyone can insert viewer events"
ON viewer_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Owner can read viewer events"
ON viewer_events FOR SELECT
USING (
  auth.uid() = (
    SELECT user_id FROM presentations WHERE id = viewer_events.presentation_id
  )
);
```

---

## 17. API Dependencies

| Service | Endpoint / Model | Purpose | Free Tier Limit | Fallback |
|---------|-----------------|---------|-----------------|----------|
| **Google Gemini** | `gemini-2.0-flash` (or latest fast model) | Generate natural narration from slide notes | 1,500 requests/day, 1M token context | None in MVP; degrade to "write narration manually" with template hints |
| **VoxCPM2** | `openbmb/VoxCPM-Demo` (HuggingFace Gradio) | Voice cloning + emotion-controlled speech synthesis | Free (HF Spaces, rate-limited) | Preset voices still work; voice cloning fails gracefully |
| **Supabase** | Auth, DB, Storage | User auth, data persistence, file storage | 500MB DB, 1GB storage, 50K MAU | N/A (core infrastructure) |
| **Resend** | `emails.send` | Email verification, password reset | 100 emails/day | Supabase built-in email (if Resend unavailable) |
| **reCAPTCHA** | v2 checkbox | Bot prevention on signup | Free (1M assessments/month) | Rate limiting alone (degraded protection) |
| **HuggingFace** | `@gradio/client` v2.2.0 | Client library for VoxCPM2 Gradio Space | Free | N/A |

### API Keys Required in Production

```
GEMINI_API_KEY            # Google AI Studio free tier
VOXCPM2_SPACE_ID          # openbmb/VoxCPM-Demo (or custom space)
HF_TOKEN                  # HuggingFace auth (optional)
RESEND_API_KEY            # Transactional email
NEXT_PUBLIC_SUPABASE_URL  # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY # Supabase anon key (client-side)
SUPABASE_SERVICE_ROLE_KEY # Supabase service role (server-side only)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY # reCAPTCHA v2 site key
RECAPTCHA_SECRET_KEY      # reCAPTCHA v2 secret key
ENCRYPTION_KEY            # AES-256 key for data at rest
```

---

## 18. Infrastructure Plan

### Hosting (All Free Tier)

| Component | Platform | Free Tier Limit |
|-----------|----------|-----------------|
| Next.js App (frontend + API routes) | Vercel (Hobby) | 100GB bandwidth, 6K build minutes/month |
| Database + Auth + Storage | Supabase (Free) | 500MB DB, 1GB storage, 2GB bandwidth, 50K MAU |
| Domain | Any registrar → Vercel DNS | ~$15/year (only real cost) |
| Email | Resend (Free) | 100 emails/day |
| LLM | Google Gemini (Free) | 1,500 requests/day |
| TTS | HuggingFace Gradio (Free) | Rate-limited public space |
| Bot Protection | reCAPTCHA v2 (Free) | 1M assessments/month |

### Total Monthly Infrastructure Cost: $0

The only real cost is the domain name (~$15/year, or ~$1.25/mo). All services operate within free tier limits for MVP scale (< 500 users, < 200 presentations/month).

### Scaling Considerations (When Free Tiers Are Exceeded)

| Concern | Free Tier Limit | When We'd Hit It | V2 Mitigation |
|---------|----------------|-----------------|---------------|
| **Supabase DB** | 500MB | ~5,000 presentations + viewer events | Upgrade to Pro ($25/mo) |
| **Supabase Storage** | 1GB | ~200 presentations with audio | Upgrade to Pro; implement lifecycle policies |
| **Gemini API** | 1,500 req/day | ~500 presentations/day | Add DeepSeek or OpenAI fallback; cache narration per slide hash |
| **VoxCPM2 Gradio** | Rate-limited | ~50 concurrent generations | Deploy dedicated HF Space ($0.50/hr GPU) |
| **Vercel bandwidth** | 100GB/month | ~5,000 viewer sessions | Upgrade to Pro ($20/mo) |
| **Resend** | 100 emails/day | ~300 signups/day | Upgrade to paid tier ($20/mo) |

### Generation Time Estimates (Synchronous API Route)

| Deck Size | PPTX Parse + LLM Narration | TTS Audio | Total (User Wait) |
|-----------|---------------------------|-----------|-------------------|
| 10 slides | ~15s | ~45s | ~1 minute |
| 30 slides | ~30s | ~2 min | ~2.5 minutes |
| 50 slides | ~45s | ~3.5 min | ~4+ minutes (may hit 60s timeout) |

For decks >30 slides, the API route returns `202 Accepted` and the frontend polls a status endpoint every 5 seconds until audio generation completes.

---

## 19. Free Tier & Abuse Prevention

### MVP Strategy: Free Only, Hard Limits

Moduvox MVP is entirely free. There is no paid tier, no payment integration, no Dodo Payments. The goal is to validate product-market fit without the complexity of billing infrastructure.

The challenge: **free tools attract abuse** — users create fake accounts to bypass limits, bots spam the API, one user consumes all shared resources.

### Abuse Prevention Model

We use a **defense-in-depth** approach with four layers:

| Layer | Mechanism | What It Prevents |
|-------|-----------|-----------------|
| **1. Signup Gate** | Email verification + reCAPTCHA v2 | Mass fake account creation |
| **2. Rate Limiting** | IP-based + account-based limits on API routes | API abuse, DDoS-like behavior |
| **3. Usage Caps** | Hard per-account limits (daily + lifetime) | One user consuming all resources via multiple accounts |
| **4. Progressive Delays** | New accounts get slower generation for first 2 presentations | Burner accounts for quick abuse |

### Usage Limits (Per Verified Account)

| Limit | Value | Rationale |
|-------|-------|-----------|
| **Presentations lifetime** | 15 total | Prevents infinite free usage. A legitimate user creating 15 training decks has gotten real value. |
| **Presentations per day** | 3 | Prevents one user from consuming all Gemini/VoxCPM2 quota in a single session. |
| **Voice clones** | 1 active at a time | Uploading a new voice sample replaces the previous one. |
| **Slides per presentation** | 50 max | Prevents abuse via massive deck uploads. |
| **Voice sample duration** | 30s–3min | Minimum for clone quality, maximum to limit upload size. |

### Rate Limits

| Endpoint | Limit | Scope |
|----------|-------|-------|
| `POST /api/auth/signup` | 3 per IP per hour | IP-based |
| `POST /api/auth/signup` | 5 per day | IP-based |
| `POST /api/presentations/generate` | 5 per account per hour | Account-based |
| `POST /api/presentations/generate` | 3 per account per day | Account-based |
| `POST /api/view/event` (tracking) | 100 per minute per presentation | Presentation-based |

### Progressive Delay for New Accounts

To discourage burner accounts, new accounts experience longer generation times:

| Presentation # | Generation Speed |
|----------------|-----------------|
| 1st | Normal (no delay) |
| 2nd | Normal |
| 3rd+ | Normal |

> **Note:** For MVP, progressive delay is optional (complicates UX). The 15-presentation lifetime cap + 3/day cap + email verification is sufficient. Progressive delay can be added if abuse is observed in production.

### What Users See When They Hit a Limit

```
┌─────────────────────────────────────────────────┐
│  ⚠️ Daily limit reached                         │
│                                                 │
│  You've created 3 presentations today.          │
│  You can create more tomorrow.                  │
│                                                 │
│  Presentations this month: 12 of 15 lifetime    │
│                       [OK]                       │
└─────────────────────────────────────────────────┘
```

There is **no upgrade prompt, no pricing page, no payment flow** in MVP. All limits are communicated as "try again tomorrow" or "you've reached the maximum." This is intentionally simple — monetization is added in V2 once product-market fit is validated.

### Monitoring for Abuse (Manual)

Since there's no automated abuse detection in MVP, the founder monitors:

1. **Weekly check:** Query Supabase for accounts with >10 presentations — spot-check if they're legitimate.
2. **Gemini API dashboard:** Monitor request count. Spikes indicate abuse or growth (good problem).
3. **VoxCPM2 Gradio Space:** Monitor for unusual activity or rate-limit errors.

If abuse is detected, the response is manual: flag the account as `suspended` in the database (add `status` column to `users` table: `active`, `suspended`).

---

## 20. Go-To-Market Plan

### Phase 0: Pre-Launch Validation (Before Any Code — 2 Weeks)

| Action | Goal |
|--------|------|
| Interview 10 IT/HR training managers (LinkedIn outreach, Reddit r/ITManagers, r/humanresources) | Validate the pain point. Ask: "How do you currently create and track training content?" Record verbatim answers. |
| Collect 5 real PPTX files from target users | Test parsing reliability with real-world corporate decks |
| Post in r/ITManagers, r/elearning, r/instructionaldesign | Gauge interest, collect feature requests, build waitlist |
| Set up landing page (moduvox.com) with email capture | Measure conversion rate from Reddit/LinkedIn traffic |

### Phase 1: Closed Beta (Weeks 3–6)

- Invite 20–30 IT/HR managers from pre-launch waitlist
- Free access during beta in exchange for feedback
- Focus on: PPTX parsing reliability, narration quality, editor UX
- Collect Net Promoter Score (NPS) from beta users

### Phase 2: Public Launch (Week 7)

- **Product Hunt launch** — target Tuesday/Wednesday launch. Prep: demo video, 5 screenshots, first comment with founder story, maker reply to every comment.
- **LinkedIn content** — 2 posts/week in first month: "How we built X," "Why training tracking matters," "Before/after: manual recording vs Moduvox"
- **Reddit** — value-add posts (not ads) in r/ITManagers, r/elearning, r/SaaS: "I built a tool that turns PPTX into narrated training in minutes — feedback welcome"
- **Direct outreach** — 50 cold LinkedIn DMs to IT training managers at mid-size companies: "Saw you post about training challenges. Built something that might help. Would love 10 min of feedback."

### Phase 3: Growth (Month 2–6)

- **Content marketing:** Blog posts targeting "how to create training videos from PowerPoint," "compliance training tracking tools," "AI voiceover for corporate training"
- **SEO:** Long-tail keywords around "PPTX to video," "AI narrated presentations," "voice clone training"
- **Referral program:** Free Pro month for every referred paying user
- **Partnerships:** Integrate with LMS listing sites, e-learning communities

### Channel Effectiveness (Estimated)

| Channel | Reach | Conversion Expectation | Effort |
|---------|-------|----------------------|--------|
| Product Hunt | 500–2K visitors in launch week | 2–5% → waitlist | High (one-time) |
| LinkedIn posts | 1K–5K impressions/post | 1–3% → landing page | Medium (ongoing) |
| Reddit (value posts) | 2K–10K views/post | 3–8% → landing page | Medium (3–5 posts) |
| Cold LinkedIn DM | 50 DMs sent | 20–30% reply rate, 10% trial | High (personalized) |
| Content/SEO | 0–50 visitors/day initially | Slow build, compounds | High (ongoing) |

---

## 21. Success Metrics

### 30-Day Goals (Post-Launch)

| Metric | Target | Why |
|--------|--------|-----|
| Waitlist signups | 200+ | Validates interest before launch |
| Beta users | 20+ active | Enough for qualitative feedback |
| Beta users who'd recommend | 70%+ | Product-market fit signal (no pricing to validate yet) |
| PPTX parsing success rate | 95%+ | Most corporate PPTX files parse without error |

### 90-Day Goals

| Metric | Target | Why |
|--------|--------|-----|
| Total registered + verified users | 300+ | Top-of-funnel growth |
| Presentations generated | 150+ | Usage depth |
| Presentations shared (link copied) | 50%+ of generated | Indicates actual use, not just testing |
| Viewer tracking events | 500+ | Feature adoption (email gate + tracking) |
| Smart Update usage | 15% of users | Sticky feature validation |
| Return rate (users who come back within 14 days) | 40%+ | Retention signal |
| Abuse incidents | < 3 | Abuse prevention working |
| Gemini API usage | < 50% of free tier limit | Headroom for growth |

### 12-Month Goals

| Metric | Target | Why |
|--------|--------|-----|
| Total registered users | 2,000+ | Market traction |
| Monthly active users | 300+ | Sustained engagement |
| Presentations generated/month | 500+ | Platform scale |
| NPS | > 40 | User satisfaction |
| Free tier limit hits (lifetime cap) | 50+ users at 15/15 | Demand signal for paid tier |
| Conversion readiness | 30%+ of capped users express willingness to pay | Validates monetization potential |

### Leading Indicators (Watch Weekly)

- **Activation rate:** % of signups who complete first presentation generation within 48 hours
- **Time to first presentation:** minutes from signup to "ready" status
- **Editor engagement:** % of users who edit narration text (not just accept AI output)
- **Share rate:** % of presentations that get a shareable link copied
- **Viewer tracking enable rate:** % of presentations where email gate is turned on
- **Abuse signals:** accounts creating exactly 3 presentations/day (indicates scripted usage)
- **Gemini API quota:** % of daily free tier used (alerts at 70%)

---

## 22. Risks & Mitigations

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **VoxCPM2 Gradio Space goes down or gets rate-limited** | Medium | High — core feature breaks | Add ElevenLabs as fallback TTS (partially implemented). Monitor VoxCPM2 uptime. Budget for dedicated HF Space if needed ($0.50/hr GPU). |
| **Gemini API free tier changes or rate limits** | Low | Medium — narration generation breaks | Abstract LLM calls behind an interface. Add fallback provider (Groq free tier, Together AI credits). Cached narration text per slide hash reduces API dependency. |
| **PPTX parsing fails on complex corporate decks** | Medium | Medium — user frustration | Test with 20+ real corporate PPTX files pre-launch. Graceful error per-slide (skip unparseable slides, allow manual narration). Consider multiple parsing libraries. |
| **Audio generation latency degrades UX for 50+ slide decks** | Medium | Medium — users abandon | Two-phase generation: text first (fast, editable), audio second (async, background). Worker parallelizes per-slide audio generation. |
| **Voice clone quality is inconsistent** | High | High — core value prop suffers | Set expectations in UI: "Results vary based on sample quality." Guide users to record in quiet environments. Offer preset voices as reliable alternative. |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **10+ competitors already in market** | Certain | High — differentiation is critical | Own the compliance/tracking wedge. No competitor offers viewer tracking + email gate + CSV export. Double down on IT/HR niche. |
| **Synthesia/HeyGen add PPTX-to-narrated as a feature** | Medium | High — they have enterprise sales teams | Move faster. Build SCORM export (V2) before they do. They're avatar-first; we're audio-first. Different use case. |
| **Voice cloning legal/regulatory risk** | Medium | High — lawsuits, platform bans | Mandatory consent checkbox with timestamp + IP logging. Terms of Service explicitly prohibit cloning others' voices without consent. Right to suspend accounts. |
| **Abuse / fake account creation** | High | Medium — API quota exhaustion, degraded service for real users | Email verification + reCAPTCHA + hard lifetime cap (15 presentations) + IP rate limiting. Manual review of suspicious accounts. |
| **Free API quotas exhausted (Gemini, VoxCPM2, Supabase)** | Medium | High — service outage | Monitor usage daily. Alert at 70% of quota. Have fallback plans documented (Section 18). If growth exceeds free tier, that's a good problem — it validates the product and justifies paid infrastructure. |

### UX Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Editing interface is confusing** | Medium | Medium — users abandon | Early beta testing focused on editor UX. Simple linear flow (slide 1 → slide N) with optional free navigation. Progress indicators. |
| **AI narration quality is "uncanny valley"** | Medium | Medium — users don't trust output | LLM prompt engineering for natural conversational tone. Editable text gives users final control. "It sounds like you... mostly." |
| **Onboarding friction (PPTX + voice sample + wait)** | High | Medium — drop-off | Pre-built demo/template PPTX for first-time users to test instantly. "Try with sample deck" CTA. Show estimated time upfront. |

---

## 23. Open Questions

These require further research or decision-making before implementation:

| # | Question | Owner | Deadline |
|---|----------|-------|----------|
| OQ-1 | What specific Gemini model (flash vs. pro) produces the best training narration tone within free tier limits? | Engineering | Pre-dev spike |
| OQ-2 | Is Gemini's free tier sufficient for real usage, or do we need a fallback free LLM (e.g., Groq, Together AI free credits)? | Engineering | After first week of beta |
| OQ-3 | What's the right lifetime presentation cap? 15 is proposed — test whether this causes frustration before users get value. | Product | Post-beta analysis |
| OQ-4 | Should viewer tracking be opt-in per presentation, or always-on? | Product | UX decision |
| OQ-5 | How should audio files be cleaned up over time given Supabase's 1GB free storage limit? | Engineering | Before launch |
| OQ-6 | What PPTX parsing library handles the widest range of corporate files? (pptx2json, officeparser, mammoth + custom) | Engineering | Pre-dev investigation |
| OQ-7 | Do we need a privacy policy for viewer tracking data (emails, watch behavior)? | Legal | Before launch |
| OQ-8 | Should we support Google Slides import, or PPTX-only for V1? | Product | Scope decision for V1 |
| OQ-9 | At what user count do we add monetization? 500 users? 1,000? When free tier API quotas are at 70%? | Product/Strategy | Ongoing |

---

## 24. MVP Scope

### What Ships in V1.0

**Core Pipeline:**
- PPTX upload + parsing + thumbnail rendering
- Speaker notes extraction + AI narration generation via Gemini
- Voice cloning via VoxCPM2 (with consent checkbox)
- Preset AI voice option
- Slide-by-slide editor with emotion selection
- Two-phase generation: text review → audio synthesis
- Audio assembly + hosted player

**Sharing & Tracking:**
- Shareable link with optional password protection
- Email-gated viewer tracking
- Viewer dashboard with CSV export
- Smart Update (slide comparison + selective re-narration)

**Platform:**
- User auth (email/password via Supabase) with email verification
- reCAPTCHA on signup
- Abuse prevention (daily + lifetime caps, rate limiting)
- Dashboard with presentation library, usage stats, viewer reports
- Manual account suspension capability (for abuse response)

### What Does NOT Ship in V1

- SCORM/xAPI export
- Team workspaces
- Custom branding
- Multi-language narration
- Background music
- Interactive quizzes
- API access
- Google Slides import
- Mobile creation flow (player is mobile-responsive)

### V1 Success Criteria (Exit Criteria for MVP)

- [ ] 10 beta users complete at least 1 presentation from upload to share
- [ ] PPTX parsing works on 90%+ of test files
- [ ] Full pipeline: upload → narration → edit → audio → shareable link works end-to-end without errors
- [ ] Viewer tracking captures: email, completion %, time spent, date
- [ ] CSV export contains all viewer data
- [ ] Smart Update correctly identifies changed slides on 95%+ of test cases
- [ ] Email verification required on signup; unverified accounts cannot generate
- [ ] reCAPTCHA prevents automated signups
- [ ] Rate limits enforced: 3 signups/IP/hour, 5 generations/account/hour, 3 presentations/account/day
- [ ] Lifetime cap (15 presentations/account) enforced
- [ ] Zero unhandled exceptions on any API route
- [ ] Middleware matcher config is present and correct
- [ ] All Zod validation schemas reject invalid input with 400 + field-level errors
- [ ] Gemini API usage stays within free tier limits under normal load

---

## 25. V2 Roadmap

### V2.0 — Monetization & Scale (Target: When free tier limits are regularly hit)

| Feature | Rationale |
|---------|-----------|
| **Paid tiers (Pro $20/mo, Team $50/mo)** | Introduced when 30%+ of active users hit the 15-presentation lifetime cap and express willingness to pay. |
| **Dodo Payments integration** | Checkout + webhooks + subscription management. |
| **Dedicated background worker (Railway)** | Offload generation from API routes. Faster, more reliable. Unblocks larger decks. |
| **SCORM 1.2 + xAPI export** | Unlocks enterprise LMS users. Synthesia/HeyGen have this; we need it to compete upmarket. |
| **Team workspaces** | Collaboration for department-level training teams. |
| **Custom branding on player (logo, colors)** | Enterprise requirement. Differentiator from free tools. |
| **Google Slides import** | Expands TAM beyond PPTX-only users. |
| **Bulk processing (upload multiple PPTX → generate all)** | Efficiency for power users. |
| **Burn-in subtitles (auto-generated)** | Accessibility compliance (WCAG). |

### V2.5 — Platform (Target: Post-revenue, validated PMF)

| Feature | Rationale |
|---------|-----------|
| **Interactive quizzes between slides** | Moves from "passive video" to "active training." Differentiator. |
| **API access for programmatic generation** | Enables LMS/platform integrations. |
| **Multi-language narration (20+ languages)** | Global enterprise use case. |
| **AI slide generation from topic prompt** | Expands use case: "I don't have slides yet, just a topic." |
| **Advanced analytics (slide heatmaps, drop-off)** | Deeper insights for training managers. |
| **White label (subdomain, full branding removal)** | Agency and enterprise reseller use case. |

---

## Appendix A: Competitive Landscape Summary

| Competitor | Type | Key Differentiator | Price | Threat Level |
|-----------|------|-------------------|-------|-------------|
| DeckSpeaksAI | Direct | Voice personality capture, cloud drive integration | $49–$999/mo | Medium |
| SlideVoiceAI | Direct | 18-question voice profile, vision AI for slides | Undisclosed | Medium |
| Fliki | Direct (generalist) | 12M+ users, 2,000+ voices, massive scale | Freemium | Low (generalist) |
| Synthesia | Indirect (enterprise) | AI avatars, SCORM export, 50K+ companies | $29–enterprise | High (if they add PPT-first flow) |
| HeyGen | Indirect | AI avatars, G2 fastest growing 2025 | $29–enterprise | High |
| Murf AI | Indirect (voice only) | Professional AI voiceover studio | $19/mo+ | Low (no slide integration) |

**Moduvox's unique position:** Only tool combining PPTX → voice clone → narrated presentation → hosted player → viewer tracking → compliance reporting in a single pipeline targeting IT/HR training teams specifically.

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **PPTX** | Microsoft PowerPoint Open XML file format |
| **Speaker Notes** | Notes added to individual slides in PowerPoint, visible to presenter but not audience |
| **Voice Cloning** | AI technology that synthesizes speech mimicking a specific person's voice from a short sample |
| **TTS** | Text-to-Speech: converting written text into spoken audio |
| **SCORM** | Sharable Content Object Reference Model: standard for packaging e-learning content for LMS platforms |
| **xAPI** | Experience API: modern alternative to SCORM for tracking learning experiences |
| **LMS** | Learning Management System (e.g., Workday, SAP SuccessFactors, Moodle, Cornerstone) |
| **RLS** | Row Level Security: database-level access control that restricts which rows a user can read/write |
| **Smart Update** | Moduvox feature: re-upload revised PPTX → only changed slides get re-narrated |
| **Email Gate** | Requirement for viewers to enter name + email before accessing a presentation |
| **Gradio Space** | HuggingFace's hosting platform for ML demo applications |
| **VoxCPM2** | Open-source Chinese-English text-to-speech model with voice cloning and emotion control |
