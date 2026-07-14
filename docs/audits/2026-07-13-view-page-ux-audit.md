# UX Audit: View Page + ViewAudioBar

**Date:** 2026-07-13
**Files audited:**
- `frontend/app/view/[shareToken]/page.tsx`
- `frontend/components/view/ViewAudioBar.tsx`
- `frontend/components/view/ViewSidebar.tsx`
- `frontend/components/view/ViewSlide.tsx`
- `frontend/components/view/CombinedGateDialog.tsx`
- `frontend/components/view/EmailSentScreen.tsx`
- `frontend/components/shared/SlidePdfViewer.tsx`

---

## Critical

### C1. Audio `ensure` endpoint failure has zero user-visible feedback

**File:** `frontend/components/view/ViewAudioBar.tsx:121`
**Severity:** Critical

**What happens:** When the `/api/presentations/:id/audio/ensure` call fails (network error, 500, DNS failure, etc.), the error is swallowed by a `.catch()` that only logs to console. `resolvedUrl` stays `undefined`, Howl never initializes, and `ready` stays `false`. The user sees a spinning `Loader2` in the play button forever — until the 12-second fallback timer fires (see C2).

**How to reproduce:** Load a presentation whose audio hasn't been generated and whose ensure endpoint is unreachable or returns 500. Watch the play button spin indefinitely with no error message.

**Suggested fix:** Add a `resolveError` state variable. Display it in the audio bar UI identically to `loadError`. Do not let this fail silently.

---

### C2. 12-second fallback timer results in dead controls with no explanation

**File:** `frontend/components/view/ViewAudioBar.tsx:185`
**Severity:** Critical

