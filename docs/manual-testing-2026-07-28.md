# Manual Testing Guide — All Fixes (Issues #3–#19 + New + Security)

**Branch:** `main` (merged)  
**Last commit:** `7ef617b`  
**Prerequisites:** Local dev server running (`npm run dev` in `frontend/`), Supabase local or prod, a test account

---

## How to Use This Guide

Each test has:
1. **Setup** — what you need before starting
2. **Steps** — numbered actions to perform
3. **Expected result** — what should happen
4. **Fail condition** — what to look for if it's broken

---

## Issue #3 — Require Voice Selection Before Generate

**What changed:** Guard prevents audio generation when no voice is selected. Button is disabled. Toast shown on attempt.

### Test 3.1: Generate Audio disabled when no voice

1. Open a presentation in the editor
2. Ensure **no voice** is selected in the voice dropdown
3. Look at the **"Generate Audio"** button
4. **Expected:** Button is greyed out / disabled
5. Click it anyway
6. **Expected:** Nothing happens (button is disabled)
7. **Fail:** Button is clickable and tries to generate

### Test 3.2: Toast on regenerate without voice

1. With no voice selected, click **"Regenerate"** (or open the regen modal)
2. Try to confirm regeneration
3. **Expected:** Toast appears: *"Select a voice before generating audio."*
4. **Fail:** Generation proceeds without a voice

### Test 3.3: Dead prop removed

1. Open the editor with a presentation
2. **Expected:** No TypeScript errors, no console warnings about `voiceSelected`
3. **Fail:** Console shows *"React does not recognize the `voiceSelected` prop"*

---

## Issue #5 — Preset Gender Lock

**What changed:** Preset voices have locked genders. Server rejects gender mismatch. Custom voices can pick any gender.

### Test 5.1: Preset gender is locked

1. Go to **Voices** page → **Add Voice**
2. Select a built-in preset (e.g., "Calm Female")
3. Look at the gender selector
4. **Expected:** Gender shows as a **read-only badge** (not toggle buttons)
5. **Fail:** Gender toggle buttons are interactive

### Test 5.2: Custom voice allows gender change

1. Select **"Clone Voice"** or **"Custom"** mode
2. Look at the gender selector
3. **Expected:** Gender shows as **toggle buttons** (Male / Female / Neutral)
4. Click a different gender
5. **Expected:** Gender changes

### Test 5.3: Server rejects preset gender mismatch

1. Using browser DevTools, send a direct API request:
   ```
   POST /api/voices
   Body: { "name": "Hack", "preset_id": "calm-female", "gender": "male" }
   ```
2. **Expected:** Response status **422** with error about gender mismatch
3. **Fail:** Voice is created with wrong gender

### Test 5.4: Preset gender resets on deselect

1. Select a preset (gender becomes locked to e.g. "female")
2. Deselect the preset (click the currently-selected preset again or clear)
3. Switch to custom mode
4. **Expected:** Gender is empty/neutral (not still "female")
5. **Fail:** Gender still shows the old preset's gender

---

## Issue #6 — Preview on Voice Create/Delete

**What changed:** Preview audio is auto-generated when a voice is created. Preview is deleted when voice is deleted.

### Test 6.1: Preview auto-generated on voice create

1. Go to **Voices** page
2. Create a new voice (clone or custom)
3. Wait for the voice to appear in the list
4. Click the **play button** on the voice card
5. **Expected:** Audio plays (preview was generated in background after creation)
6. **Fail:** Play button shows "generating" forever or errors

### Test 6.2: Preview deleted on voice delete

1. Note a voice's preview works (play it)
2. Delete the voice
3. Go to the **Create Presentation** page → voice selector
4. **Expected:** The deleted voice is not in the list
5. **Fail:** Voice still appears or play button tries to load orphaned preview

### Test 6.3: Delete-while-generating race

1. Create a voice
2. Immediately delete it while preview is still generating (within 2-3 seconds)
3. **Expected:** No orphaned files in R2. Voice is cleanly removed.
4. **Fail:** Error toast about failed cleanup

