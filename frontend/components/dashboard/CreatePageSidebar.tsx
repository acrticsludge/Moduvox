"use client"

import { useEffect, useState } from "react"
import { Mic, Info } from "lucide-react"
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
}

export function CreatePageSidebar() {
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState("")
  const [controlInstructions, setControlInstructions] = useState("")
  const [ultimateMode, setUltimateMode] = useState(false)

  const selectedVoice = voices.find((v) => v.id === selectedVoiceId)
  const isCloned = selectedVoice?.type === "cloned"

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from("voices")
        .select("id, name, type, preset_id")
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
    setSelectedVoiceId(value)
    const voice = voices.find((v) => v.id === value)
    if (voice?.type === "preset") {
      setUltimateMode(false)
    }
  }

  return (
    <aside className="flex w-80 flex-shrink-0 flex-col gap-6 border-r border-[var(--color-border-faint)] bg-white p-5">
      {/* Voice selector */}
      <div className="space-y-2">
        <Label htmlFor="voice-select" className="flex items-center gap-2 text-sm font-semibold text-[#18181B]">
          <Mic className="h-4 w-4" />
          Voice
        </Label>
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

      {/* Control instructions */}
      <div className="space-y-2">
        <Label htmlFor="control-instructions" className="text-sm font-semibold text-[#18181B]">
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
          onChange={(e) => setControlInstructions(e.target.value)}
          className="min-h-[100px] resize-none"
        />
        <p className="text-xs text-[#71717A]">
          {isCloned
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
              onCheckedChange={setUltimateMode}
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
