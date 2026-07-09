# Regeneration Flow Improvement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 bugs in the audio regeneration flow: stacked modals, stale combined.wav, unnecessary Gemini calls, narration closure race, and first voice change undetected.

**Architecture:** Single 3-step modal replaces 3 stacked overlays; `combined.wav` deleted from R2 after per-slide regen; `handleGenerate` skips Gemini when `reason='voice_changed'`; `generateNarrations` returns the narration map to fix stale closure; voice change detection resets correctly.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind, R2 (Cloudflare), Gradio TTS

---

### Task 1: Rewrite `RegenerateModal.tsx` — Single 3-Step Modal

**Files:**
- Modify: `frontend/components/dashboard/RegenerateModal.tsx` (full rewrite)

- [ ] **Step 1: Replace file content**

The new modal has 3 steps: `'review'` | `'generating'` | `'complete'`. Export `RegenStep` type.

Write the full file `frontend/components/dashboard/RegenerateModal.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Loader2, ChevronDown, ChevronRight, CheckCircle2, XCircle, X } from "lucide-react"
import type { ParsedSlide } from "@/lib/pptx-renderer"

export type RegenStep = "review" | "generating" | "complete"

export function RegenerateModal({
  slides,
  changedSlides,
  voiceChangedSinceAudio,
  onNavigate,
  onConfirm,
  onCancel,
  step,
  generating,
  generationError,
  audioGenProgress,
  generationSummary,
  onRetry,
}: {
  slides: ParsedSlide[]
  changedSlides: number[]
  voiceChangedSinceAudio?: boolean
  onNavigate: (slideNumber: number) => void
  onConfirm: () => void
  onCancel: () => void
  step: RegenStep
  generating: boolean
  generationError: string | null
  audioGenProgress: { current: number; total: number; slideTitle?: string } | null
  generationSummary: { success: number; failed: number } | null
  onRetry: () => void
}) {
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null)
  const affectedSlides = voiceChangedSinceAudio
    ? slides
    : slides.filter((s) => new Set(changedSlides).has(s.number))

  function toggleExpand(num: number) {
    setExpandedSlide(expandedSlide === num ? null : num)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40 p-4">
      <div className="flex w-full max-w-lg flex-col rounded-xl border border-zinc-200 bg-white shadow-xl max-h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="text-base font-semibold text-[#18181B]">
            {step === "review" && "Regenerate Audio"}
            {step === "generating" && "Generating Audio..."}
            {step === "complete" && "Done"}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={step === "generating"}
            className="text-sm text-[#71717A] hover:text-[#18181B] disabled:opacity-30"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Review Step ── */}
        {step === "review" && (
          <>
            {voiceChangedSinceAudio && (
              <div className="flex-shrink-0 mx-6 mt-4 mb-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                Voice settings changed. All slides will be regenerated with the new voice.
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-6 py-4 hide-scrollbar">
              {affectedSlides.length === 0 ? (
                <p className="text-sm text-[#71717A]">No modified slides to regenerate.</p>
              ) : (
                <div className="space-y-1">
                  {affectedSlides.map((slide) => (
                    <div key={slide.number} className="overflow-hidden rounded-lg border border-zinc-100">
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => toggleExpand(slide.number)}
                          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-[#18181B]"
                          title="View parsed text"
                        >
                          {expandedSlide === slide.number ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigate(slide.number)}
                          className="flex flex-1 items-center gap-2 text-left"
                        >
                          <span className="w-7 flex-shrink-0 text-xs font-medium text-zinc-400">
                            #{slide.number}
                          </span>
                          <span className="flex-1 break-words text-sm text-[#18181B]">
                            {slide.title}
                          </span>
                          <span className="flex-shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            Modified
                          </span>
                        </button>
                      </div>
                      {expandedSlide === slide.number && (
                        <div className="border-t border-zinc-100 px-3 pb-2.5 pt-2">
                          {slide.bullets.length > 0 ? (
                            <ul className="space-y-1">
                              {slide.bullets.map((b, i) => (
                                <li key={i} className="flex gap-2 text-sm text-[#71717A]">
                                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-300" />
                                  <span className="break-words leading-relaxed">{b}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-[#71717A]">No additional content.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-shrink-0 border-t border-zinc-100 px-6 py-4">
              <button
                type="button"
                onClick={onConfirm}
                disabled={affectedSlides.length === 0 || generating}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#18181B] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#27272A] disabled:opacity-50"
              >
                Regenerate Audio for {affectedSlides.length} slide(s)
              </button>
            </div>
          </>
        )}

        {/* ── Generating Step ── */}
        {step === "generating" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 py-12 min-h-[280px]">
            <Loader2 className="h-8 w-8 animate-spin text-[#18181B]" />
            <p className="text-sm font-medium text-[#18181B]">Generating audio...</p>
            {audioGenProgress && (
              <>
                <p className="text-xs text-[#71717A]">
                  Slide {audioGenProgress.current} of {audioGenProgress.total}
                  {audioGenProgress.slideTitle ? `: ${audioGenProgress.slideTitle}` : ""}
                </p>
                <div className="h-1.5 w-48 rounded-full bg-zinc-200">
                  <div
                    className="h-1.5 rounded-full bg-[#18181B] transition-all duration-300"
                    style={{ width: `${(audioGenProgress.current / audioGenProgress.total) * 100}%` }}
                  />
                </div>
              </>
            )}
            {generationError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span>{generationError}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-[#71717A] hover:text-[#18181B]"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── Complete Step ── */}
        {step === "complete" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-12 min-h-[280px]">
            {generationSummary && generationSummary.failed === 0 ? (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
            ) : (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-7 w-7 text-red-600" />
              </div>
            )}
            <h2 className="text-lg font-semibold text-[#18181B]">
              {generationSummary && generationSummary.failed === 0
                ? "Generation Complete"
                : "Partial Failure"}
            </h2>
            <p className="text-sm text-[#71717A] text-center max-w-xs">
              {generationSummary && generationSummary.failed === 0
                ? `${generationSummary.success} slide(s) regenerated successfully.`
                : `${generationSummary?.failed || 0} slide(s) failed out of ${(generationSummary?.success || 0) + (generationSummary?.failed || 0)}.`}
            </p>
            {generationSummary && generationSummary.failed > 0 && (
              <button
                type="button"
                onClick={onRetry}
                disabled={generating}
                className="rounded-lg bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#27272A] disabled:opacity-50"
              >
                {generating ? "Retrying..." : "Retry Failed"}
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build check**

Run: `cd frontend && npx next build 2>&1 | tail -20`
Expected: Compiled successfully

### Task 2: Fix stale `combined.wav` — Delete in slide route

**Files:**
- Modify: `frontend/app/api/generate/audio/slide/route.ts`

- [ ] **Step 1: Add combined.wav deletion after successful per-slide upload**

In `frontend/app/api/generate/audio/slide/route.ts`, after the upload success check (after `if (!uploadResult.success) throw new Error(...)`), add:

```typescript
    // Invalidate the combined audio cache so it gets rebuilt from fresh per-slide WAVs
    const combinedKey = `${user.id}/audio/${presentation_id}/combined.wav`
    await deleteFile(combinedKey).catch(() => {})