**What happens:** A `setTimeout(() => setReady(true), 12000)` fires regardless of whether Howl ever loaded. After 12 seconds, the spinner disappears, all buttons look interactive, but every click handler guards with `if (!howl || howl.state() !== "loaded") return` — so everything is dead. The user sees what looks like a functional player that does nothing when clicked. The only clue is the `loadError` badge, which is tiny and only appears if `onloaderror` fired (which it doesn't if the `ensure` call itself failed — see C1).

**How to reproduce:** Trigger C1 scenario. Wait 12 seconds. Spinner vanishes. Controls do nothing. No error visible.

**Suggested fix:** Remove the fallback timer entirely or gate it behind a condition that shows a meaningful error state instead of silently enabling dead controls. If the timer is kept, set `ready(true)` only when there's an error message to display, so the user sees a retry button instead of dead controls.

---

### C3. Empty response from `ensure` endpoint leaves player in permanent limbo

**File:** `frontend/components/view/ViewAudioBar.tsx:118-119`
**Severity:** Critical

**What happens:** If the ensure endpoint returns `200 OK` but the JSON body has no `data.audioUrl` field, the condition `json.data?.audioUrl` is falsy and nothing happens. No error state, no retry, no UI feedback. `resolvedUrl` stays `undefined`. Same ultimate result as C1: spinner until 12-second fallback, then dead controls.

**How to reproduce:** Simulate an ensure endpoint that returns `{ "data": {} }`. Player hangs.

**Suggested fix:** Set an error state when the response is OK but contains no URL. The error should show in the audio bar, ideally with a retry button.

---

## High

### H1. Play → Pause transition gives false affordance before audio starts

**File:** `frontend/components/view/ViewAudioBar.tsx:297-305`
**Severity:** High

**What happens:** `togglePlay()` calls `howl.play()` and the button icon immediately switches to `Pause`. But the audio buffer may still be downloading/decoding. The user sees "Pause" and assumes audio is playing, but there's a 1–5 second (or longer) silence before Howl's `onplay` fires. During this gap, pressing the button again calls `howl.pause()` which may silently no-op because Howl isn't in a playing state yet.

**How to reproduce:** Load a presentation with a large audio file. Click Play. Button shows Pause immediately. Audio doesn't start for several seconds. Clicking Pause during this gap may not work.

**Suggested fix:** Introduce a `buffering` state. On play click, set `buffering = true` and show a loading/spinner icon until `onplay` fires, then transition to `Pause`. This gives honest feedback about what's actually happening.

---

### H2. `onloaderror` sets `ready=true` making controls appear functional but they aren't

**File:** `frontend/components/view/ViewAudioBar.tsx:144-155`
**Severity:** High

**What happens:** When Howl fires `onloaderror`, `setReady(true)` is called. This makes all controls look interactive (no disabled styling, no spinner). But every click handler returns early because `howl.state() !== "loaded"`. The `loadError` badge is small, positioned at the far right of the bar, and easily missed — especially on mobile or when the user is focused on the slide area.

**How to reproduce:** Load a presentation with a broken/404 audio URL. The spinner disappears after the error, all buttons are clickable but do nothing, and only a tiny red badge in the corner explains why.

**Suggested fix:** Keep `ready` as `false` when there's a `loadError`. Display the error badge prominently. Optionally, still show a disabled play button with a tooltip explaining the error, rather than hiding the spinner and pretending everything is fine.

---

### H3. "Refresh" (applyChanges) has no loading indicator

**File:** `frontend/app/view/[shareToken]/page.tsx:384-406`
**Severity:** High

**What happens:** When the user clicks "Refresh" on the "Changes detected" banner, `applyChanges` runs: it re-fetches view data, re-fetches slides, and bumps `audioRefreshKey` to force-remount the audio bar. All of this is silent. There's no spinner or visual feedback on the "Refresh" button or anywhere else in the UI. The user clicks and nothing seems to happen for a moment, then slides re-render. There's no way to know the system is working.

**How to reproduce:** Wait for the "Changes detected" banner to appear. Click "Refresh". No loading state appears on the button or anywhere in the UI.

**Suggested fix:** Add a loading state for `applyChanges`. Show a spinner on the "Refresh" button. Disable it during the operation. Consider adding a brief toast or status message like "Updating presentation…".

---

### H4. Title flickers from "Untitled" to real title

**File:** `frontend/app/view/[shareToken]/page.tsx:554`
**Severity:** High

**What happens:** When the page transitions to the `verified` state, the sidebar renders immediately with `viewDataRef.current?.title || "Untitled"`. The ref is populated asynchronously via the retry loop in `validateAndLoad` (line 283-306). For a brief moment — especially on slow connections or when the 1-second retry delay applies — the sidebar shows "Untitled", then jumps to the real title. This is a visual layout shift that draws the eye and creates a janky first impression.

**How to reproduce:** Load a presentation via a stored session token with throttled network. Watch the sidebar title jump from "Untitled" to the actual title.

**Suggested fix:** Use a `useState` for the title and pass it as a prop, initialized to `undefined`. Show a skeleton/shimmer placeholder in the sidebar when the title is still loading, instead of a placeholder string that will be replaced. Or conditionally render the affected section only after data arrives.

---

## Medium

### M1. "Generate slides" button: error text lingers during loading

**File:** `frontend/app/view/[shareToken]/page.tsx:570-591`
**Severity:** Medium

**What happens:** When slides fail with "Slides not available yet", the user sees the error message and a "Generate slides" button. On click, `fetchSlides` is called which calls `setSlidesError(null)` and `setSlidesLoading(true)`, so the error clears. But there are two subtle issues: (1) The `POST /convert` call before `fetchSlides` has no loading state of its own — if conversion is slow, the user waits on an enabled button that looks unresponsive. (2) If conversion takes time and `fetchSlides` is called immediately after, it may again return "Slides not available yet", re-showing the error instantly.

**How to reproduce:** Open a presentation that needs conversion. Click "Generate slides". If conversion is slow, the POST request has no progress indicator and fetchSlides may return the same error.

**Suggested fix:** Show a "Conversion requested — this may take a moment" state before calling `fetchSlides`. Add a delay or retry loop in the generate handler, giving the conversion time to complete before checking for slides again.

---

### M2. Partial slide failure is invisible

**File:** `frontend/app/view/[shareToken]/page.tsx:331-344`
**Severity:** Medium

**What happens:** `fetchSlides` only shows an error when *all* slides have no `pdfUrl`. If some slides have PDF URLs and some don't, the error is not set. The user sees a slideshow that can advance to a blank slide with no explanation of why that particular slide is missing.

**How to reproduce:** (Hypothetical — depends on server behavior) If the server returns slides 1-3 with PDFs and slides 4-5 without, navigating to slide 4 or 5 shows "Slide not available" (from `SlidePdfViewer.tsx:47`) but there's no indication that this is a transient error vs. permanent absence.

**Suggested fix:** Track per-slide load errors in `SlidePdfViewer` and propagate them upward via `onLoadError`. Consider showing a dismissible banner: "Some slides failed to load. [Retry]".

---

### M3. Sidebar slides section appears with layout shift

**File:** `frontend/app/view/[shareToken]/page.tsx:556` + `frontend/components/view/ViewSidebar.tsx:76`
**Severity:** Medium

**What happens:** `slideCount` is initially `0` (data not yet loaded), so the slides section is hidden (`slideCount > 0` check). When the data arrives, the slides section appears and the sidebar height increases, pushing the "Link" and "Session" sections down. This causes a visual jump in the sidebar.

**How to reproduce:** Load a presentation with a slow API. Watch the sidebar height increase when slide count data arrives, displacing everything below.

**Suggested fix:** Reserve space for the slides section with a skeleton/minimum height even when slide count is 0. Or use `visibility: hidden` + `height` reservation rather than conditional rendering.

---

### M4. Volume slider is inaccessible on touch devices

**File:** `frontend/components/view/ViewAudioBar.tsx:444-456`
**Severity:** Medium

**What happens:** The volume slider only appears on `onMouseEnter` / `onMouseLeave`. On touch devices, there is no hover. The mute button does toggle `showVolumeSlider` on click, but this requires a long-press or tap-and-hold discovery pattern — it's not discoverable.

**How to reproduce:** Open the page on a mobile device or tablet. Try to adjust volume. The slider never appears via hover. Clicking the mute icon only toggles `showVolumeSlider` (which requires the user to know about this undocumented behavior) and also mutes/unmutes simultaneously, creating a confusing interaction.

**Suggested fix:** Change the interaction to show the volume slider on click/tap of the volume icon, and only toggle mute on double-tap or via the mute action being separate from the show-slider action. Consider `onFocus`/`onBlur` as well. Always-visible slider on mobile widths is another option.

---

### M5. Mobile sidebar toggle overlaps slide content

**File:** `frontend/app/view/[shareToken]/page.tsx:543-552`
**Severity:** Medium

**What happens:** The floating "Show info" button is `fixed left-3 top-4 z-20`. On mobile, this positions it in the top-left corner of the viewport, overlapping the slide viewer area. If the slide has important content in its top-left quadrant, the button obscures it. The `top-4` also puts it below the navbar, which is outside the slide's containing element.

**How to reproduce:** Open on a mobile viewport. The info button overlays the top-left of the slide. Resize to mobile width in devtools.

**Suggested fix:** Position the button outside the slide area. Add padding to the slide container on mobile to avoid overlap. Consider a bottom-positioned floating button or integrate into a top app bar.

---

### M6. No feedback when presentation metadata fetch fails

**File:** `frontend/app/view/[shareToken]/page.tsx:283-306`
**Severity:** Medium

**What happens:** In `validateAndLoad`, after session verification succeeds, there's a retry loop (3 attempts with 1s delay) to fetch presentation metadata. If all 3 attempts fail, the loop exits silently. The user transitions to `verified` state anyway with `viewDataRef.current` still pointing to the initial value (if any) or `null`. The sidebar shows "Untitled" for the title, "—" for duration, 0 slides, etc. The audio bar has no `presentationId` so it can't call the ensure endpoint. The user is in the player with a broken sidebar and no audio.

**How to reproduce:** Make the `/api/view/:token?session=...` endpoint return 500 or be unreachable during the retry window. The user gets a functional-looking player with no data.

**Suggested fix:** Show a warning state when metadata fails to load after all retries. Provide a "Retry loading presentation info" action. Do not show a broken sidebar — show a simplified or error state instead.

---

## Low

### L1. Polling errors are completely silent

**File:** `frontend/app/view/[shareToken]/page.tsx:374-376`
**Severity:** Low

**What happens:** The 30-second polling interval silently catches all errors with a comment `// silent — polling errors should not disrupt the viewer`. While this is good for resilience, repeated failures would go completely unnoticed. The user might have stale version data without knowing.

**Suggested fix:** After N consecutive polling failures, show a subtle "Connection lost — updates paused" indicator. Clear it when the next poll succeeds.

---

### L2. Resend success state has no history

**File:** `frontend/components/view/EmailSentScreen.tsx:97`
**Severity:** Low

**What happens:** After clicking "Resend", the button shows "Sent!" for 5 seconds, then reverts to "Didn't receive it? Resend". There's no history of the action — if the user looks away for 6 seconds, they can't tell whether the resend happened.

**Suggested fix:** Add a persistent "Verification email sent at HH:MM" note below the button, or keep a "Sent!" indicator that doesn't disappear.

---

### L3. reCAPTCHA script loads for password-only presentations

**File:** `frontend/components/view/CombinedGateDialog.tsx:36-48`
**Severity:** Low

**What happens:** The reCAPTCHA script is injected on mount unconditionally, even when `emailGateEnabled` is `false` and only a password field is shown. This adds an unnecessary network request for password-gated presentations.

**Suggested fix:** Guard the script injection behind `if (emailGateEnabled)`.

---

### L4. `firstWatch` default `true` may incorrectly clamp seeking

**File:** `frontend/app/view/[shareToken]/page.tsx:113`
**Severity:** Low

**What happens:** `firstWatch` is initialized to `true`, which enables first-watch clamping (prevents seeking ahead of watched position). The server response may not include `first_watch_done` (e.g., if tracking isn't enabled), in which case `firstWatch` stays `true` and clamping remains active indefinitely. Returning viewers who should be able to freely seek will be incorrectly restricted.

**Suggested fix:** Default `firstWatch` to `false` (no clamping) and only enable it when the server explicitly signals that this is a first view. This is a safer default since it's opt-in to restriction.

---

### L5. Space bar prevents page scroll on non-input elements

**File:** `frontend/components/view/ViewAudioBar.tsx:268`
**Severity:** Low

**What happens:** Space toggles play/pause and calls `e.preventDefault()`. If the user isn't focused on any interactive element (which is typical when viewing a presentation), pressing space scrolls the page down (browser default) but this is prevented. The UX is correct for the player, but the keyboard shortcut is undocumented — a user who doesn't know about it may be confused that their scroll key is "broken".

**Suggested fix:** Add a brief keyboard shortcut hint on first load, or include a tooltip on the play button. This is a nice-to-have.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 3     |
| High     | 4     |
| Medium   | 6     |
| Low      | 5     |
| **Total**| **18**|

### Top 3 priorities

1. **C1 + C2 + C3 (audio failure states):** When audio fails to load or the ensure endpoint fails, the user gets no usable feedback and the player becomes a zombie UI. These three issues together create the worst experience in the entire view flow. Fix by introducing `resolveError` state, removing the silent fallback timer, and showing clear error + retry UI.

2. **H1 (play affordance):** The false "Pause" affordance during buffering is a confidence-shaking moment. Users who encounter this feel the player is broken or unpredictable. Fix by showing a buffering/loading state between click and `onplay`.

3. **H3 (invisible refresh):** When the user proactively clicks "Refresh" to apply changes, the total silence of the action makes them wonder if it worked. A loading indicator on the refresh button is a small change with high return in trust.
