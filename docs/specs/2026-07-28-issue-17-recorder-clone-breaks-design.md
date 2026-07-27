# Issue #17: Built-In Recorder Voice Clone Breaks

## Status
Not started — planning phase

## Root Cause
The `VoiceRecorder` component records audio using `MediaRecorder` with `audio/webm;codecs=opus` (or fallback `audio/webm`). When this recorded file is used for voice cloning, the audio pipeline fails because:

1. **Format compatibility**: VoxCpm's Gradio API expects WAV format for reference audio. WebM/Opus is not directly supported.
2. **Upload pipeline**: The recorded file is uploaded to R2 as-is. When `/api/generate/audio/slide` downloads this for cloning, the VoxCpm library attempts to upload it to Gradio which may fail on unsupported formats.
3. **WAV conversion gap**: The `toWav()` function in `audio-convert.ts` uses `mpg123-decoder` (for MP3) but there's no decoder registered for WebM/Opus.

The file at `frontend/lib/audio-convert.ts` likely only handles MP3→WAV conversion, not WebM→WAV.

## Expected Behavior
- Recorded audio (WebM/Opus) should be converted to WAV before storage or before being sent to VoxCpm
- Voice clone should work identically with recorded audio and uploaded WAV/MP3 files

## Actual Behavior
- Recording works (creates a WebM file)
- Upload to R2 works
- Voice clone generation fails because Gradio can't process WebM reference audio

## Files Affected
- `frontend/components/dashboard/VoiceRecorder.tsx` — optionally convert on client before upload
- `frontend/lib/audio-convert.ts` — add WebM/Opus to WAV converter
- `frontend/lib/voxcpm.ts` — add format detection/conversion before sending to Gradio
- `frontend/app/api/voices/upload/confirm/route.ts` — convert after upload
- `frontend/app/api/generate/audio/slide/route.ts` — convert before clone

## Edge Cases
1. Browser doesn't support WebM (Safari on iOS records in different format) → detect and handle
2. Very short recording (< 2 seconds) → VoxCpm may reject, show validation
3. Stereo vs mono → VoxCpm expects mono WAV, convert accordingly
4. Sample rate mismatch → resample to 16kHz or 44.1kHz depending on VoxCpm requirement
5. Large recording file → conversion may be CPU intensive

## Design Decision
The cleanest fix is to **convert to WAV on the server side when the audio is downloaded for cloning**, not at upload time. This avoids:
- Slowing down the upload flow with conversion
- Storing duplicate formats
- Losing the original recording format

The conversion should happen in the `audio/slide` route just before passing the reference audio to VoxCpm. Use a dedicated WebM-to-WAV converter (using `audiobuffer-to-wav` or similar library that handles Opus decoding in Node.js via `@discordjs/opus` or `node-lame`).

Actually, the simplest approach: handle the conversion in `frontend/lib/voxcpm.ts` — before uploading the reference audio to Gradio, detect non-WAV formats and convert. This centralizes the fix.

## Acceptance Criteria
1. Recorded WebM/Opus voice samples work correctly for voice cloning
2. No regression for uploaded WAV/MP3/M4A samples
3. Conversion happens transparently — user doesn't need to know about formats
4. Error message if conversion fails: "Your recording format could not be processed. Try uploading a WAV file instead."
5. Cache the converted version so conversion only happens once
