"use client"

import { useState, useEffect, useCallback } from "react"
import { Copy, Check, Link, Lock, Clock, Globe, Info, Loader2, Eye, EyeOff, CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

export function ShareSettingsPanel({
  presentationId,
}: {
  presentationId: string
}) {
  const [settings, setSettings] = useState<{
    share_url: string
    has_password: boolean
    expires_at: string | null
    email_gate_enabled: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
const [showPasswordInput, setShowPasswordInput] = useState(false)
const [showPassword, setShowPassword] = useState(false)
const [expireDate, setExpireDate] = useState<Date | undefined>(undefined)
  const [expireTime, setExpireTime] = useState("23:59")
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/presentations/${presentationId}/share`)
      if (res.ok) {
        const json = await res.json()
        setSettings(json.data)
        if (json.data.expires_at) {
          const dt = new Date(json.data.expires_at)
          setExpireDate(dt)
          setExpireTime(format(dt, "HH:mm"))
        }
      }
    } catch (err) {
      console.error("[ShareSettingsPanel] Settings fetch failed:", err)
    } finally {
      setLoading(false)
    }
  }, [presentationId])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  async function updateSettings(updates: Record<string, unknown>) {
    setSaveState("saving")
    try {
      const res = await fetch(`/api/presentations/${presentationId}/share`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const json = await res.json()
        setSettings(json.data)
        setSaveState("saved")
        setTimeout(() => setSaveState("idle"), 1500)
      } else {
        setSaveState("idle")
      }
    } catch {
      setSaveState("idle")
    }
  }

  function handleCopyLink() {
    if (!settings?.share_url) return
    navigator.clipboard.writeText(settings.share_url).then(() => {
      setCopied(true)
      toast.success("Link copied")
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleCopyInvite() {
    if (!settings?.share_url) return
    const msg = `Hi, I've shared a training presentation with you.\nWatch it here: ${settings.share_url}\nYou'll need to verify your email before watching.`
    navigator.clipboard.writeText(msg).then(() => {
      toast.success("Invite message copied")
    })
  }

  function handleSetPassword() {
    if (!passwordInput.trim()) return
    updateSettings({ password: passwordInput.trim() })
    setShowPasswordInput(false)
    setPasswordInput("")
  }

  function handleClearPassword() {
    updateSettings({ password: null })
  }

  function handleSetExpiration() {
    if (!expireDate) return
    const [hours, minutes] = expireTime.split(":").map(Number)
    const dt = new Date(expireDate)
    dt.setHours(hours, minutes, 0, 0)
    if (isNaN(dt.getTime())) return
    updateSettings({ expires_at: dt.toISOString() })
  }

  function handleClearExpiration() {
    setExpireDate(undefined)
    setExpireTime("23:59")
    updateSettings({ expires_at: null })
  }

  function handleToggleEmailGate() {
    if (!settings) return
    updateSettings({ email_gate_enabled: !settings.email_gate_enabled })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (!settings) return null

  return (
    <div className={`space-y-5 rounded-xl border bg-white p-6 transition-all duration-300 ${
      saveState === "saving"
        ? "border-[#18181B] shadow-[0_0_0_1px_#18181B]"
        : saveState === "saved"
          ? "border-green-500 shadow-[0_0_0_1px_#22c55e]"
          : "border-zinc-200"
    }`}>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[#18181B]">
        <Link className="h-4 w-4" />
        Share Settings
        {saveState === "saving" && <span className="ml-1 h-2 w-2 rounded-full bg-[#18181B] animate-pulse" />}
        {saveState === "saved" && <span className="ml-1 h-2 w-2 rounded-full bg-green-500" />}
      </h3>

      {/* Share link */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Share Link</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={settings.share_url}
            className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600"
          />
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-[#18181B]"
            aria-label="Copy link"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <button
          type="button"
          onClick={handleCopyInvite}
          className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-[#18181B]"
        >
          Copy invite message
        </button>
      </div>

      {/* Email gate toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-zinc-500" />
            <label className="text-sm font-medium text-[#18181B]">Email Gate</label>
            <div className="group relative">
              <Info className="h-3.5 w-3.5 text-zinc-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 mb-2 w-56 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 shadow-lg opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
                Viewers will receive a verification email to confirm their identity. This prevents people from watching on behalf of someone else.
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.email_gate_enabled}
            onClick={handleToggleEmailGate}
            disabled={saveState === "saving"}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
               settings.email_gate_enabled ? "bg-[#18181B]" : "bg-zinc-300"
             }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                settings.email_gate_enabled ? "translate-x-4.5" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-zinc-400">
          {settings.email_gate_enabled
            ? "Viewers must verify their email via magic link before watching."
            : "Anyone with the link can watch without verification."}
        </p>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className={`h-4 w-4 ${settings.has_password ? "text-green-600" : "text-zinc-500"}`} />
            <label className="text-sm font-medium text-[#18181B]">Password Protection</label>
          </div>
          {settings.has_password && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
              <Check className="h-3 w-3" />
              Active
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-400">
          {settings.has_password
            ? "Viewers must enter a password to watch."
            : "Protect this presentation with a password."}
        </p>

        {settings.has_password ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPasswordInput(true)}
              className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-[#18181B]"
            >
              Change password
            </button>
            <span className="text-xs text-zinc-300">|</span>
            <button
              type="button"
              onClick={handleClearPassword}
              disabled={saveState === "saving"}
              className="text-xs text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPasswordInput(true)}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Set password
          </button>
        )}

        {/* Expandable inline password form */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            showPasswordInput ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="mt-2 space-y-3 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">
                  {settings.has_password ? "New password" : "Password"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter a password"
                    maxLength={128}
                    autoFocus
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 pr-10 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                    onKeyDown={(e) => { if (e.key === "Enter") { handleSetPassword(); setShowPasswordInput(false); setShowPassword(false) }; if (e.key === "Escape") { setShowPasswordInput(false); setShowPassword(false) } }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-zinc-400">{passwordInput.length} / 128 characters</p>
              </div>

              {/* Strength indicator */}
              {passwordInput.length > 0 && (
                <div>
                  <div className="h-1 w-full rounded-full bg-zinc-200">
                    <div
                      className={`h-1 rounded-full transition-all duration-200 ${
                        passwordInput.length < 6
                          ? "w-1/3 bg-red-400"
                          : passwordInput.length < 10
                            ? "w-2/3 bg-amber-400"
                            : "w-full bg-green-400"
                      }`}
                    />
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    {passwordInput.length < 6
                      ? "Too short"
                      : passwordInput.length < 10
                        ? "Fair"
                        : "Strong"}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { handleSetPassword(); setShowPasswordInput(false); setShowPassword(false) }}
                  disabled={saveState === "saving" || !passwordInput.trim()}
                  className="flex-1 rounded-lg bg-[#18181B] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#27272A] disabled:opacity-50"
                >
                  {saveState === "saving" ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Saving…
                    </span>
                  ) : settings.has_password ? (
                    "Update Password"
                  ) : (
                    "Set Password"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowPasswordInput(false); setShowPassword(false); setPasswordInput("") }}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expiration */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-zinc-500" />
          <label className="text-sm font-medium text-[#18181B]">Expiration</label>
        </div>
        {!settings.expires_at && (
          <p className="text-xs text-zinc-400">If no date is set, the link will never expire.</p>
        )}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex flex-1 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  expireDate
                    ? "border-zinc-300 text-[#18181B]"
                    : "border-zinc-300 text-zinc-400 hover:border-zinc-400",
                )}
              >
                <CalendarIcon className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="flex-1 text-left">
                  {expireDate
                    ? `${format(expireDate, "MMM d, yyyy")} at ${expireTime}`
                    : "Pick a date and time"}
                </span>
                {expireDate && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setExpireDate(undefined); setExpireTime("23:59") }}
                    className="rounded p-0.5 text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={expireDate}
                onSelect={setExpireDate}
                disabled={(date) => date < new Date()}
              />
              <div className="flex items-center gap-2 border-t border-zinc-200 p-3">
                <input
                  type="time"
                  value={expireTime}
                  onChange={(e) => setExpireTime(e.target.value)}
                  className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-xs focus:border-zinc-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => { handleSetExpiration(); document.body.click() }}
                  disabled={saveState === "saving" || !expireDate}
                  className="rounded-md bg-[#18181B] px-3 py-1 text-xs font-medium text-white hover:bg-[#27272A] disabled:opacity-50"
                >
                  Set
                </button>
              </div>
            </PopoverContent>
          </Popover>
          {settings.expires_at && (
            <button
              type="button"
              onClick={handleClearExpiration}
              disabled={saveState === "saving"}
              className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50 shrink-0"
            >
              Reset
            </button>
          )}
        </div>
        {settings.expires_at && (
          <p className="text-xs text-zinc-400">
            Expires: {new Date(settings.expires_at).toLocaleString()}
          </p>
        )}
      </div>

    </div>
  )
}
