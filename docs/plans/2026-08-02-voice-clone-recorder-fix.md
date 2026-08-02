# Voice Clone Recorder Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix recorder-produced voice clones failing on the backend (16 kHz downsample) and remove the redundant gender picker from the clone flow.

**Architecture:** Two surgical frontend changes. (1) `VoiceRecorder.tsx` stops forcing 16 kHz — WAV conversion now uses the decoded audio's native sample rate, so recorded clips match uploaded clips that already work. (2) `voices/page.tsx` removes the clone-step gender picker and drops `gender` from the clone confirm body (stored as null). No API/DB changes.

**Tech Stack:** Next.js App Router, TypeScript strict, Web Audio API, Tailwind.

**Spec:** `docs/specs/2026-08-02-voice-clone-recorder-fix-design.md`

---

### Task 1: VoiceRecorder — preserve native sample rate

**Files:**
- Modify: `frontend/components/dashboard/VoiceRecorder.tsx`
- Test: `npm run type-check` + `npm run build` (from `frontend/`)

- [ ] **Step 1: Read the current file**

Read `frontend/components/dashboard/VoiceRecorder.tsx`. The `convertToWav` function (lines ~7-77) currently:

- Creates `const targetSampleRate = 16000` (line 13).
- Resamples via `OfflineAudioContext` to `targetSampleRate` when the decoded buffer's rate differs (lines 14-25).
- Builds a WAV using `sampleRate = audioBuffer.sampleRate` (which after resampling is 16000).
- The caller comment at line 177 says "Convert WebM/opus to WAV — VoxCpm requires WAV for voice cloning".

- [ ] **Step 2: Remove the 16 kHz downsampling**

Replace the block:

```ts
  const targetSampleRate = 16000
  if (audioBuffer.sampleRate !== targetSampleRate) {
    const offlineCtx = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      Math.ceil(audioBuffer.duration * targetSampleRate),
      targetSampleRate
    )
    const source = offlineCtx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(offlineCtx.destination)
    source.start()
    audioBuffer = await offlineCtx.startRendering()
  }

  const numChannels = 1 // mono
```

with:

```ts
  // Keep the decoded audio's NATIVE sample rate. Uploaded clips are used at
  // their native rate and work; forcing 16 kHz here caused VoxCPM2 to reject
  // recorder-produced clones.
  const numChannels = 1 // mono
```

The rest of `convertToWav` (mono downmix, int16 conversion, WAV header, `new Blob`) is unchanged — it already uses `audioBuffer.sampleRate` and `audioBuffer.length`, which now reflect the native rate.

- [ ] **Step 3: Update the caller comment**

Find (line ~177):

```ts
        // Convert WebM/opus to WAV — VoxCpm requires WAV for voice cloning
```

Replace with:

```ts
        // Convert WebM/opus to WAV at native sample rate — VoxCpm requires WAV for voice cloning
```

- [ ] **Step 4: Verify type-check + build**

Run from `frontend/`:

```bash
npm run type-check
npm run build
```

Both expected: clean / success. (`OfflineAudioContext` no longer referenced; ensure no unused import or variable remains.)

- [ ] **Step 5: Commit**

```bash
git add frontend/components/dashboard/VoiceRecorder.tsx
git commit -m "fix: preserve native sample rate in voice recorder WAV conversion"
```

---

### Task 2: Remove gender from clone flow

**Files:**
- Modify: `frontend/app/dashboard/voices/page.tsx`
- Test: `npm run type-check` (from `frontend/`)

- [ ] **Step 1: Read the clone step**

Read `frontend/app/dashboard/voices/page.tsx`. The clone step (`step === "clone"`, around lines 708-888) contains a "Voice gender" selection block (lines ~828-849):

```tsx
            {/* Gender selection */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
                Voice gender
              </label>
              <div className="flex gap-2">
                {(["male", "female", "neutral"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setVoiceGender(voiceGender === g ? "" : g)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                      voiceGender === g
                        ? "border-[#18181B] bg-[#18181B] text-white"
                        : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                    }`}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
            </div>
```

- [ ] **Step 2: Remove the gender picker from the clone step**

Delete that entire block. This is the ONLY gender block to remove — the preset step (`step === "preset"`, around lines 591-623) has a similar block that MUST stay (it shows a fixed badge for presets). Do not touch it.

- [ ] **Step 3: Remove gender from the clone confirm body**

Find `handleUploadClone` (lines ~364-428). The `/api/voices/upload/confirm` body currently includes:

```ts
        body: JSON.stringify({
          path,
          name: voiceName.trim(),
          emotion_default: "calm",
          consent: voiceConsent,
          gender: voiceGender || null,
        }),
```

Remove the `gender` line:

```ts
        body: JSON.stringify({
          path,
          name: voiceName.trim(),
          emotion_default: "calm",
          consent: voiceConsent,
        }),
```

The confirm route stores `gender: gender || null` — omitting the field yields `null`. No route change.

- [ ] **Step 4: Confirm `voiceGender` state still used**

`voiceGender` and `setVoiceGender` must remain (used by the preset step's picker and `handleSavePreset` / `handleCustomPreview`). Do NOT remove the state declaration. If type-check flags an unused variable, verify the preset-step usages are intact (they should be).

- [ ] **Step 5: Verify type-check**

Run from `frontend/`:

```bash
npm run type-check
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add "frontend/app/dashboard/voices/page.tsx"
git commit -m "fix: remove gender picker from voice clone flow"
```

---

### Task 3: Final verification

- [ ] **Step 1: Full checks**

From `frontend/`:

```bash
npm run type-check
npm run build
npx --yes tsx --test lib/__tests__/image-analysis.test.ts
npx --yes tsx --test lib/__tests__/voice-description.test.ts
```

Expected: all clean / pass.

- [ ] **Step 2: Final code review** — dispatch reviewer over `git log --oneline <spec-commit>..HEAD` (spec commit = `974fc9e`). Verify: recorder preserves native rate (no 16 kHz downsample remains), clone-step gender picker removed, clone confirm body has no `gender`, preset gender picker untouched, `voiceGender` state still used, type-check/build/tests pass, no `any`, surgical scope.

- [ ] **Step 3: Working-tree check**

Run: `git status --short`
Expected: clean (all work committed).
