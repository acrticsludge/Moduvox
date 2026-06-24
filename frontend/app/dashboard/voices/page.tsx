"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Plus, Mic, Play, Trash2, Music, Loader2 } from "lucide-react"

// ── Types ────────────────────────────────────────────
type Voice = {
  id: string
  user_id: string
  name: string
  type: "preset" | "cloned"
  sample_path: string | null
  sample_duration_seconds: number | null
  emotion_default: string
  is_active: boolean
  created_at: string
}

const PRESET_VOICES = [
  { id: "calm-female", label: "Calm Female" },
  { id: "energetic-male", label: "Energetic Male" },
  { id: "soft-narrator", label: "Soft Narrator" },
  { id: "professional-tone", label: "Professional Tone" },
  { id: "warm-friendly", label: "Warm Friendly" },
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
  onPlay,
}: {
  voice: Voice
  onDelete: (id: string) => void
  onPlay: (voice: Voice) => void
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 transition-all duration-150 hover:border-zinc-300 hover:shadow-sm">
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
              {voice.type === "preset"
                ? "Preset voice"
                : "Cloned voice"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {voice.type === "cloned" && (
            <button
              type="button"
              onClick={() => onPlay(voice)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-zinc-100 hover:text-[#18181B]"
              aria-label="Play sample"
            >
              <Play className="h-4 w-4" />
            </button>
          )}
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

      <p className="mt-3 text-xs text-zinc-400">Created {formatDate(voice.created_at)}</p>

      {voice.type === "cloned" && voice.sample_path && (
        <div className="mt-3 rounded-lg bg-zinc-50 p-3">
          <button
            type="button"
            onClick={() => onPlay(voice)}
            className="flex w-full items-center justify-center gap-2 text-sm font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
          >
            <Play className="h-3.5 w-3.5" />
            Preview voice sample
          </button>
        </div>
      )}
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
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    selectedPreset === pv.id
                      ? "border-[#18181B] bg-zinc-50"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100">
                    <Music className="h-4 w-4 text-[#71717A]" />
                  </div>
                  <span className="text-sm font-medium text-[#18181B]">
                    {pv.label}
                  </span>
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
                      WAV, MP3, or M4A · 30 seconds to 3 minutes · Max 10MB
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

// ── Main Page ────────────────────────────────────────
export default function VoicesPage() {
  const [voices, setVoices] = useState<Voice[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
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

  function handlePlay(voice: Voice) {
    if (!voice.sample_path) return
    const supabase = createClient()
    const { data } = supabase.storage.from("voice-samples").getPublicUrl(voice.sample_path)
    if (audioRef.current) audioRef.current.pause()
    const audio = new Audio(data.publicUrl)
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
                onPlay={handlePlay}
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

      {/* Modal */}
      {showModal && (
        <AddVoiceModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  )
}