---

## Issue #7 — Upload Error Handling

**What changed:** XHR error/timeout handlers show toasts. Server rejects >100MB files. Warning at 50MB. Retry button on error state.

### Test 7.1: Upload timeout shows error

1. Open a presentation editor
2. Upload a very large file (or simulate slow connection via DevTools → Network → throttling)
3. Let the upload time out (2 min)
4. **Expected:** Error message: *"Upload timed out. Try a smaller file or check your connection."*
5. **Fail:** Silent failure, no error shown

### Test 7.2: Upload network error shown

1. During upload, disconnect network (DevTools → Network → Offline)
2. **Expected:** Error message: *"Upload failed. Check your connection and try again."*
3. **Fail:** Silent failure

### Test 7.3: File >100MB rejected

1. Prepare a PPTX file larger than 100MB
2. Upload it
3. **Expected:** Error message about file being too large
4. **Fail:** File starts uploading
5. **Note:** For testing, you can modify the limit temporarily in `confirm/route.ts` to 1MB

### Test 7.4: Warning at 50MB+

1. Prepare a PPTX file between 50MB and 100MB
2. Upload it
3. **Expected:** Toast or banner: *"Large file — may take longer to process"*
4. **Fail:** No warning shown

### Test 7.5: Retry button on error

1. Force an upload error (e.g., disconnect network)
2. **Expected:** Error screen with a **Retry** button (circular arrow icon)
3. Click **Retry**
4. **Expected:** Upload restarts
5. **Fail:** Error screen has no way to recover

### Test 7.6: Empty file rejected (0 bytes)

1. Create an empty file named `empty.pptx` (0 bytes)
2. Try to upload it
3. **Expected:** Error: *"File is empty"* or upload rejected
4. **Fail:** 0-byte file is accepted

### Test 7.7: HEAD request failure is fatal

1. (Requires modifying network) Block HEAD requests to R2
2. Upload a file
3. **Expected:** Error: *"Could not verify file size"*
4. **Fail:** Upload silently proceeds without size verification

---

## Issue #8 — Parallel VoxCpm

**What changed:** Audio generation runs in parallel batches (3 at a time) with progress callback. All-or-nothing semantics.

### Test 8.1: Parallel generation works

1. Open a presentation with 6+ slides with narration
2. Click **"Generate Audio"**
3. **Expected:** Slides generate in batches of 3. Progress bar updates.
4. **Fail:** Slides generate one at a time (sequential)

### Test 8.2: Progress shows during generation

1. Generate audio for multiple slides
2. **Expected:** Progress indicator shows: *"Slide 3 of 6 — Slide Title"*
3. **Fail:** No progress shown, or jumps from 0 to done

### Test 8.3: One failure cancels the batch

1. If one slide fails (e.g., network error), the whole batch stops
2. **Expected:** Error message shown, remaining slides not attempted
3. **Fail:** Some slides succeed despite batch failure

### Test 8.4: handleGenerate errors surface

1. In `handleGenerate` (regenerate flow), trigger a failure
2. **Expected:** Red error state / toast shown
3. **Fail:** Error silently swallowed, UI shows success

---

## Issue #9 — Image Description Formatting

**What changed:** Image descriptions are post-processed to remove AI prefixes and enforce consistent format.

### Test 9.1: Description formatting works

1. View a presentation with images
2. Go to the **Images** tab for a slide
3. **Expected:** Descriptions look like: *"Chart: Revenue growth over 2024. Key data shows 23% increase."*
4. **Fail:** Descriptions start with *"Here is a..."*, *"This image shows..."*, or *"The image depicts..."*

### Test 9.2: Format validation catch non-structured output

1. If AI outputs a description without `[Visual type]:` prefix
2. **Expected:** `"Image: "` is prepended automatically
3. **Fail:** Unstructured description stored as-is

---

## Issue #10 — Image Parsing Validation

**What changed:** Images are validated before sending to AI: mimeType check (PNG/JPEG/WebP), size check (max 5MB), EMF/WMF rejected.

