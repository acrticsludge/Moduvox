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
