## 2026-08-01: [Bug] Always-rendered `fixed inset-0` drawer wrapper swallowed all taps on mobile

**What happened:** On the slide editor, every button became unresponsive on screens below `lg`. Users couldn't tap anything: slides, the open-controls FAB, even page navigation.

**Root cause:** `SlideEditor.tsx` rendered `<div className="fixed inset-0 z-50 lg:hidden">` whenever slides existed — a full-viewport transparent hit-target. The children were inert when closed (backdrop `pointer-events-none`, panel `translate-y-full`), but the wrapper itself had default `pointer-events: auto`, so it sat at z-50 above everything and consumed all taps. The FAB that opens the panel was z-30, under the wrapper, so it could never even be reopened.

**Fix:** Added `pointer-events-none` to the wrapper when the panel is closed (`${showMobilePanel ? "" : "pointer-events-none"}`), mirroring the working pattern in the editor page drawer.

**Prevention:** Every always-rendered overlay/drawer wrapper must either be conditionally rendered or carry `pointer-events-none` when closed. Audit all `fixed inset-0` elements for the closed-state hit-test: if the wrapper is rendered but invisible, it still intercepts taps. Check children AND the wrapper itself.

## 2026-08-01: [Bug] Fullscreen tap-to-reveal: `stopPropagation` on a full-area overlay makes reveal one-way

**What happened:** "Tap to reveal" fullscreen controls worked the first time, but once controls were visible a second tap could never hide them — they stayed until exiting fullscreen.

**Root cause:** The overlay is `absolute inset-0` on top of the slide with `pointer-events-auto` when visible, and had `onClick={(e) => e.stopPropagation()}`. When visible, every tap lands on the overlay first; stopPropagation prevented the tap from reaching the viewer's toggle handler. A `closest("[data-fullscreen-controls]")` guard in the handler didn't fix it either — since the overlay covers the slide, the slide is never the hit target, so `closest()` always found the overlay. The slide and overlay are siblings; hit-testing picks the top sibling.