```

The relevant section should now look like:

```typescript
    // Save to R2
    const storagePath = `${user.id}/audio/${presentation_id}/slides/slide-${slide_number}.wav`
    await deleteFile(storagePath)
    const uploadResult = await uploadFile(storagePath, audioBuffer, "audio/wav")
    if (!uploadResult.success) throw new Error(`Failed to save audio: ${uploadResult.error}`)

    // Invalidate the combined audio cache so it gets rebuilt from fresh per-slide WAVs
    const combinedKey = `${user.id}/audio/${presentation_id}/combined.wav`
    await deleteFile(combinedKey).catch(() => {})
```

- [ ] **Step 2: Build check**

Run: `cd frontend && npx next build 2>&1 | tail -20`
Expected: Compiled successfully

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/generate/audio/slide/route.ts
git commit -m "fix: invalidate combined.wav cache on per-slide audio regen"
```

### Task 3: Fix `SlideEditor.tsx` — Narration closure race + skip Gemini + wire new RegenModal + fix voice detection

**Files:**
- Modify: `frontend/components/dashboard/SlideEditor.tsx`

- [ ] **Step 1: Update import for new RegenModal export**

Find `RegenerateModal` import (line 12):
```typescript
import { RegenerateModal } from "./RegenerateModal"
```
Change to:
```typescript
import { RegenerateModal, type RegenStep } from "./RegenerateModal"
```

- [ ] **Step 2: Add new state variables**

