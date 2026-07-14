# Audit Report: Remotion Viewer Scenes vs Actual Moduvox Viewer Page

**Date:** 2026-07-14  
**Auditor:** Parallel Agent (Explore)  
**Files Compared:**  
- Actual: `frontend/app/view/[shareToken]/page.tsx` (611 lines), `frontend/components/view/ViewSlide.tsx`, `ViewSidebar.tsx`, `ViewNavbar.tsx`, `ViewFooter.tsx`, `ViewAudioBar.tsx` (477 lines), `CombinedGateDialog.tsx`, `EmailSentScreen.tsx`, `VerifyErrorScreen.tsx`, `frontend/app/view/[shareToken]/verify/page.tsx`  
- Remotion: `remotion-demo/src/scenes/ViewerGate.tsx`, `ViewerVerification.tsx`, `ViewerPlayer.tsx`, `remotion-demo/src/components/AudioPlayer.tsx`

---

## Executive Summary

**Overall Match: ~18%** - The Remotion viewer scenes cover only 3 of 8 actual states. Critical interactive features (Howler.js audio, Radix Slider seek, slide-audio sync, version polling, gate caching) are completely missing.

---

## State Machine Gap - Only 3 of 8 States Implemented

| Actual State (`PageState` union) | Remotion Scene | Status |
|----------------------------------|----------------|--------|
| `loading` | None | ❌ **MISSING** |
| `gate` (4 modes: password/email/both/neither) | `ViewerGate.tsx` (email-only typing) | ⚠️ **PARTIAL** |
| `email_sent` (reCAPTCHA resend) | `ViewerVerification.tsx` (static UI) | ⚠️ **PARTIAL** |
| `verified` (full viewer) | `ViewerPlayer.tsx` (partial mock) | ⚠️ **PARTIAL** |
| `expired` | None | ❌ **MISSING** |
| `archived` | None | ❌ **MISSING** |
| `not_found` | None | ❌ **MISSING** |
| `verify_error` | None | ❌ **MISSING** |

---

## Critical Gaps (Priority: 🔴 FIX IMMEDIATELY)

### 1. CombinedGateDialog - Only Email-Only Mode, Missing 3 Other Modes + Security

| Actual (`CombinedGateDialog.tsx:237 lines`) | Remotion (`ViewerGate.tsx`) |
|---------------------------------------------|------------------------------|
| **4 unified modes**: password only / email gate only / both / neither | Email + name only |
| **reCAPTCHA v3**: Loads script, executes on submit, sends token | **MISSING** |
| **Consent checkbox**: "I confirm I am watching this myself..." | **MISSING** |
| **Password field**: Conditional (shown if `hasPassword`) | **MISSING** |
| **Submit button text**: Dynamic ("Send Verification Link" / "Watch Presentation") | Static "Send Verification Link" |
| **Info banner**: Conditional "We'll send a verification email..." | Static banner always shown |
| **Rate limiting**: 5 submissions/IP/hour/presentation (backend) | **MISSING** |
| **Form validation**: Zod schema `gateSchema` | None |

### 2. ViewAudioBar - 12 Interactive Features vs 3 Static Elements

| Actual (`ViewAudioBar.tsx:477 lines`) | Remotion (`ViewerPlayer.tsx` audio bar + `AudioPlayer.tsx`) |
|--------------------------------------|-------------------------------------------------------------|
| **Howler.js** for audio playback (`howl` ref) | No audio engine |
| **Skip ±10s** buttons (with first-watch clamp) | Skip buttons visual only |
| **Play/Pause** with `Loader2` spinner when loading | Play/Pause visual only |
| **Radix Slider** seek bar (click-to-seek, drag) | Progress fill only, no interaction |
| **Time display**: Clickable toggle elapsed ↔ remaining (`3:42 / 12:05` ↔ `-8:23 / 12:05`) | Static elapsed only |
| **Speed selector**: 0.75x / 1x / 1.25x / 1.5x / 2x (cycles) | Static "1x" badge |
| **Volume**: Icon + hover-reveal slider (`w-20`) | Volume icon only |
| **Version badge**: Green "Up to date" / Yellow "Changes detected — Refresh" | Static "Up to date" |
| **Keyboard shortcuts**: Space (play/pause), ←/→ (±10s) | **MISSING** |
| **First-watch clamp**: `maxWatchedRef` prevents seeking ahead | **MISSING** |
| **RAF time tracking**: `requestAnimationFrame` polling for smooth progress | Frame-based only |
| **Auto-advance on audio end**: Sends "completed" tracking event | **MISSING** |
| **Seek to slide**: `seekToSlideRef` exposed for sidebar/nav | **MISSING** |

