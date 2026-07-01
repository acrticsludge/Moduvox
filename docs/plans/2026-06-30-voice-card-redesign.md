# VoiceCard Redesign — Implementation Plan

**Goal:** Rewrite the inline `VoiceCard` component in `voices/page.tsx` to use a compact inline layout with consistent height.

**Architecture:** Single-file change — rewrite the `VoiceCard` function (lines 42-147) preserving all existing data flow, click handlers, and external behavior.

**Tech Stack:** React, Tailwind CSS, lucide-react

---

### Task 1: Rewrite VoiceCard component

**Files:**
- Modify: `frontend/app/dashboard/voices/page.tsx` lines 42-147

- [ ] **Step 1: Rewrite the VoiceCard function**

Replace the entire inline VoiceCard component (from `function VoiceCard(` to the closing `}` before `// ── Add Voice Modal ──`).

```tsx
function VoiceCard({
  voice,
  onTest,
  onDelete,
}: {
  voice: Voice
  onTest: (voice: Voice) => void
  onDelete: (voice: Voice) => void
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const presetInfo = voice.preset_id
    ? PRESET_VOICES.find((p) => p.id === voice.preset_id)
    : null

  function handlePlay() {
    // For cloned voices with a sample — play inline
    if (voice.type === "cloned" && voice.sample_path) {
      if (playing && audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        setPlaying(false)
        setProgress(0)
        return
      }

      if (previewUrl && audioRef.current) {
        audioRef.current.play()
        setPlaying(true)
        return
      }

      // Load signed URL then play
      const supabase = createClient()
      supabase.storage
        .from("voice-samples")
        .createSignedUrl(voice.sample_path, 300)
        .then(({ data }) => {
          if (!data) return
          setPreviewUrl(data.signedUrl)
          const audio = new Audio(data.signedUrl)
          audioRef.current = audio
          audio.addEventListener("timeupdate", () => {
            setProgress(audio.currentTime / audio.duration)
          })
          audio.addEventListener("ended", () => {
            setPlaying(false)
            setProgress(0)
          })
          audio.play()
          setPlaying(true)
        })
      return
    }

    // For presets or cloned without sample — open test modal
    onTest(voice)
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-4 transition-all duration-150 hover:border-zinc-300 hover:shadow-sm">
      {/* Row 1: Icon + Name + Actions */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
            {voice.type === "preset" ? (
              <Music className="h-5 w-5 text-[#71717A]" />
            ) : (
              <Mic className="h-5 w-5 text-[#71717A]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-[#18181B]">
                {voice.name}
              </h3>
              <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-[#71717A]">
                {voice.type === "preset" ? "Preset" : "Cloned"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            type="button"
            onClick={handlePlay}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#18181B] text-white transition-all hover:bg-[#27272A] active:scale-95"
            aria-label={playing ? "Stop" : "Play voice"}
          >
            {playing ? (
              <div className="flex items-center gap-0.5">
                <span className="h-3 w-0.5 animate-pulse bg-white" />
                <span className="h-2 w-0.5 animate-pulse bg-white" />
                <span className="h-3 w-0.5 animate-pulse bg-white" />
              </div>
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onDelete(voice)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label="Delete voice"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Row 2: Type badge + Description (inline, truncated) */}
      <div className="mt-2 flex items-center gap-1.5 min-w-0">
        <span className="shrink-0 text-xs text-[#71717A]">
          {voice.type === "preset" ? "Preset" : "Cloned"}
        </span>
        {voice.type === "preset" && presetInfo && (
          <>
            <span className="shrink-0 text-xs text-zinc-300">·</span>
            <p className="truncate text-xs text-zinc-500">
              {presetInfo.description}
            </p>
          </>
        )}
        {voice.type === "cloned" && voice.sample_path && (
          <span className="text-[10px] text-zinc-400">Has sample</span>
        )}
      </div>

      {/* Row 3: Progress bar (only during playback) */}
      {playing && (
        <div className="mt-2">
          <div className="h-1 w-full rounded-full bg-zinc-200">
            <div
              className="h-1 rounded-full bg-[#18181B] transition-all duration-150"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Row 4: Test voice + Date */}
      <div className="mt-auto flex items-center justify-between pt-3">
        <button
          type="button"
          onClick={() => onTest(voice)}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
        >
          <Volume2 className="h-3 w-3" strokeWidth={1.5} />
          Test voice
        </button>
        <p className="text-xs text-zinc-400">Created {formatDate(voice.created_at)}</p>
      </div>

      {/* Hidden audio element for inline playback */}
      <audio ref={audioRef} className="hidden" />
    </div>
  )
}
```

- [ ] **Step 2: Add useRef to the import** (needed for inline playback)

Edit the import line to add `useRef`:
```tsx
import { useEffect, useState, useRef } from "react"
```

Verify `useRef` is already in the import at line 3 (it should be — check current line).

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: Exit code 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/dashboard/voices/page.tsx docs/specs/2026-06-30-voice-card-redesign.md
git commit -m "feat: redesign VoiceCard with compact inline layout for consistent height"
git push origin feat/UI-improvements
```
