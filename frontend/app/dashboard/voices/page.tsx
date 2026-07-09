"use client"

import { useEffect, useState, useRef } from "react"
import { Plus, Mic, Trash2, Music, Loader2, Volume2, Play } from "lucide-react"
import { toastError } from "@/components/ui/CustomToast"
import dynamic from "next/dynamic"

const DeleteVoiceDialog = dynamic(() => import("@/components/dashboard/DeleteVoiceDialog").then(mod => mod.DeleteVoiceDialog), { ssr: false })
const WaitlistDialog = dynamic(() => import("@/components/dashboard/WaitlistDialog").then(mod => mod.WaitlistDialog), { ssr: false })
import type { QuotaResult } from "@/lib/quota"

// ── Types ────────────────────────────────────────────
type Voice = {
  id: string
  user_id: string
  name: string
  type: "preset" | "cloned"
  preset_id: string | null
  sample_path: string | null
  sample_duration_seconds: number | null
  emotion_default: string
  control_instruction: string | null
  is_active: boolean
  created_at: string
}

const PRESET_VOICES = [
  { id: "calm-female", label: "Calm Female", description: "Warm, steady, reassuring. Ideal for policy and compliance training." },
  { id: "energetic-male", label: "Energetic Male", description: "Upbeat, engaging. Good for onboarding and introductions." },
  { id: "soft-narrator", label: "Soft Narrator", description: "Gentle and measured. Fits detailed explanations and tutorials." },
  { id: "professional-tone", label: "Professional Tone", description: "Clear, authoritative. Suits formal business content." },
  { id: "warm-friendly", label: "Warm Friendly", description: "Approachable, conversational. Makes complex topics feel simple." },
]

const PRESET_CONTROL_INSTRUCTIONS: Record<string, string> = {
  "calm-female": "A calm, warm female voice with a steady and reassuring tone. Ideal for policy and compliance training content.",
  "energetic-male": "An upbeat, energetic male voice. Good for onboarding, introductions, and motivational content.",
  "soft-narrator": "A gentle, measured voice with a soft delivery. Fits detailed explanations and tutorial-style content.",
  "professional-tone": "A clear, authoritative voice with a professional business tone. Suits formal business content.",
  "warm-friendly": "An approachable, conversational voice that makes complex topics feel simple and accessible.",
}

