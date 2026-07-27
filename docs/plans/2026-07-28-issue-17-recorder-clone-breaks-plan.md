# Plan: Fix Voice Clone From Browser Recording

## Implementation Order

### Step 1: Investigate audio format handling
- Read full `frontend/lib/audio-convert.ts` and `frontend/lib/wav-utils.ts`
- Determine what formats the current conversion pipeline supports
- Check what `toWav()` function handles (likely MP3 only via `mpg123-decoder`)

### Step 2: Add WebM/Opus to WAV conversion
**File:** `frontend/lib/audio-convert.ts`
- Add a new conversion function: `webmToWav(input: Buffer): Promise<Buffer>`
- Use `@discordjs/opus` or a pure-JS Opus decoder like `opus-decoder`
- Alternative: Use `ffmpeg.wasm` for reliable multi-format conversion (heavier but more robust)
- Convert to: mono, 16-bit PCM, 16kHz sample rate WAV (VoxCpm requirement)

### Step 3: Add format detection and conversion in voxcpm.ts
**File:** `frontend/lib/voxcpm.ts`
- In `generateWithGradio()`, before uploading reference audio, detect the format
- If not WAV, convert to WAV using the new `toWav()` function
- This centralizes the fix — works for all clone paths

### Step 4: Add client-side format detection
**File:** `frontend/components/dashboard/VoiceRecorder.tsx`
- After recording completes, log the MIME type and file format
- Show a warning if format may not be supported: "Recorded audio format may need conversion."

## Verification
1. Record voice using browser recorder → save as cloned voice
2. Use this cloned voice for narration → generation succeeds
3. Upload a WAV file → still works (regression check)
4. Upload an MP3 → still works
5. Upload a WebM file → works
6. Verify converted audio plays correctly