### Test 10.1: Unsupported formats rejected

1. Upload a PPTX containing GIF or BMP images
2. Open the Images tab
3. **Expected:** Those images show: *"Unsupported image format: image/gif"*
4. **Fail:** All images show as "Analyzing..." or error

### Test 10.2: Large images rejected

1. Upload a PPTX with images >5MB (after decoding)
2. **Expected:** Those images show: *"Image too large (X.XMB). Maximum is 5MB."*
3. **Fail:** Images are sent to AI and may cause errors

### Test 10.3: EMF/WMF vector images skipped

1. Upload a PPTX with embedded EMF or WMF vector graphics
2. **Expected:** Those images are silently skipped (not sent to AI)
3. **Fail:** They appear as PNG and produce garbage descriptions

### Test 10.4: Corrupt base64 detected

1. Modify a base64 image string to be invalid
2. **Expected:** Validation error, image not sent to AI
3. **Fail:** Invalid data forwarded to AI provider (causes 500)

### Test 10.5: Total image cap (20 images)

1. Upload a PPTX with 25+ images across all slides
2. **Expected:** Error: too many images (max 20)
3. **Fail:** All images attempted, causing timeout

### Test 10.6: Per-image retry reloads everything

1. Some images fail
2. Click **"Retry"** on a failed image
3. **Expected:** **All** images reload for that slide (current behaviour — noted limitation)

---

## Issue #11 — Content Change Audio Staleness

**What changed:** Narrations always use the current editor state. No silent Gemini overwrite. "Re-generate AI Narrations" button added.

### Test 11.1: Manual narration edits respected

1. Edit narration text in the editor
2. Click **"Generate Audio"**
3. **Expected:** Audio uses YOUR edited text, not the original AI text
4. **Fail:** Audio uses the original AI-generated text

### Test 11.2: Re-generate AI Narrations button

1. Look at the editor toolbar for a button: *"Re-generate AI Narrations"*
2. Click it
3. **Expected:** Gemini regenerates narration text. Loading state shown.
4. **Fail:** No button exists, or nothing happens

### Test 11.3: Button disabled states

1. When narration is currently generating
2. **Expected:** Button is disabled / shows spinner
3. **Fail:** Can click while generation is in progress

---

## Issue #12 — Voice Change UI Consistency

**What changed:** Voice change detection works correctly. Banner shows descriptive message. Snapshot taken at start of generation.

### Test 12.1: Voice change banner shows message

1. Generate audio with voice A
2. Switch to voice B
3. **Expected:** Amber banner appears with text: *"Voice changed from "Voice A" to "Voice B". Regenerate audio to apply."*
4. **Fail:** Banner appears but has **empty text** (was the bug)

### Test 12.2: Description change detected

1. Generate audio
2. Change the voice description
3. **Expected:** Banner: *"Voice description changed. Regenerate audio to apply."*
4. **Fail:** No banner shown

### Test 12.3: Ultimate mode change detected

1. Generate audio with ultimate mode off
2. Toggle ultimate mode on
3. **Expected:** Banner: *"Ultimate clone mode changed. Regenerate audio to apply."*
4. **Fail:** No banner shown

### Test 12.4: Banner clears after regeneration

1. See the voice change banner
2. Click **"Regenerate"** or **"Generate Audio"**
3. After generation completes
4. **Expected:** Banner is gone
5. **Fail:** Banner persists

### Test 12.5: Mid-generation voice changes ignored

1. Start generating audio (with 3+ slides so it takes time)
2. While generation is in progress, switch the voice in the dropdown
3. Wait for generation to complete
4. **Expected:** The generated audio uses the **original voice**, not the one you switched to mid-way
5. **Fail:** Audio uses the mid-switch voice (snapshot was taken wrong)

---

## Issue #13 — Viewer Slide Sync

**What changed:** `timeToSlide()` with even-distribution fallback. `seekToSlide()` updates maxWatchedRef. Error logging.

### Test 13.1: Audio syncs with slides