// ── Helpers ──────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// ── Voice Row ────────────────────────────────────────
function VoiceRow({
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
  const [loadingSample, setLoadingSample] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const presetInfo = voice.preset_id
    ? PRESET_VOICES.find((p) => p.id === voice.preset_id)
    : null

  async function handlePlaySample() {
    if (!voice.sample_path) return

    // Toggle off if already playing
    if (playing && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setPlaying(false)
      setProgress(0)
      return
    }

    // Resume if already loaded
    if (previewUrl && audioRef.current) {
      audioRef.current.play()
      setPlaying(true)
      return
    }

    // Load signed URL from server then play
    setLoadingSample(true)
    try {
      const res = await fetch(`/api/voices/signed-url?path=${encodeURIComponent(voice.sample_path!)}`)
      const json = await res.json()
      if (!json.data?.audioUrl) {
        toastError("Failed to load voice sample")
        return
      }
      const signedUrl = json.data.audioUrl
      setPreviewUrl(signedUrl)
      const audio = new Audio(signedUrl)
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
    } catch {
      toastError("Failed to load voice sample")
    } finally {
      setLoadingSample(false)
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-zinc-50">
        {/* LEFT: Icon + Name + Description */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100">
            {voice.type === "preset" ? (
              <Music className="h-3.5 w-3.5 text-[#71717A]" />
            ) : (
              <Mic className="h-3.5 w-3.5 text-[#71717A]" />
            )}
          </div>
          <p className="truncate text-sm font-semibold text-[#18181B]">
            {voice.name}
          </p>
          {voice.type === "preset" && (presetInfo || voice.control_instruction) && (
            <>
              <span className="hidden shrink-0 text-xs text-zinc-300 md:inline">·</span>
              <p
                className="hidden truncate text-xs text-zinc-500 md:block"
                title={presetInfo ? presetInfo.description : voice.control_instruction!}
              >
                {presetInfo ? presetInfo.description : voice.control_instruction}
              </p>
            </>
          )}
        </div>

        {/* RIGHT: Badge + Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-[#71717A]">
            {voice.type === "preset" ? "Preset" : "Cloned"}
          </span>

          {voice.type === "cloned" && voice.sample_path && (
            <button
              type="button"
              onClick={handlePlaySample}
              disabled={loadingSample}
              className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-[#18181B] disabled:opacity-40"
              aria-label={loadingSample ? "Loading" : playing ? "Stop" : "Play sample"}
            >
              {loadingSample ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : playing ? (
                <span className="flex items-center gap-[2px]">
                  <span className="h-2.5 w-0.5 rounded-full bg-current" />
                  <span className="h-1.5 w-0.5 rounded-full bg-current" />
                  <span className="h-2.5 w-0.5 rounded-full bg-current" />
                </span>
              ) : (
                <Play className="h-3 w-3" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => onTest(voice)}
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 transition-colors hover:text-[#18181B]"
          >
            <Volume2 className="h-3 w-3" strokeWidth={1.5} />
            <span className="hidden sm:inline">Test</span>
          </button>

          <span className="hidden text-xs text-zinc-400 md:block">
            {formatDate(voice.created_at)}
          </span>

          <button
            type="button"
            onClick={() => onDelete(voice)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label="Delete voice"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Playback progress bar */}
      {playing && (
        <div className="absolute bottom-0 left-2 right-2">
          <div className="h-0.5 rounded-full bg-zinc-200">
            <div
              className="h-0.5 rounded-full bg-[#18181B] transition-all duration-150"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}

      <audio ref={audioRef} className="hidden" />
    </div>
  )
}

// ── Add Voice Modal ──────────────────────────────────
function AddVoiceModal({
  onClose,
  onCreated,
  clonedVoicesCount,
}: {
  onClose: () => void
  onCreated: (voice: Voice) => void
  clonedVoicesCount: number
}) {
  const [step, setStep] = useState<"choose" | "preset" | "clone">("choose")
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [voiceName, setVoiceName] = useState("")
  const [controlInstruction, setControlInstruction] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quotaResult, setQuotaResult] = useState<QuotaResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSavePreset() {
    const isCustom = !selectedPreset
    if (!voiceName.trim()) return
    if (isCustom && !controlInstruction.trim()) return

    // For built-in presets, auto-fill the control instruction from the map
    const resolvedInstruction = selectedPreset
      ? PRESET_CONTROL_INSTRUCTIONS[selectedPreset]
      : controlInstruction.trim() || undefined

    setUploading(true)
    setError(null)

    try {
      const res = await fetch("/api/voices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: voiceName.trim(),
          type: "preset",
          preset_id: selectedPreset,
          control_instruction: resolvedInstruction,
        }),
      })
      const json = await res.json()
      if (res.status === 429 && json.limitKey) {
        setQuotaResult({
          allowed: false,
          limit: json.limit,
          current: json.current,
          limitKey: json.limitKey,
          message: json.error,
        })
        setUploading(false)
        return
      }
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Failed to create voice")
      onCreated(json.data)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setUploading(false)
    }
  }

  async function handleUploadClone() {
    if (!voiceName.trim() || !file) return

    setUploading(true)
    setError(null)

    try {
      // Step 1: Get presigned upload URL
      const fileExt = file.name.split(".").pop()?.toLowerCase() ?? "wav"
      const metaRes = await fetch("/api/voices/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: voiceName.trim(),
          file_ext: fileExt,
          file_type: file.type,
        }),
      })
      const metaJson = await metaRes.json()
      if (metaRes.status === 429 && metaJson.limitKey) {
        setQuotaResult({
          allowed: false,
          limit: metaJson.limit,
          current: metaJson.current,
          limitKey: metaJson.limitKey,
          message: metaJson.error,
        })
        setUploading(false)
        return
      }
      if (!metaRes.ok) throw new Error(typeof metaJson.error === "string" ? metaJson.error : "Failed to initiate upload")

      const { presignedUrl, path } = metaJson.data

      // Step 2: Upload file directly to R2
      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })
      if (!uploadRes.ok) throw new Error("Failed to upload audio file")

      // Step 3: Confirm upload and create voice record
      const confirmRes = await fetch("/api/voices/upload/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path,
          name: voiceName.trim(),
        }),
      })
      const confirmJson = await confirmRes.json()
      if (!confirmRes.ok) throw new Error(typeof confirmJson.error === "string" ? confirmJson.error : "Failed to save voice")

      onCreated(confirmJson.data)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#18181B]">
            {step === "choose"
              ? "Add Voice"
              : step === "preset"
                ? "Choose a Preset"
                : "Clone Your Voice"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-zinc-100 hover:text-[#18181B]"
            aria-label="Close"
          >
            <span className="text-lg">✕</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Step: Choose type */}
        {step === "choose" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setStep("preset")}
              className="flex w-full items-center gap-4 rounded-xl border border-zinc-200 p-4 text-left transition-all hover:border-zinc-300 hover:bg-zinc-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                <Music className="h-5 w-5 text-[#71717A]" />
              </div>
              <div>
                <p className="font-medium text-[#18181B]">Use a preset voice</p>
                <p className="text-sm text-[#71717A]">
                  Pick from a selection of built-in voices
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStep("clone")}
              disabled={clonedVoicesCount >= 1}
              className="flex w-full items-center gap-4 rounded-xl border border-zinc-200 p-4 text-left transition-all hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                <Mic className="h-5 w-5 text-[#71717A]" />
              </div>
              <div>
                <p className="font-medium text-[#18181B]">Clone your voice</p>
                <p className="text-sm text-[#71717A]">
                  Upload a 30-second voice sample to create a clone
                </p>
                {clonedVoicesCount >= 1 && <p className="text-xs text-amber-600 mt-1">Limit reached (1 of 1 used)</p>}
              </div>
            </button>
          </div>
        )}

        {/* Step: Pick preset */}
        {step === "preset" && (
          <div className="space-y-3">
            {/* Built-in preset selection */}
            <div>
              <p className="mb-2 text-sm font-medium text-[#71717A]">Built-in voices</p>
              <div className="grid grid-cols-1 gap-2">
                {PRESET_VOICES.map((pv) => (
                  <button
                    key={pv.id}
                    type="button"
                    onClick={() => setSelectedPreset(selectedPreset === pv.id ? null : pv.id)}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                      selectedPreset === pv.id
                        ? "border-[#18181B] bg-zinc-50"
                        : "border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                      <Music className="h-4 w-4 text-[#71717A]" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-[#18181B]">
                        {pv.label}
                      </span>
                      <p className="text-xs text-[#71717A]">{pv.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-200" />
              <span className="text-xs text-zinc-400">or create your own</span>
              <div className="h-px flex-1 bg-zinc-200" />
            </div>

            {/* Voice name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
                Voice name
              </label>
              <input
                type="text"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="e.g. Training Narrator"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-[#18181B] outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-400"
              />
            </div>

            {/* Control instruction — only for custom presets */}
            {!selectedPreset ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
                  Control instruction <span className="text-xs text-[#71717A]">(required for custom voices)</span>
                </label>
                <textarea
                  value={controlInstruction}
                  onChange={(e) => setControlInstruction(e.target.value)}
                  placeholder="Describe how this voice should sound — e.g. 'A calm, professional male voice with clear enunciation...'"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-[#18181B] outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-400"
                />
                <p className="mt-1 text-xs text-[#71717A]">
                  This instruction will be pre-filled and locked when you use this voice in the editor.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                <p className="text-xs text-[#71717A]">
                  This built-in voice uses pre-configured settings. No control instruction needed.
                </p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setStep("choose"); setSelectedPreset(null); setVoiceName(""); setControlInstruction(""); }}
                className="text-sm font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSavePreset}
                disabled={
                  uploading ||
                  !voiceName.trim() ||
                  (!selectedPreset && !controlInstruction.trim()) ||
                  (!!selectedPreset && !voiceName.trim())
                }
                className="inline-flex items-center gap-2 rounded-lg border border-[#18181B]/70 bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-all hover:border-[#18181B] hover:bg-[#27272A] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                {selectedPreset ? "Save Voice" : "Create Custom Voice"}
              </button>
            </div>
          </div>
        )}

        {/* Step: Upload clone */}
        {step === "clone" && (
          <div className="space-y-4">
            {/* File upload */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
                Voice sample
              </label>
              <div
                onClick={() => fileRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 p-6 transition-colors hover:border-zinc-300"
              >
                {file ? (
                  <div className="text-center">
                    <Mic className="mx-auto mb-2 h-6 w-6 text-[#71717A]" />
                    <p className="text-sm font-medium text-[#18181B]">{file.name}</p>
                    <p className="text-xs text-zinc-400">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Mic className="mx-auto mb-2 h-6 w-6 text-[#71717A]" />
                    <p className="text-sm font-medium text-[#18181B]">
                      Click to upload
                    </p>
                    <p className="text-xs text-zinc-400">
                      WAV, MP3, or M4A · 30 to 50 seconds · Max 10MB
                    </p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>


            {/* Voice name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
                Voice name
              </label>
              <input
                type="text"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="e.g. My Training Voice"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-[#18181B] outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-400"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => { setStep("choose"); setFile(null); setVoiceName(""); }}
                className="text-sm font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleUploadClone}
                disabled={!file || !voiceName.trim() || uploading}
                className="inline-flex items-center gap-2 rounded-lg border border-[#18181B]/70 bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-all hover:border-[#18181B] hover:bg-[#27272A] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                {uploading ? "Uploading..." : "Save Voice"}
              </button>
            </div>
          </div>
        )}
      </div>

      {quotaResult && (
        <WaitlistDialog
          quota={quotaResult}
          onClose={() => setQuotaResult(null)}
        />
      )}
    </div>
  )
}

// ── Test Voice Modal ─────────────────────────────────
const TEST_TEXT =
  "At Moduvox, we turn slides into narrated training videos using your own voice. This preview shows how your presentation will sound."

function TestVoiceModal({
  voice,
  onClose,
}: {
  voice: Voice
  onClose: () => void
}) {
  const [state, setState] = useState<"idle" | "generating" | "done">("idle")
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setState("generating")
    setError(null)

    try {
      const res = await fetch("/api/generate/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: voice.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Generation failed")
      setAudioUrl(json.data.audioUrl)
      setState("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
      setState("idle")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#18181B]">Test Voice</h2>
            <p className="text-sm text-[#71717A]">{voice.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-zinc-100 hover:text-[#18181B]"
            aria-label="Close"
          >
            <span className="text-lg">✕</span>
          </button>
        </div>

        {/* Example text */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Example narration
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#18181B]">
            {TEST_TEXT}
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
          >
            Close
          </button>

          {state === "idle" && (
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 rounded-lg border border-[#18181B]/70 bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-all hover:border-[#18181B] hover:bg-[#27272A]"
            >
              <Volume2 className="h-4 w-4" strokeWidth={1.5} />
              Generate preview
            </button>
          )}

          {state === "generating" && (
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-zinc-300 px-4 py-2 text-sm font-medium text-zinc-500"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </button>
          )}

          {state === "done" && (
            <audio
              controls
              src={audioUrl ?? ""}
              className="w-full max-w-[260px] rounded-lg"
              style={{ height: 36 }}
            >
              Your browser does not support the audio element.
            </audio>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────
export default function VoicesPage() {
  const [voices, setVoices] = useState<Voice[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [testVoice, setTestVoice] = useState<Voice | null>(null)
  const [deleteVoice, setDeleteVoice] = useState<Voice | null>(null)
  useEffect(() => {
    async function fetchVoices() {
      try {
        const res = await fetch("/api/voices")
        const json = await res.json()
        if (res.ok) setVoices(json.data ?? [])
      } catch {
        // silent fail — empty state will show
      } finally {
        setLoading(false)
      }
    }
    fetchVoices()
  }, [])

  async function handleDelete(id: string) {
    setVoices((prev) => prev.filter((v) => v.id !== id))
  }

  function handleCreated(voice: Voice) {
    setVoices((prev) => [voice, ...prev])
  }

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-faint)] bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-[#18181B]">My Voices</h1>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#71717A] transition-colors duration-150 hover:text-[#18181B]"
        >
          <Plus className="h-4 w-4" />
          Add Voice
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 px-6 py-8">
        {loading ? (
          <div className="w-full space-y-2">
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 animate-pulse" />
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="h-4 w-32 rounded bg-zinc-100 animate-pulse" />
                    <div className="hidden h-3 w-48 rounded bg-zinc-100 animate-pulse md:block" />
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="h-5 w-14 rounded-md bg-zinc-100 animate-pulse" />
                    <div className="hidden h-3 w-16 rounded bg-zinc-100 animate-pulse sm:block" />
                    <div className="h-7 w-7 rounded-lg bg-zinc-100 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : voices.length > 0 ? (
          <div className="w-full overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <div className="divide-y divide-zinc-100">
              {voices.map((v) => (
                <VoiceRow
                  key={v.id}
                  voice={v}
                  onTest={setTestVoice}
                  onDelete={setDeleteVoice}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex w-full items-center justify-center">
            <div className="mx-auto max-w-sm text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100">
                <Mic className="h-7 w-7 text-[#71717A]" />
              </div>
              <h2 className="text-xl font-semibold text-[#18181B]">
                No voices yet
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#71717A]">
                Add a preset voice or clone your own to use in narrated
                presentations.
              </p>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#71717A] transition-colors duration-150 hover:text-[#18181B]"
              >
                <Plus className="h-4 w-4" />
                Add your first voice
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <AddVoiceModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
          clonedVoicesCount={voices.filter(v => v.type === 'cloned').length}
        />
      )}
      {testVoice && (
        <TestVoiceModal
          voice={testVoice}
          onClose={() => setTestVoice(null)}
        />
      )}
      {deleteVoice && (
        <DeleteVoiceDialog
          voice={deleteVoice}
          onClose={() => setDeleteVoice(null)}
          onDeleted={() => handleDelete(deleteVoice.id)}
        />
      )}
    </>
  )
}