After line 95 (`const [audioGenProgress, ...]`), add the new states:
```typescript
  const [regenStep, setRegenStep] = useState<RegenStep>("review")
  const [generationSummary, setGenerationSummary] = useState<{ success: number; failed: number } | null>(null)
```

- [ ] **Step 3: Fix `generateNarrations` return type**

Replace the entire `generateNarrations` function (lines 284-366) to return `Record<number, string> | null` instead of `boolean`:

```typescript
  // Shared helper: generate narrations via API. Returns the new narrations map, or null on failure.
  async function generateNarrations(
    targetSlides: ParsedSlide[],
    showRateLimitPrompt = true
  ): Promise<Record<number, string> | null> {
    if (targetSlides.length === 0) return null
    setGeneratingNarrations(true)
    try {
      const res = await fetch("/api/generate/narration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides: targetSlides.map((s) => ({ number: s.number, title: s.title, bullets: s.bullets })),
        }),
      })
      const json = await res.json()

      if (json.error === "quota_exhausted") {
        toastError(json.message || "The shared Gemini key has hit its daily limit. Add your own API key in Settings.")
        return null
      }

      if (json.error === "rate_limited") {
        if (showRateLimitPrompt) {
          const retryAfter = json.retryAfter as number | undefined
          if (retryAfter && retryAfter > 0) {
            const toastId = `rate-limit-${Date.now()}`
            let remaining = retryAfter
            const updateMsg = () => {
              if (remaining > 0) {
                toastError(`Rate limit reached. Try again in ${remaining}s, or add your own API key in Settings.`, { id: toastId })
                remaining--
              } else {
                clearInterval(rateLimitIntervalRef.current)
                rateLimitIntervalRef.current = undefined
              }
            }
            updateMsg()
            rateLimitIntervalRef.current = setInterval(updateMsg, 1000)
          } else {
            toastError(json.message || "Generation limit reached. Add your Gemini API key in Settings.")
          }
        }
        return null
      }

      if (json.error === "invalid_api_key") {
        toastError(json.message || "Your Gemini API key is invalid. Check Settings.")
        return null
      }

      if (json.error === "service_unavailable") {
        toastError(json.message || "Gemini is temporarily overloaded. Wait a moment and try again.")
        return null
      }

      if (json.data?.narrations && Object.keys(json.data.narrations).length > 0) {
        const updated = { ...narrations, ...json.data.narrations }
        setInternalNarrations(updated)
        onNarrationsChange?.(updated)
        originalNarrationsRef.current = { ...originalNarrationsRef.current, ...json.data.narrations }

        if (json.data.partial && Array.isArray(json.data.missingSlides) && json.data.missingSlides.length > 0) {
          toastError(
            `AI narration skipped ${json.data.missingSlides.length} slide(s): ${json.data.missingSlides.join(", ")}. ` +
            `Add narration manually or try again.`,
          )
        }
        return updated
      }

      return null
    } catch {
      if (showRateLimitPrompt) {
        toastError("Narration generation failed. Please check your connection and try again.")
      }
      return null
    }
    finally { setGeneratingNarrations(false) }
  }
```

- [ ] **Step 4: Fix all callers of `generateNarrations` to use the new return type**

**Line 237** (initial auto-gen narration in useEffect):
```typescript
    setGenerationFailed(false)
    generateNarrations(slides, false).then((ok) => {
      if (!ok) setGenerationFailed(true)
    })
```
Change to:
```typescript
    setGenerationFailed(false)
    generateNarrations(slides, false).then((result) => {
      if (!result) setGenerationFailed(true)
    })
```

**Line 1103** (Try Again button):
```typescript
              setGenerationFailed(false)
              const ok = await generateNarrations(slides, true)
              if (!ok) setGenerationFailed(true)
```
Change to:
```typescript
              setGenerationFailed(false)
              const result = await generateNarrations(slides, true)
              if (!result) setGenerationFailed(true)
```

**Line 697-699** (re-upload auto-gen):
```typescript
        generateNarrations(slidesToRegen, false).then((ok) => {
          if (!ok) setGenerationFailed(true)
        })
```
Change to:
```typescript
        generateNarrations(slidesToRegen, false).then((result) => {
          if (!result) setGenerationFailed(true)
        })
```

- [ ] **Step 5: Fix `handleGenerate` to fix closure race + skip Gemini when voice_changed**

Replace the entire `handleGenerate` function (lines 457-535):