**Fix:** Keep the overlay `pointer-events-none` ALWAYS (toggle only `opacity`), and give only the interactive control buttons `pointer-events-auto` (gated on the visible state so invisible buttons aren't tappable on touch). Then slide taps pass through the overlay to the toggle handler; button taps are shielded by the `closest()` guard.

**Prevention:** For tap-to-reveal overlays, never make the overlay itself pointer-interactive. The overlay must be hit-transparent; only the controls inside it should be interactive. Gating `pointer-events-auto` on the revealed state also prevents accidental taps on invisible buttons on touch devices.

## 2026-08-01: [Bug] `!externalImageDescriptions` predicate never true — auto image parsing was dead code

**What happened:** The BatchImageFetcher that auto-described slide images on upload never fired; only manual per-slide retry worked. Users saw "only the first image parsed, rest fail until I click retry."

**Root cause:** Render predicate `!externalImageDescriptions` at `SlideEditor.tsx:2058` was always `false` because the parent initializes `imageDescriptions` to `{}` (a truthy object). Commit `f7a7fbe` changed a per-slide keyed check to a whole-map truthiness check; `!{} === false` permanently killed the fetch.

**Fix:** Replaced the zero-height BatchImageFetcher with an effect-driven parser in SlideEditor: `imageDescStatus` state machine + `runImageParsing()` useCallback. The trigger checks real "needs parsing" via `isSlideParsingComplete()` (per-slide completeness), not object truthiness.

**Prevention:** Never gate "should I fetch?" on `!someObject` when the object is state-initialized to `{}`. Gate on emptiness/coverage semantics (`Object.keys(x).length === 0` or a real completeness predicate).

## 2026-08-01: [Bug] Immediate persist wrote stale state — setState hasn't re-rendered yet

**What happened:** A new "persist immediately" callback (`onRequestPersist`) fired right after `onParsedImageKeysChange(savedKeys)` + `onImageDescriptionsChange(merged)` to close the 2s-debounce data-loss window — but the PATCH body contained the OLD (pre-upload) keys/descriptions.

**Root cause:** React state setters don't re-render synchronously. A useCallback captured during render still closes over the previous render's state, so calling `persistState()` immediately after a setState reads stale values. The fresh data was only saved by the later debounced auto-save (~2s) — the very window the flush was meant to close.

**Fix:** Thread the fresh data through the callback as an explicit payload: `onRequestPersist({ parsedImageKeys, imageDescriptions })`, and `persistState(fresh?)` overrides those fields with `fresh?.x ?? state`. Fresh values ride in the PATCH body regardless of re-render timing.

**Prevention:** When a callback must read values that were just set via setState, pass those values as arguments to the callback — never rely on the callback re-reading component state in the same tick.

## 2026-07-31: [Bug] Service-worker guard prevented workerSrc override — react-pdf sets truthy default first

**What happened:** Adding `if (!pdfjs.GlobalWorkerOptions.workerSrc)` as a guard before setting `workerSrc = "/pdf.worker.min.mjs"` in `prefetchAllSlideBlobs` silently prevented the override. react-pdf sets `workerSrc = 'pdf.worker.mjs'` (a truthy string) at import time, so the guard was always false.

**Root cause:** ES module imports are hoisted and evaluated before module body code. `import { pdfjs } from "react-pdf"` triggers react-pdf's module code which sets the default. By the time our guard check runs, `workerSrc` is already `'pdf.worker.mjs'` (truthy). The guard `if (!workerSrc)` never fires.

**Fix:** Removed the guard entirely. The workerSrc assignment must be unconditional because react-pdf's default is always set first and always needs overriding.

**Prevention:** When overriding a default that's already set by a dependency (especially one set at import time), never guard with a falsiness check. The dependency's default is already truthy. Either set unconditionally or check for the specific default value (`=== 'pdf.worker.mjs'`).

## 2026-07-31: [Bug] PDF worker 404 + editor_state corruption caused "Upload PPT" default on production

**What happened:** View page showed "Failed to load slide" for every slide with error "Failed to resolve module specifier 'pdf.worker.mjs'". Editor page showed "Upload PPT" instead of saved data. Both regressions deployed from yesterday's session.

**Root cause:** (1) Commit `9183938` deleted `public/pdf.worker.min.mjs` but did NOT apply the `new URL()` code changes it claimed to — leaving `SlidePdfViewer.tsx` pointing to a 404. Also, `prefetchAllSlideBlobs` never set `workerSrc` before calling `pdfjs.getDocument()`. (2) Commit `fa2411d` fixed a bug where `handleChangedSlidesChange` overwrote `editor_state` (deleting `storagePath`), but any presentation saved BEFORE the fix had permanently corrupted state with no `storagePath` — the editor gate `if (saved.storagePath)` failed and mode stayed "upload".

**Fix:** (1) Restored `public/pdf.worker.min.mjs` from `node_modules/pdfjs-dist/build/`. Added `workerSrc = "/pdf.worker.min.mjs"` with a guard in `prefetchAllSlideBlobs` before the first `getDocument()` call. (2) Added a recovery fallback in the editor page: if `storagePath` is missing but `p.slide_count > 0`, reconstruct the conventional R2 key (`{userId}/{presentationId}.pptx`) and enter editor mode — per-slide PDFs still exist in R2 and `pollForPdfs` doesn't depend on the storage path being correct.

**Prevention:** Never delete a static file without either applying the corresponding code changes OR verifying the code no longer references it. When changing PDF worker loading strategy, test BOTH the viewer (SlidePdfViewer) AND any other code paths that import pdfjs (prefetchAllSlideBlobs, etc.). When fixing state corruption bugs, consider data migration or recovery for existing rows.

## 2026-07-26: [Performance] Lighthouse score 25→target 50+ with JS bundle, preconnect, & image optimizations

**What happened:** Lighthouse audit showed Performance score 25 — TBT 5,850ms, unused JS 1,294 KiB, JS execution 7.6s. Browser extensions (AI Chat, Loom) inflated ~40% of the metrics but our own code was still 3.4s of main thread time.

**Root cause:** (1) GA's `beforeInteractive` blocked initial render. (2) `react-hot-toast` Toaster was in the initial bundle despite being rarely used on landing. (3) All landing page sections were eagerly imported (no dynamic imports for below-fold content). (4) No preconnect hints for 3rd party origins. (5) Sentry's BrowserTracing (~108 KiB) and Replay (~75 KiB) were in the client bundle by default. (6) `lucide-react` was fully bundled without package-level tree-shaking. (7) Logo images lacked explicit width/height.

**Fix:** GA → `afterInteractive`; Toaster → `dynamic({ssr:false})`; below-fold mockups → `dynamic()`; added `optimizePackageImports: ["lucide-react"]`; created `sentry.client.config.ts` excluding BrowserTracing + Replay with production-only init; added preconnect hints for 3 origins; added width/height to logo images.

**Prevention:** Run Lighthouse before shipping. Use `next/dynamic` for any component not visible above the fold. Configure Sentry client explicitly (default config includes heavy tracing/replay). Set preconnect hints for all 3rd party origins. Use `optimizePackageImports` for icon libraries.

## 2026-07-26: [Performance] API response compression via zlib in withApiHandler

**What happened:** All 44 JSON API routes had no compression. Responses went over the wire at full size, adding download latency for users.

**Root cause:** No compression was applied at the Route Handler level. Vercel's edge network may apply gzip/brotli for some responses, but the origin-to-edge link still sends full-size data, and local dev has no compression at all.

**Fix:** Added `compressResponse` to `withApiHandler` (the single choke point for all API routes). Uses Node.js `zlib.gzipSync` at level 6 for JSON responses ≥ 1KB. Skips small responses, non-JSON, error statuses, and already-compressed responses. Sets `Content-Encoding: gzip` and `Vary: Accept-Encoding`. Benchmark across 7 representative payloads: bandwidth reduced **92.7%** (100 KB → 7 KB), compression overhead adds **~376 μs per response** (≈0.4 ms — imperceptible to users).

**Prevention:** Any new API route handler that uses `withApiHandler` gets compression for free. Routes bypassing `withApiHandler` need explicit compression or a good reason not to use it.

## 2026-07-12: [Bug] LibreOffice produces PDF at unpredictable filename in Docker

**What happened:** `soffice --headless --convert-to pdf --outdir /tmp/convert input.pptx` reported success but the expected `/tmp/convert/input.pdf` didn't exist, causing "LibreOffice did not produce output PDF" errors.

**Root cause:** LibreOffice output filename behavior varies by version and platform. Some versions produce `input.pptx.pdf` (append &keep;.pdf) instead of `input.pdf` (replace extension). Additionally, `--outdir` is unreliable in some LO builds — output goes to the CWD instead.

**Fix:** (1) `cd` into the tmp directory before running soffice so output lands there even if `--outdir` is ignored. (2) Added `--norestore` to avoid LO recovery dialog. (3) After conversion, scan the output directory for any `.pdf` file instead of assuming the filename. (4) Use the discovered file regardless of name (`input.pdf` or `input.pptx.pdf`).

**Prevention:** Never assume LibreOffice output filename — always scan the output directory for PDFs after conversion. Always `cd` into the output directory as a fallback for `--outdir`. Pin the LibreOffice version in Docker if consistent naming is critical.

## 2026-07-12: [DX] Renaming route.ts to route.tsx requires deleting .next cache

**What happened:** Renaming an API route file from `.ts` to `.tsx` (to support JSX) caused a "SyntaxError: Invalid or unexpected token" runtime error in the running dev server. The error came from stale Turbopack output in `.next/`.

**Root cause:** Next.js Turbopack caches compiled output per file path. When the extension changes, the old compiled `.ts` output remains cached and the new `.tsx` path gets an incomplete compilation. The loader chain detects the `.tsx` but tries to process JSX through the `.ts` pipeline, producing invalid JavaScript.

**Fix:** Delete `.next/` directory and restart the dev server. The fresh compilation correctly handles the `.tsx` extension and JSX syntax.

**Prevention:** When renaming files (especially `.ts` ↔ `.tsx`), delete `.next/` cache before testing. Better yet: decide the extension upfront — if a file contains JSX, create it as `.tsx` from the start.

## 2026-07-10: [Bug] forwardRef + next/dynamic causes "Component is not a function" runtime error

**What happened:** Wrapping a dynamically-imported component in `forwardRef` caused a runtime error: "Component is not a function". The dynamic import (`next/dynamic` with named export) resolved fine, but React couldn't render the `forwardRef`-wrapped component.

**Root cause:** `next/dynamic` with a named export `.then(mod => mod.Component)` returns the raw `forwardRef` wrapper object, which some React/Next.js versions can't reconcile as a valid component in the dynamic import path.

**Fix:** Replaced `forwardRef` + `useImperativeHandle` with a simple ref object prop pattern: the parent creates `useRef<SeekToSlideFn | null>(null)` and passes it as `seekToSlideRef`. The child sets `.current` to a plain function on mount. Same effect, zero forwardRef complexity.

**Prevention:** Avoid `forwardRef` with `next/dynamic` named-export imports. Use ref object props instead — they're simpler and more portable.

## 2026-07-10: [Architecture] View page had no change detection — stale audio after edit page regen

**What happened:** When the edit page regenerated audio, the view page (already open) kept playing the old combined.wav indefinitely. Viewers would hear stale content with no indication anything changed.

**Root cause:** Three problems stacked: (1) the view page fetched all data once on mount with no polling, (2) no version marker existed to detect that audio was regenerated, (3) the ensure endpoint served existing combined.wav without checking freshness vs per-slide WAVs.

**Fix:** Added `audio_version INTEGER DEFAULT 0` to presentations table + `increment_audio_version` RPC. The slide generation route bumps this on every regen. The view API returns it. The view page polls every 30s and shows a banner ("This presentation has been updated — Refresh to apply") when it changes. Clicking "Refresh" re-fetches slides and forces audio remount via a React key.

**Prevention:** Any dual-context feature (edit + view) needs a version-based change detection mechanism. Ref-based state (viewDataRef) is invisible to React renders — use state for reactive UI and refs only for values that don't affect rendering.

## 2026-07-10: [Security] Daily email cap missing on gate route — Resend abuse vector

**What happened:** The gate route had no per-presentation daily email cap. An attacker could submit different email addresses repeatedly and drain Resend credits.

**Root cause:** No counting of recent verification_sent_at records before sending magic link email.

**Fix:** Added DB-backed daily cap: 20 `verification_sent_at` rows per presentation per 24h before returning 429. Also added viewer record cleanup on email failure instead of leaving orphaned unverified rows.

**Prevention:** Any endpoint that sends emails on user-triggered actions needs per-resource daily caps, not just per-IP rate limits.

## 2026-07-10: [Bug] Magic link verification path broken by RLS — "Link expired" for every click

**What happened:** The server component at `/view/[shareToken]/verify/page.tsx` used `createClient()` (anon key), but the RLS policy only allows the presentation owner to SELECT from `viewers`. Anonymous magic link clicks returned 0 rows → users always saw "Link expired or invalid".

**Root cause:** The verify path was migrated from RLS-blocked `createClient()` to `createAdminClient()` in the API route (`verify/route.ts`) but the server component path (the actual URL in the email) was never updated.

**Fix:** Changed `verify/page.tsx` to use `createAdminClient()` which bypasses RLS (safe because session_token is the bearer auth, not Supabase Auth).

**Prevention:** When switching public endpoints from regular client to admin client, audit ALL paths that handle the same functionality — server components, API routes, and edge functions. Magic link URLs go to pages, not API routes.

## 2026-07-10: [Bug] Regen flow — 4 bugs caused stale audio, stacked modals, and lost narration

**What happened:** Audio regen had 4 bugs: stacked modals, stale combined.wav never invalidated, Gemini re-ran on voice-only changes (overwriting narration), and stale React closure read the wrong narration text for TTS.

**Root cause:** (1) All modals used `fixed inset-0 z-50` with no isolation — stacked overlays. (2) `combined.wav` cached permanently in R2, never deleted after per-slide regen. (3) `handleGenerate` always called Gemini even for voice-only changes. (4) `generateNarrations` set state asynchronously but `handleGenerate` read `narrations` from stale closure immediately after.

**Fix:** (1) Single 3-step modal (review → generating → complete). (2) Delete `combined.wav` from R2 after each per-slide upload. (3) `reason` parameter on `handleGenerate` — `'voice_changed'` skips Gemini entirely. (4) `generateNarrations` returns the new narration map directly — use return value instead of reading from state.

**Prevention:** Always check for stale React closures when async state updates precede reads. Cache invalidation must happen at every write point, not just at the entry point. Voice and content are independent concerns — don't regen content on voice changes.

## 2026-07-10: [Performance] WAV duration downloaded full files instead of headers

**What happened:** `getAllSlideDurations` downloaded every per-slide WAV file completely (~2MB each × 15 slides = ~30MB per view page load) just to read the 44-byte WAV header for duration.

**Root cause:** Naive implementation used `downloadFileAsBuffer` which fetches the entire R2 object.

**Fix:** Use `Range: bytes=0-99` HTTP header to fetch only the first 100 bytes. WAV duration is computed from header fields (sample rate, channels, bit depth, data chunk size). ~1.5KB total instead of ~30MB.

**Prevention:** For metadata extraction from binary files, use Range requests. Never download the whole file to read the header.