### 3. Slide-Audio Synchronization - Core Feature Missing

| Actual (`page.tsx:200-280`) | Remotion |
|------------------------------|----------|
| **Server-computed `slide_timings`**: Array of `{slideNumber, startMs, endMs}` cumulative | **MISSING** |
| **`detectSlide(secs)`**: Matches current audio position to slide timing bucket | **MISSING** |
| **Auto-advance**: Current slide updates as audio plays | Frame-based auto-advance only |
| **`seekToSlide(slideNum)`**: Seeks audio to slide's `startMs` | **MISSING** |
| **First-watch clamp**: Sidebar/prev-next bypass clamp (`force=true`) | **MISSING** |
| **Past-end handling**: Shows last slide when audio finished | **MISSING** |

### 4. Slide Preloading - Actual Preloads Adjacent PDFs

| Actual (`page.tsx:180-195`) | Remotion |
|------------------------------|----------|
| On slide change: preloads N-1, N+1, N+2 via `fetch(url, { cache: 'force-cache' })` | **MISSING** |
| Enables instant react-pdf rendering on navigation | **MISSING** |

### 5. Version Polling & Change Detection

| Actual (`page.tsx:400-420`) | Remotion |
|------------------------------|----------|
| **30s interval** polls `/api/view/:shareToken?session=` | **MISSING** |
| Checks `audio_version` from response | **MISSING** |
| Shows yellow banner: "Changes detected — Refresh" | **MISSING** |
| "Refresh" re-fetches slides, remounts AudioBar via `audioRefreshKey` | **MISSING** |

### 6. Gate/Session Caching - localStorage Persistence

| Actual | Remotion |
|--------|----------|
| `localStorage['moduvox_gate_{shareToken}']` - caches gate submission | **MISSING** |
| `localStorage['moduvox_session_{shareToken}']` - caches session token | **MISSING** |
| On return: reads cache, validates via verify API, skips gate if valid | **MISSING** |

### 7. Mobile Experience - Sidebar Drawer + Floating Info Button

| Actual | Remotion |
|--------|----------|
| **Sidebar**: Hidden on mobile, slide-in drawer with `bg-black/40` overlay | Fixed sidebar |
| **Floating info button**: `fixed left-3 top-4 z-20` opens drawer | **MISSING** |
| **Drawer**: 300ms transition, close button | **MISSING** |
| **Gate settings re-check**: On `visibilitychange`, if owner disables gate → auto-advance | **MISSING** |

### 8. EmailSentScreen - Missing reCAPTCHA Resend

| Actual (`EmailSentScreen.tsx:162 lines`) | Remotion (`ViewerVerification.tsx`) |
|------------------------------------------|-------------------------------------|
| **Resend button**: Executes reCAPTCHA v3, calls `/gate` again | **MISSING** |
| **15-minute expiry** warning | Static text only |
| **Spinner** on resend | **MISSING** |

### 9. Verify Page - Server-Side Redirect with Magic Link

| Actual (`verify/page.tsx:108 lines` - **Server Component**) | Remotion |
|-------------------------------------------------------------|----------|
| Reads `vt` (sessionToken) from query params | N/A (client-only) |
| Validates: presentation exists, not expired, viewer exists, `verification_sent_at` < 15min | **MISSING** |
| Updates `email_verified: true`, `viewed_at: now()` | **MISSING** |
| **Redirects** via `redirect()` to `/view/{shareToken}?session={vt}` | **MISSING** |

### 10. Terminal States - Distinct UI for Each

| Actual State | Actual UI | Remotion |
|--------------|-----------|----------|
| `expired` | "This link has expired" + "Contact the owner for a new link" | **MISSING** |
| `archived` | "Presentation Archived" + "No longer available" | **MISSING** |
| `not_found` | "Presentation not found" + "Doesn't exist or was removed" | **MISSING** |
| `verify_error` | "Link expired or invalid" + "Contact the owner for a new link" (amber icon) | **MISSING** |
| `error.tsx` boundary | "Unable to load presentation" + "Try again" / "Go home" | **MISSING** |

---

## High Priority Gaps (Priority: 🟠 FIX SOON)

### 11. ViewSidebar - Clickable Slide List + Link/Session Info