```typescript
  async function handleGenerate(
    selectedSlides?: Set<number>,
    reason: 'voice_changed' | 'content_changed' = 'voice_changed',
  ) {
    setGenerating(true)
    setLastRegenCount(selectedSlides?.size ?? 0)

    const targetSlides = selectedSlides
      ? slides.filter((s) => selectedSlides.has(s.number))
      : slides

    // When reason is 'voice_changed' (settings change, not content change),
    // skip Gemini and use existing narrations. This prevents unnecessary
    // Gemini calls that fail on sparse slide content.
    let currentNarrations: Record<number, string> = { ...narrations }
    if (reason === 'content_changed') {
      const result = await generateNarrations(targetSlides, false)
      if (result) {
        currentNarrations = result
        setGenerationFailed(false)
      }
    }

    // Build the list of slides needing audio, using the latest narrations
    const sorted = targetSlides.slice().sort((a, b) => a.number - b.number)
    const slideTexts = sorted
      .map((s) => ({ number: s.number, text: currentNarrations[s.number] || "" }))
      .filter((s) => s.text.trim())

    if (slideTexts.length > 0) {
      let failedCount = 0

      for (let i = 0; i < slideTexts.length; i++) {
        try {
          const res = await fetch("/api/generate/audio/slide", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slide_number: slideTexts[i].number,
              text: slideTexts[i].text,
              voice_id: selectedVoiceId || undefined,
              voice_description: voiceDescription || "Natural, clear, professional speaking voice",
              cfg_value: 2.0,
              presentation_id: presentationId,
            }),
          })

          if (!res.ok) {
            const json = await res.json().catch(() => ({}))
            throw new Error(typeof json.error === "string" ? json.error : `Slide ${slideTexts[i].number} failed`)
          }
        } catch (err) {
          failedCount++
          console.error(`[SlideEditor] Slide ${slideTexts[i].number} audio failed:`, err)
        }
      }

      setGenerationSummary({
        success: slideTexts.length - failedCount,
        failed: failedCount,
      })

      if (failedCount > 0) {
        setGenerating(false)
        return
      }
    } else {
      setGenerationSummary({ success: 0, failed: 0 })
    }

    // All slides generated successfully
    const combinedUrl = `/api/presentations/${presentationId}/audio/combined`
    setInternalAudioUrl(combinedUrl)
    onAudioUrlChange?.(combinedUrl)
    setInternalAudioGenerated(true)
    onAudioGeneratedChange?.(true)
    generatedWithVoiceRef.current = { voiceId: selectedVoiceId ?? null, description: voiceDescription ?? "", ultimateMode: ultimateMode ?? false }

    // Clear changed status for regenerated slides
    if (selectedSlides) {
      const remaining = changedSlides.filter((s) => !selectedSlides.has(s))
      setInternalChangedSlides(remaining)
      onChangedSlidesChange?.(remaining)
    } else {
      setInternalChangedSlides([])
      onChangedSlidesChange?.([])
    }

    setGenerating(false)
  }
```

- [ ] **Step 6: Wire the new RegenModal with unified 3-step flow**

Replace the old RegenerateModal block (lines 1557-1568):

```typescript
      {/* Regenerate modal — unified 3-step flow */}
      {showRegenModal && (
        <RegenerateModal
          slides={slides}
          changedSlides={changedSlides}
          generating={generating}
          voiceChangedSinceAudio={voiceChangedSinceAudio}
          onNavigate={(num) => jumpToSlide(num)}
          onConfirm={() => {
            setRegenStep("generating")
            handleGenerate(voiceChangedSinceAudio ? undefined : new Set(changedSlides), "voice_changed")
              .then(() => setRegenStep("complete"))
              .catch(() => setRegenStep("complete"))
          }}
          onCancel={() => {
            if (generating) {
              // Hard cancel during generation — reload to reset state
              window.location.reload()
              return
            }
            setShowRegenModal(false)
            setTimeout(() => {
              setRegenStep("review")
              setGenerationSummary(null)
            }, 200)
          }}
          step={regenStep}
          setStep={setRegenStep}
          generationError={null}
          audioGenProgress={audioGenProgress}
          generationSummary={generationSummary}
          onRetry={() => {
            // Re-run generation on all failed slides
            setRegenStep("generating")
            setGenerating(true)
            // Simple retry: regenerate everything
            handleGenerate(voiceChangedSinceAudio ? undefined : new Set(changedSlides), "voice_changed")
              .then(() => setRegenStep("complete"))
              .catch(() => setRegenStep("complete"))
          }}
        />
      )}
```

