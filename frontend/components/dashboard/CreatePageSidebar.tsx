"use client"

import { useEffect, useState } from "react"
import { Mic, Play, Loader2, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

type Voice = {
  id: string
  name: string
  type: "preset" | "cloned"
  preset_id: string | null
  control_instruction: string | null
}

export function CreatePageSidebar({
  className,
  selectedVoiceId: externalVoiceId,
  onVoiceChange,
  controlInstructions: externalCi,
  onControlInstructionsChange,
  ultimateMode: externalUltimateMode,
  onUltimateModeChange,
}: {
  className?: string
  selectedVoiceId?: string
  onVoiceChange?: (voiceId: string) => void
  controlInstructions?: string
  onControlInstructionsChange?: (v: string) => void
  ultimateMode?: boolean
  onUltimateModeChange?: (v: boolean) => void
}) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [internalVoiceId, setInternalVoiceId] = useState("")
  const [internalCi, setInternalCi] = useState("")
  const [internalUlt, setInternalUlt] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null)

  // Use controlled values when provided, otherwise internal state
  const selectedVoiceId = externalVoiceId ?? internalVoiceId
  const controlInstructions = externalCi ?? internalCi
  const ultimateMode = externalUltimateMode ?? internalUlt

  const selectedVoice = voices.find((v) => v.id === selectedVoiceId)
  const isCloned = selectedVoice?.type === "cloned"
  const isPresetWithCi = !isCloned && !!selectedVoice?.control_instruction

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from("voices")
        .select("id, name, type, preset_id, control_instruction")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (data) setVoices(data as Voice[])
        })
    })
  }, [])

  const presetVoices = voices.filter((v) => v.type === "preset")
  const clonedVoices = voices.filter((v) => v.type === "cloned")

  function handleVoiceChange(value: string) {
    if (value === internalVoiceId) return
    setInternalVoiceId(value)
    onVoiceChange?.(value)
    setPreviewAudioUrl(null)
    const voice = voices.find((v) => v.id === value)
    if (voice?.type === "preset") {
      setInternalUlt(false)
      onUltimateModeChange?.(false)
      setInternalCi(voice.control_instruction || "")
      onControlInstructionsChange?.(voice.control_instruction || "")
    } else {
      setInternalCi("")
      onControlInstructionsChange?.("")
    }
  }

  async function handlePreviewVoice() {
    if (!selectedVoiceId || previewLoading) return
    setPreviewLoading(true)
    try {
      const res = await fetch("/api/generate/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: selectedVoiceId }),
      })
      const json = await res.json()
      if (json.data?.audioUrl) {
        setPreviewAudioUrl(json.data.audioUrl)
      }
    } catch { /* preview failed */ }
    setPreviewLoading(false)
  }

  return (
    <aside className={cn("flex w-80 flex-col gap-6 border-r border-[var(--color-border-faint)] bg-white p-5", className)}>
      {/* Voice selector */}
      <div className="space-y-2">
        <Label htmlFor="voice-select" className="flex items-center gap-2 text-sm font-semibold text-[#18181B]">
          <Mic className="h-4 w-4" />
          Voice
        </Label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Select value={selectedVoiceId} onValueChange={handleVoiceChange}>
              <SelectTrigger id="voice-select" className="w-full">
                <SelectValue placeholder="Select a voice..." />
              </SelectTrigger>
              <SelectContent>
                {voices.length === 0 && (
                  <div className="px-2 py-4 text-center text-sm text-[#71717A]">
                    No voices yet.{" "}
                    <a href="/dashboard/voices" className="underline hover:text-[#18181B]">
                      Create one
                    </a>
                  </div>
                )}
                {presetVoices.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Preset Voices</SelectLabel>
                    {presetVoices.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {clonedVoices.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Cloned Voices</SelectLabel>
                    {clonedVoices.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>
          {selectedVoiceId && (
            <button
              type="button"
              onClick={handlePreviewVoice}
              disabled={previewLoading}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-50"
              title="Preview voice"
            >
              {previewLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
        {previewAudioUrl && (
          <audio
            controls
            src={previewAudioUrl}
            className="w-full rounded-lg"
            style={{ height: 36 }}
          >
            Your browser does not support the audio element.
          </audio>
        )}
      </div>

      {/* Control instructions */}
      <div className="space-y-2">
        <Label
          htmlFor="control-instructions"
          className={`text-sm font-semibold transition-all duration-300 ${
            isCloned && ultimateMode ? "text-[#71717A]" : "text-[#18181B]"
          }`}
        >
          Control Instructions
        </Label>
        <Textarea
          id="control-instructions"
          placeholder={
            isCloned
              ? "Describe the tone and delivery..."
              : "Describe the voice you want to create..."
          }
          value={controlInstructions}
          onChange={(e) => {
            if (isPresetWithCi) return
            setInternalCi(e.target.value)
            onControlInstructionsChange?.(e.target.value)
          }}
          disabled={(isCloned && ultimateMode) || isPresetWithCi}
          className={`min-h-[100px] resize-none transition-all duration-300 ${
            (isCloned && ultimateMode) || isPresetWithCi ? "opacity-40" : "opacity-100"
          }`}
        />
        <p className={`text-xs transition-all duration-300 ${
          (isCloned && ultimateMode) || isPresetWithCi ? "text-zinc-300" : "text-[#71717A]"
        }`}>
          {isCloned && ultimateMode
            ? "Disabled when Ultimate Clone is active."
            : isPresetWithCi
              ? "Pre-set for this voice. Edit in My Voices to change."
              : isCloned
                ? "Guidance for how the cloned voice should deliver the narration."
                : "Describe the voice style (e.g. 'A calm, professional male voice')."}
        </p>
      </div>

      {/* Ultimate clone toggle */}
      {isCloned && (
        <div className="space-y-3 rounded-lg border border-[var(--color-border-faint)] p-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="ultimate-mode" className="text-sm font-semibold text-[#18181B]">
              Ultimate Clone
            </Label>
            <Switch
              id="ultimate-mode"
              checked={ultimateMode}
              onCheckedChange={(v) => {
                setInternalUlt(v)
                onUltimateModeChange?.(v)
              }}
            />
          </div>
          <div className="flex gap-2 text-xs text-[#71717A]">
            <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
            <p>
              Preserves every nuance of the reference voice.
              Control instructions are ignored when this mode is active.
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}