| Actual (`ViewSidebar.tsx:197 lines`) | Remotion (`ViewerPlayer.tsx` sidebar) |
|--------------------------------------|----------------------------------------|
| **Clickable slides**: Button per slide, highlights current (`bg-zinc-100 font-medium`) | Visual list only |
| **Navigation**: Click → `goToSlide(sn)` → seeks audio + updates display | **MISSING** |
| **Link section**: Copy Link button, Expiration date ("Never" if none) | **MISSING** |
| **Session section**: "Saved across sessions", "First viewed" date/time | **MISSING** |
| **CTA**: "Made with Moduvox" link to homepage | Partial |
| **Legal links**: Security, Privacy, Terms | **MISSING** |
| **Scrollable**: `max-h-[200px] overflow-y-auto` | Basic overflow |

### 12. ViewNavbar / ViewFooter

| Actual | Remotion |
|--------|----------|
| ViewNavbar: White, h-16, Moduvox logo | Basic navbar |
| ViewFooter: Dark charcoal bg, copyright | Basic footer |

### 13. Accessibility - Actual Has ARIA, Keyboard, Touch Targets

| Actual | Remotion |
|--------|----------|
| ARIA live regions for progress announcements | **MISSING** |
| Keyboard navigation throughout | **MISSING** |
| Focus management in modals | **MISSING** |
| 44px+ touch targets on all interactive elements | **MISSING** |

---

## Files to Create/Modify in Remotion Demo

### New Scenes Needed (6 scenes)
1. `LoadingScene.tsx` - Skeleton loader (pulsing placeholders)
2. `CombinedGateDialog.tsx` - Unified gate with 4 modes, reCAPTCHA, consent
3. `EmailSentScreen.tsx` - Check inbox with reCAPTCHA resend
4. `ExpiredScene.tsx` - Expired link UI
5. `ArchivedScene.tsx` - Archived presentation UI
6. `NotFoundScene.tsx` - Not found UI
7. `VerifyErrorScene.tsx` - Invalid magic link UI

### Components to Rewrite
1. `ViewerGate.tsx` → `CombinedGateDialog.tsx` - Full 4-mode gate with reCAPTCHA v3
2. `ViewerVerification.tsx` → `EmailSentScreen.tsx` - Resend with reCAPTCHA
3. `ViewerPlayer.tsx` → Split into:
   - `ViewerLayout.tsx` - Navbar + Sidebar + Main + AudioBar + Footer
   - `ViewSidebar.tsx` - Clickable slides, link/session info, legal
   - `ViewAudioBar.tsx` - **Howler.js**, Radix Slider, speed selector, volume hover, version badge, keyboard shortcuts
4. `AudioPlayer.tsx` → Integrate into `ViewAudioBar.tsx` (actual doesn't have separate component)

### New Logic Needed
1. `useSlideAudioSync.ts` - Hook for `detectSlide`, `seekToSlide`, `slide_timings`
2. `useVersionPolling.ts` - 30s interval, `audio_version` check, refresh banner
3. `useGateCache.ts` - localStorage gate/session caching
4. `useMobileSidebar.ts` - Drawer state, floating button
5. `useVerification.ts` - Server-side verify redirect handling (Note: Remotion is client-only, will need simulation)

---

## Verification Checklist

After fixes, verify:
- [ ] 8 states render correctly: loading, gate (4 modes), email_sent, verified, expired, archived, not_found, verify_error
- [ ] CombinedGateDialog: password only / email only / both / neither modes work
- [ ] reCAPTCHA v3 executes on gate submit (simulated)
- [ ] Consent checkbox required
- [ ] EmailSentScreen: resend button with reCAPTCHA
- [ ] ViewAudioBar: Howler.js playback, click-to-seek slider, time toggle, 5 speeds, volume hover slider
- [ ] Version badge: green "Up to date" / yellow "Changes detected — Refresh"
- [ ] Slide-audio sync: auto-advance via `slide_timings`, `seekToSlide` for sidebar/nav
- [ ] First-watch clamp: can't seek ahead of `maxWatched`, bypassed by sidebar/nav
- [ ] Slide preloading: adjacent PDFs fetched on navigation
- [ ] Version polling: 30s interval, yellow refresh banner on `audio_version` change
- [ ] Gate/session caching: localStorage persistence across "reloads"
- [ ] Mobile: sidebar drawer with overlay, floating info button
- [ ] ViewSidebar: clickable slides, link copy, expiration, session info, legal links
- [ ] Terminal states: distinct UI for expired/archived/not_found/verify_error
- [ ] Accessibility: ARIA live, keyboard shortcuts (Space, ←/→), 44px touch targets