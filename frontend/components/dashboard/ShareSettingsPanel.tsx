"use client"

import { useState, useEffect, useCallback } from "react"
import { Copy, Check, Link, Lock, Clock, Globe, Info, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

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
  const [expireInput, setExpireInput] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/presentations/${presentationId}/share`)
      if (res.ok) {
        const json = await res.json()
        setSettings(json.data)
        if (json.data.expires_at) {
          // Convert ISO to datetime-local format
          setExpireInput(new Date(json.data.expires_at).toISOString().slice(0, 16))
        }
      }
    } catch {
      // Settings fetch failed — component will show nothing
    } finally {
      setLoading(false)
    }
  }, [presentationId])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  async function updateSettings(updates: Record<string, unknown>) {
    setSaving(true)
    try {
      const res = await fetch(`/api/presentations/${presentationId}/share`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const json = await res.json()
        setSettings(json.data)
        toast.success("Share settings updated")
      } else {
        toast.error("Failed to update settings")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setSaving(false)
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
    if (!expireInput) {
      updateSettings({ expires_at: null })
      return
    }
    // Convert datetime-local to ISO 8601
    const iso = new Date(expireInput).toISOString()
    updateSettings({ expires_at: iso })
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
    <div className="space-y-5 rounded-xl border border-zinc-200 bg-white p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[#18181B]">
        <Link className="h-4 w-4" />
        Share Settings
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
            disabled={saving}
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
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-zinc-500" />
          <label className="text-sm font-medium text-[#18181B]">Password Protection</label>
        </div>
        {settings.has_password ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-green-600">Password set</span>
            <button
              type="button"
              onClick={handleClearPassword}
              disabled={saving}
              className="text-xs font-medium text-red-500 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        ) : showPasswordInput ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSetPassword(); if (e.key === "Escape") setShowPasswordInput(false) }}
            />
            <button
              type="button"
              onClick={handleSetPassword}
              disabled={saving || !passwordInput.trim()}
              className="rounded-lg bg-[#18181B] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#27272A] disabled:opacity-50"
            >
              Set
            </button>
            <button
              type="button"
              onClick={() => setShowPasswordInput(false)}
              className="text-xs text-zinc-500 hover:text-zinc-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPasswordInput(true)}
            className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-[#18181B]"
          >
            Set password
          </button>
        )}
      </div>

      {/* Expiration */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-zinc-500" />
          <label className="text-sm font-medium text-[#18181B]">Expiration</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="datetime-local"
            value={expireInput}
            onChange={(e) => setExpireInput(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSetExpiration}
            disabled={saving}
            className="rounded-lg bg-[#18181B] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#27272A] disabled:opacity-50"
          >
            {settings.expires_at ? "Update" : "Set"}
          </button>
          {settings.expires_at && (
            <button
              type="button"
              onClick={() => { setExpireInput(""); updateSettings({ expires_at: null }) }}
              className="text-xs text-red-500 hover:text-red-600"
            >
              Clear
            </button>
          )}
        </div>
        {settings.expires_at && (
          <p className="text-xs text-zinc-400">
            Expires: {new Date(settings.expires_at).toLocaleString()}
          </p>
        )}
      </div>

      {saving && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving…
        </div>
      )}
    </div>
  )
}