- [ ] **Step 7: Fix first voice change detection**

Replace the voice change detection `useEffect` (lines 249-282):

Current code:
```typescript
  // Track whether voice settings changed since last audio gen — used by regenerate modal
  const [voiceChangedSinceAudio, setVoiceChangedSinceAudio] = useState(false)
  useEffect(() => {
    if (!audioGenerated) {
      setVoiceChangedSinceAudio(false)
      return
    }

    // Initialize snapshot on first mount if audio exists but no snapshot
    if (!generatedWithVoiceRef.current) {
      generatedWithVoiceRef.current = {
        voiceId: selectedVoiceId ?? null,
        description: voiceDescription ?? "",
        ultimateMode: ultimateMode ?? false,
      }
      snapshotInitialized.current = true
      setVoiceChangedSinceAudio(false)
      return
    }

    // On the first comparison after initialization, don't flag as changed
    if (snapshotInitialized.current) {
      snapshotInitialized.current = false
      setVoiceChangedSinceAudio(false)
      return
    }

    const snap = generatedWithVoiceRef.current
    const voiceChanged = snap.voiceId !== (selectedVoiceId ?? null)
    const descChanged = snap.description !== (voiceDescription ?? "")
    const ultChanged = snap.ultimateMode !== (ultimateMode ?? false)
    setVoiceChangedSinceAudio(voiceChanged || descChanged || ultChanged)
  }, [selectedVoiceId, voiceDescription, ultimateMode, audioGenerated])
```

Replace with:
```typescript
  // Track whether voice settings changed since last audio gen — used by regenerate modal
  const [voiceChangedSinceAudio, setVoiceChangedSinceAudio] = useState(false)
  useEffect(() => {
    if (!audioGenerated) {
      setVoiceChangedSinceAudio(false)
      return
    }

    // If no snapshot yet (e.g., first time audio generated in this session),
    // take one and don't compare yet
    if (generatedWithVoiceRef.current === null) {
      generatedWithVoiceRef.current = {
        voiceId: selectedVoiceId ?? null,
        description: voiceDescription ?? "",
        ultimateMode: ultimateMode ?? false,
      }
      setVoiceChangedSinceAudio(false)
      return
    }

    // Compare snapshot vs current
    const snap = generatedWithVoiceRef.current
    const voiceChanged = snap.voiceId !== (selectedVoiceId ?? null)
    const descChanged = snap.description !== (voiceDescription ?? "")
    const ultChanged = snap.ultimateMode !== (ultimateMode ?? false)
    setVoiceChangedSinceAudio(voiceChanged || descChanged || ultChanged)
  }, [selectedVoiceId, voiceDescription, ultimateMode, audioGenerated])
```

Also remove the `snapshotInitialized` ref since it's no longer needed. Find:
```typescript
  const snapshotInitialized = useRef(false)
```
(line 101) — delete it.

- [ ] **Step 8: Remove the separate audio progress overlay and error modal**

Since the regen modal now handles progress internally, the old overlays should no longer show during regen mode. We need to conditionally render them only when the regen modal is NOT showing.

Replace the progress overlay (lines 1570-1591):
```typescript
      {/* Audio generation progress overlay — blocks the entire page */}
      {audioGenProgress && (
        ...
      )}
```
Change to show only when NOT in regen modal mode:
```typescript
      {/* Audio generation progress overlay — only for initial gen, not regen */}
      {audioGenProgress && !showRegenModal && (
        ...
      )}
```

Replace the error modal (lines 1593-1627):
```typescript
      {/* Audio generation error modal */}
      {audioGenError && (
        ...
      )}
```
Change to show only when NOT in regen modal mode:
```typescript
      {/* Audio generation error modal — only for initial gen, not regen */}
      {audioGenError && !showRegenModal && (
        ...
      )}
```

- [ ] **Step 9: Build check**

Run: `cd frontend && npx next build 2>&1 | tail -20`
Expected: Compiled successfully

### Task 4: Final verification

- [ ] **Step 1: Full build**

```bash
cd frontend && npx next build 2>&1
```
Expected: Compiled successfully, no errors

- [ ] **Step 2: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: unified regen UX, fix stale audio cache, skip Gemini on voice-only regen, fix closure race, fix voice detection"
```
