"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Plus, Mic, Play, Trash2, Music, Loader2, Volume2 } from "lucide-react"

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

// ── Helpers ──────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// ── Voice Card ───────────────────────────────────────
function VoiceCard({
  voice,
  onDelete,
  onTest,
}: {
  voice: Voice
  onDelete: (id: string) => void
  onTest: (voice: Voice) => void
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loadingUrl, setLoadingUrl] = useState(false)
  const presetInfo = voice.preset_id
    ? PRESET_VOICES.find((p) => p.id === voice.preset_id)
    : null

  return (
    <div className="self-start rounded-xl border border-zinc-200 bg-white p-5 transition-all duration-150 hover:border-zinc-300 hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
            {voice.type === "preset" ? (
              <Music className="h-5 w-5 text-[#71717A]" />
            ) : (
              <Mic className="h-5 w-5 text-[#71717A]" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-[#18181B]">{voice.name}</h3>
            <p className="text-sm text-[#71717A]">
              {voice.type === "preset" ? "Preset" : "Cloned voice"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onDelete(voice.id)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label="Delete voice"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {voice.type === "preset" && presetInfo && (
        <p className="mt-4 text-xs leading-relaxed text-zinc-500">
          {presetInfo.description}
        </p>
      )}

      <button
        type="button"
        onClick={() => onTest(voice)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
      >
        <Volume2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        Test voice
      </button>

      {voice.type === "cloned" && voice.sample_path && (
        <div className="mt-3">
          {previewUrl ? (
            <audio
              controls
              src={previewUrl}
              className="w-full rounded-lg"
              style={{ height: 40 }}
            >
              Your browser does not support the audio element.
            </audio>
          ) : (
            <div className="rounded-lg bg-zinc-50 p-3">
              <button
                type="button"
                onClick={async () => {
                  if (loadingUrl) return
                  setLoadingUrl(true)
                  const supabase = createClient()
                  const { data } = await supabase.storage
                    .from("voice-samples")
                    .createSignedUrl(voice.sample_path!, 300)
                  if (data) setPreviewUrl(data.signedUrl)
                  setLoadingUrl(false)
                }}
                disabled={loadingUrl}
                className="flex w-full items-center justify-center gap-2 text-sm font-medium text-[#71717A] transition-colors hover:text-[#18181B] disabled:opacity-50"
              >
                {loadingUrl ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {loadingUrl ? "Loading..." : "Preview voice sample"}
              </button>
            </div>
          )}
        </div>
      )}

      <p className="mt-1 text-xs text-zinc-400">Created {formatDate(voice.created_at)}</p>
    </div>
  )
}

// ── Add Voice Modal ──────────────────────────────────
function AddVoiceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (voice: Voice) => void
}) {
  const [step, setStep] = useState<"choose" | "preset" | "clone">("choose")
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [voiceName, setVoiceName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSavePreset() {
    if (!voiceName.trim() || !selectedPreset) return

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
        }),
      })
      const json = await res.json()
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
      const formData = new FormData()
      formData.append("file", file)
      formData.append("name", voiceName.trim())

      const res = await fetch("/api/voices/upload", {
        method: "POST",
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Failed to upload voice")
      onCreated(json.data)
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
              className="flex w-full items-center gap-4 rounded-xl border border-zinc-200 p-4 text-left transition-all hover:border-zinc-300 hover:bg-zinc-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                <Mic className="h-5 w-5 text-[#71717A]" />
              </div>
              <div>
                <p className="font-medium text-[#18181B]">Clone your voice</p>
                <p className="text-sm text-[#71717A]">
                  Upload a 30-second voice sample to create a clone
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Step: Pick preset */}
        {step === "preset" && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
                  {PRESET_VOICES.map((pv) => (
                    <button
                      key={pv.id}
                      type="button"
                      onClick={() => setSelectedPreset(pv.id)}
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

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
                Voice name
              </label>
              <input
                type="text"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="e.g. Training Narrator"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-[#18181B] outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400"
              />
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setStep("choose"); setSelectedPreset(null); setVoiceName(""); }}
                className="text-sm font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSavePreset}
                disabled={!selectedPreset || !voiceName.trim() || uploading}
                className="inline-flex items-center gap-2 rounded-lg bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#27272A] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Voice
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
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-[#18181B] outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400"
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
                className="inline-flex items-center gap-2 rounded-lg bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#27272A] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                {uploading ? "Uploading..." : "Save Voice"}
              </button>
            </div>
          </div>
        )}
      </div>
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
              className="inline-flex items-center gap-2 rounded-lg bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#27272A]"
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
  const audioRef = useRef<HTMLAudioElement | null>(null)

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

  async function handlePlay(voice: Voice) {
    if (!voice.sample_path) return
    const supabase = createClient()
    const { data } = await supabase.storage
      .from("voice-samples")
      .createSignedUrl(voice.sample_path, 60)
    if (!data) return
    if (audioRef.current) audioRef.current.pause()
    const audio = new Audio(data.signedUrl)
    audioRef.current = audio
    audio.play()
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this voice? This cannot be undone.")) return
    try {
      const res = await fetch(`/api/voices/${id}`, { method: "DELETE" })
      if (res.ok) setVoices((prev) => prev.filter((v) => v.id !== id))
    } catch {
      // silent
    }
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
          <div className="flex w-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#71717A]" />
          </div>
        ) : voices.length > 0 ? (
          <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {voices.map((v) => (
                <VoiceCard
                  key={v.id}
                  voice={v}
                  onDelete={handleDelete}
                  onTest={setTestVoice}
                />
              ))}
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
        />
      )}
      {testVoice && (
        <TestVoiceModal
          voice={testVoice}
          onClose={() => setTestVoice(null)}
        />
      )}
    </>
  )
}
