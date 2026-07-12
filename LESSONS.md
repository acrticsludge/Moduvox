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