1. Open a **View** link for a presentation with audio
2. Play the audio
3. **Expected:** Slides advance in sync with audio (current slide highlights)
4. **Fail:** Slides don't advance / advance at wrong time

### Test 13.2: Fallback when no slide timings

1. View a presentation that was generated before the fix (no per-slide durations)
2. Play the audio
3. **Expected:** Slides still advance (using even-distribution fallback — each slide gets equal time)
4. **Fail:** Slides stay on slide 1 the whole time

### Test 13.3: Seek via sidebar updates maxWatched

1. Listen to a presentation up to slide 3
2. Use the sidebar to skip to slide 5 (past what you've watched)
3. **Expected:** Slide 5 plays. Arrow key forward/backward works correctly.
4. **Fail:** After sidebar seek, arrow keys snap back to slide 3 (stale maxWatchedRef)

### Test 13.4: Seek via progress bar works

1. Click on the audio progress bar at a later position
2. **Expected:** Slide changes to match the new time position
3. **Fail:** Slide stays on current slide

---

## Issue #14 — Fullscreen Mode

**What changed:** Editor + viewer fullscreen with navigation overlays. Audio bar visible on hover in viewer.

### Test 14.1: Editor fullscreen

1. Open the presentation editor
2. Click the **fullscreen button** (expand icon on the slide viewer)
3. **Expected:** Slide enlarges to fill screen. Sidebar + nav hidden.
4. **Fail:** Only the slide expands but panels remain visible

### Test 14.2: Editor fullscreen navigation

1. While in editor fullscreen, move mouse to left/right edges
2. **Expected:** Navigation arrows appear on hover for prev/next slide
3. **Fail:** No navigation overlay

### Test 14.3: Editor fullscreen exit

1. Press **Esc** or click the **exit fullscreen** button
2. **Expected:** Returns to normal view. Sidebar + panels reappear.
3. **Fail:** Stuck in fullscreen or layout breaks

### Test 14.4: Viewer fullscreen button

1. Open a **View** link
2. Hover over the slide
3. **Expected:** Fullscreen button appears (top-right of slide)
4. Click it
5. **Expected:** Slide enlarges to fullscreen. Sidebar gone.
6. **Fail:** No fullscreen button

### Test 14.5: Viewer fullscreen audio bar on hover

1. In viewer fullscreen, look at the bottom of the screen
2. **Expected:** Audio player bar is initially **hidden** (opacity-0)
3. Move mouse to bottom of the screen
4. **Expected:** Audio player bar **fades in** on hover (opacity-100)
5. Click play/pause/seek
6. **Expected:** Audio controls work
7. **Fail:** Audio bar is completely invisible, or always visible covering content

### Test 14.6: Viewer fullscreen navigation overlay

1. In viewer fullscreen, hover on left/right edges
2. **Expected:** Prev/next arrows + slide counter appear
3. Click arrows
4. **Expected:** Slides change
5. **Fail:** No navigation, or navigation is always visible

---

## Issue #15 — Share Access UX

**What changed:** Public/Restricted toggle hides email gate and password sections for Public. Confirmation dialog when clearing password.

### Test 15.1: Public toggle hides restricted sections

1. Open **Share** settings for a presentation
2. Click **"Public"** toggle
3. **Expected:** Email gate toggle and password section **disappear**
4. **Fail:** They remain visible and editable

### Test 15.2: Restricted toggle shows sections again

1. Click **"Restricted"** toggle
2. **Expected:** Email gate toggle and password section **reappear**
3. **Fail:** Still hidden

### Test 15.3: Confirmation dialog when clearing password

1. Set a password (Restricted mode)
2. Click **"Public"**
3. **Expected:** Dialog appears: *"This will remove password protection. Anyone with the link can view."*
4. Click **Cancel**
5. **Expected:** Stays on Restricted mode with password intact
6. Click **Public** again, then **Confirm**
7. **Expected:** Switches to Public, password cleared
8. **Fail:** Password clears silently without confirmation

---

## Issue #17 — Recorder Voice Clone Format

**What changed:** Client-side WebM→WAV conversion. Sample rate resampling to 16kHz. Short recording validation. Safari MIME type support.

### Test 17.1: Recording converts to WAV

1. Go to **Voices** → **Add Voice** → **Record**
2. Record a short sample (3-5 seconds)
3. **Expected:** The recording is converted from WebM/Opus to WAV format
4. **Fail:** Upload fails with format error / Gradio rejects it

### Test 17.2: Sample rate resampled to 16kHz

1. Record a sample
2. **Expected:** The WAV file has sample rate **16000 Hz** (check in browser DevTools → Network → inspect upload)
3. **Fail:** Uses the device's native sample rate (e.g., 48000 Hz)

### Test 17.3: Short recording rejected (<2 seconds)

1. Record for less than 2 seconds and stop
2. **Expected:** Toast: *"Recording too short — say more and try again"*
3. **Fail:** Short recording is uploaded (will fail silently at VoxCpm)

### Test 17.4: Safari compatibility (if available)

1. Open on Safari iOS/Mac
2. Go to **Record** voice
3. **Expected:** `MediaRecorder` starts successfully (uses `audio/mp4` fallback)
4. **Fail:** `MediaRecorder` constructor throws, recording doesn't start

---

## Issue #18 — Combined Audio Race Condition

**What changed:** Rebuild endpoint is called after all slides generate. Write-to-temp then rename pattern. Errors surface to user.

### Test 18.1: Full audio plays after generation

1. Generate audio for all slides
2. **Expected:** After generation completes, combined audio plays from start to finish without cutting off at 2 seconds
3. **Fail:** Audio plays for ~2 seconds then stops (old race condition)

### Test 18.2: Rebuild on partial regeneration

1. Generate audio for all slides
2. Change narration on slide 3
3. Regenerate just slide 3
4. **Expected:** Combined audio includes the new slide 3. Full playback works.
5. **Fail:** Slide 3 still has old audio, or audio breaks

### Test 18.3: Rebuild failure shows error

1. (Requires simulating a rebuild failure)
2. If rebuild endpoint fails
3. **Expected:** Error toast or red state shown in the UI
4. **Fail:** UI shows "Success" but audio is broken

### Test 18.4: Delete-before-write resilience

1. If the rebuild write fails mid-way
2. **Expected:** The old combined.wav is NOT deleted until the new one is confirmed written
3. **Fail:** Both old and new audio are lost (silent presentation)

---

## Issue #19 — Preview Audio in Voice Selector

**What changed:** Per-voice play buttons in the dropdown. Lazy generation on first click. Auto-hide after playback.

### Test 19.1: Play button in voice selector

1. Go to **Create Presentation** → select voice
2. Open the voice dropdown
3. **Expected:** Each voice has a **play button** (speaker icon)
4. **Fail:** No play buttons

### Test 19.2: Preview generates on first click

1. Click a play button on a voice you haven't previewed yet
2. **Expected:** Loading spinner appears, then audio plays
3. **Fail:** Nothing happens, or error

### Test 19.3: Toggle play/stop on cached preview

1. Click play on a voice you already previewed (cached)
2. **Expected:** Audio plays immediately (no loading)
3. Click play again (while playing)
4. **Expected:** Audio stops
5. **Fail:** Audio restarts from beginning, or button doesn't respond

### Test 19.4: Auto-hide after playback

1. Click play on a preview
2. Let it finish playing (or wait for natural end)
3. **Expected:** Audio player disappears after playback completes
4. **Fail:** Audio player stays visible forever

### Test 19.5: Spam protection (rapid clicks)

1. Click play on voice A
2. While it's loading, quickly click play on voice B
3. **Expected:** Only one preview generates at a time. Toast: *"A preview is already generating"* (or second click ignored)
4. **Fail:** Both generate simultaneously, causing API spam

### Test 19.6: Tooltip on uncached voices

1. Hover over a play button for an uncached voice (never played)
2. **Expected:** Tooltip: *"Generate preview"* (or similar)
3. **Fail:** No tooltip

---

## New Issue A — Slide Delete Cleanup

**What changed:** When slides are deleted, orphaned audio files + editor state are cleaned up. Combined audio invalidated.

### Test A.1: Deleted slide audio doesn't play

1. Open a presentation with audio
2. Delete a slide (if deletion UI exists) or modify slides
3. **Expected:** The deleted slide's audio is removed from the combined mix
4. **Fail:** Deleted slide's audio still plays on the view page

### Test A.2: Editor state cleaned up

1. Delete a slide
2. Check the stored `editor_state` (via DB or re-opening the editor)
3. **Expected:** No references to the deleted slide remain (no narrations, no image descriptions)
4. **Fail:** Old slide data persists in editor_state

### Test A.3: Audio version bumped

1. Note the current `audio_version` for the presentation
2. Delete a slide
3. **Expected:** `audio_version` is incremented
4. **Fail:** `audio_version` unchanged — viewer won't know to re-fetch

---

## New Issue B — Duration Data Persistence

**What changed:** `total_duration_ms` and `slide_timings` recalculated after slide changes.

### Test B.1: Total duration recalculated

1. Note the total duration of the audio
2. Delete a slide (or trigger cleanup)
3. **Expected:** Total duration decreases (minus the deleted slide's duration)
4. **Fail:** Total duration stays the same (old value persists)

### Test B.2: Slide timings match remaining slides

1. After deleting a slide, view the presentation
2. **Expected:** The slide timing array only covers remaining slides (no gaps or stale entries)
3. **Fail:** Slide 3's timing still points to old slide 4's data

---

## Security Fixes — Verification

### Test S.1: auto-confirm requires admin key

1. Send a request to `POST /api/auth/auto-confirm` with a known userId:
   ```bash
   curl -X POST http://localhost:3000/api/auth/auto-confirm \
     -H "Content-Type: application/json" \
     -d '{"userId":"some-uuid"}'
   ```
2. **Expected:** Response 403 Forbidden
3. **Fail:** 200 OK (email confirmed without authorization)
4. Repeat with the admin key:
   ```bash
   curl -X POST http://localhost:3000/api/auth/auto-confirm \
     -H "Content-Type: application/json" \
     -H "x-admin-key: your-admin-api-key" \
     -d '{"userId":"some-uuid"}'
   ```
5. **Expected:** 200 OK with `{ data: { confirmed: true } }`

### Test S.2: send-welcome requires auth

1. Send a request to `POST /api/auth/send-welcome`:
   ```bash
   curl -X POST http://localhost:3000/api/auth/send-welcome \
     -H "Content-Type: application/json" \
     -d '{"userId":"some-uuid"}'
   ```
2. **Expected:** Response 401 Unauthorized
3. **Fail:** Welcome email sent without session

### Test S.3: R2 signed-url rejects cross-user paths

1. Get a valid session cookie
2. Request `GET /api/voices/signed-url?path=../other-user-id/audio/file.wav`
3. **Expected:** Response 400 or 403 (invalid path / access denied)
4. **Fail:** Signed URL returned for path outside user's scope

### Test S.4: reCAPTCHA fails closed when key missing

1. Temporarily remove `RECAPTCHA_SECRET_KEY` from `.env.local`
2. Restart the server
3. Submit a feedback form or gate
4. **Expected:** Error: *"Security check unavailable"* (503) — not silent pass
5. **Fail:** Form submits without captcha verification
6. **Restore** the env var after testing

### Test S.5: Voice DELETE checks user ownership

1. Get a valid session for User A
2. Send `DELETE /api/voices/{voice-id-owned-by-user-b}`
3. **Expected:** Response 404 (voice not found) or 403 (forbidden)
4. **Fail:** Voice owned by User B is deleted by User A

### Test S.6: Key fallback removed (Gemini/NIM)

1. Corrupt a stored encrypted key in the DB (set `gemini_api_key` to `"garbage"`)
2. Call `GET /api/user/gemini-key` with the user's session
3. **Expected:** Response: `{ data: { geminiApiKey: null } }` — NOT the plaintext `"garbage"`
4. **Fail:** Corrupted key returned as-is

### Test S.7: Rate limiter uses DB (across instances)

1. Rapidly call an endpoint protected by the rate limiter (e.g., waitlist) 10+ times
2. **Expected:** After the limit is hit, subsequent requests return 429
3. This should persist across server restarts (DB-backed, not in-memory)
4. **Fail:** Rate limit resets on server restart

### Test S.8: UUID validation on route params

1. Call `DELETE /api/voices/not-a-uuid`
2. **Expected:** Response 400 with error about invalid UUID
3. **Fail:** Query runs against DB with non-UUID string

### Test S.9: Presigned URL expires in 5 minutes

1. Inspect the presigned URL returned by `/api/presentations/{id}/upload`
2. **Expected:** The URL's `X-Amz-Expires` parameter is `300` (5 min, not 3600)
3. **Fail:** Expiry is 3600 seconds (1 hour)

---

## Viewer Fullscreen Fix

### Test V.1: Audio bar visible on hover in fullscreen

1. Open a viewer link
2. Click fullscreen button
3. **Expected:** Slide fills screen. Audio bar is hidden.
4. Move mouse to bottom of screen
5. **Expected:** Audio bar slides up / fades in on hover
6. Click play/pause
7. **Expected:** Audio plays
8. **Fail:** Audio bar never appears, or is always visible

### Test V.2: Fullscreen navigation overlay

1. In viewer fullscreen, hover left/right edges
2. **Expected:** Previous/Next arrows appear (fade in)
3. **Fail:** No navigation available in fullscreen

---

## Regression Checks

These verify that existing functionality wasn't broken by the fixes.

### Test R.1: Basic create + generate flow

1. Create a new presentation (upload PPTX)
2. Wait for narration generation
3. Select a voice
4. Click **"Generate Audio"**
5. Wait for audio generation
6. **Expected:** All slides have audio. Player works. Download works.

### Test R.2: View page loads

1. Share a presentation
2. Open the share link in an incognito window
3. **Expected:** View page loads. Audio plays. Slides display.
4. Fullscreen works. Sidebar shows slide info.

### Test R.3: Voice CRUD

1. Create a voice (clone + custom)
2. Edit voice name
3. Delete a voice
4. **Expected:** All operations work without errors

### Test R.4: Responsive layout

1. Open the editor on a mobile viewport (375px width)
2. **Expected:** All controls accessible. Slide viewer adjusts.
3. Fullscreen works on mobile.

---

## Test Summary Checklist

Use this to track what you've tested:

- [ ] **#3** Voice guard
- [ ] **#5** Preset gender lock
- [ ] **#6** Preview on create/delete
- [ ] **#7** Upload error handling
- [ ] **#8** Parallel VoxCpm
- [ ] **#9** Image description formatting
- [ ] **#10** Image parsing validation
- [ ] **#11** Content change audio
- [ ] **#12** Voice change UI
- [ ] **#13** Viewer slide sync
- [ ] **#14** Fullscreen (editor)
- [ ] **#14** Fullscreen (viewer)
- [ ] **#15** Share access UX
- [ ] **#17** Recorder WAV format
- [ ] **#18** Combined audio race
- [ ] **#19** Preview in selector
- [ ] **A** Slide delete cleanup
- [ ] **B** Duration data
- [ ] **S.1** auto-confirm auth
- [ ] **S.2** send-welcome auth
- [ ] **S.3** R2 path traversal
- [ ] **S.4** reCAPTCHA fail-closed
- [ ] **S.5** Voice DELETE user_id
- [ ] **S.6** Key plaintext fallback
- [ ] **S.7** DB rate limiter
- [ ] **S.8** UUID validation
- [ ] **S.9** Presigned URL expiry
- [ ] **V.1** Viewer audio bar hover
- [ ] **R.1** Basic CRUD regression
- [ ] **R.2** View page regression
