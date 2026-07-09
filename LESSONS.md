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
