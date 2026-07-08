"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Loader2, LogOut } from "lucide-react"
import { ErrorBanner } from "@/components/ui/ErrorBanner"
import { useRouter } from "next/navigation"

type Tab = "profile" | "security" | "api-keys"

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)

  // Gemini API key
  const [geminiKey, setGeminiKey] = useState("")
  const [geminiKeyDisplay, setGeminiKeyDisplay] = useState("")
  const [geminiKeyExists, setGeminiKeyExists] = useState(false)
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [savingGemini, setSavingGemini] = useState(false)
  const [geminiMessage, setGeminiMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        setEmail(user.email ?? "")

        const { data } = await supabase
          .from("users")
          .select("name")
          .eq("id", user.id)
          .maybeSingle()

        setName(data?.name ?? user.user_metadata?.full_name ?? "")

        // Load Gemini key status
        const keyRes = await fetch("/api/user/gemini-key")
        const keyJson = await keyRes.json()
        const storedKey = keyJson.data?.geminiApiKey
        setGeminiKeyExists(!!storedKey)
        if (storedKey) {
          // Show last 4 chars masked
          setGeminiKeyDisplay(`············${storedKey.slice(-4)}`)
        }
      } catch {
        // Data fetch failed — settings form shows with empty fields
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [supabase])

  async function handleSaveProfile() {
    setSaving(true)
    setSaveMessage(null)
    setError(null)

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Failed to save")
      setSaveMessage("Profile saved")
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setChangingPassword(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setError(error.message)
      setChangingPassword(false)
      return
    }

    setPasswordChanged(true)
    setShowPasswordForm(false)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setChangingPassword(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "DELETE") return
    setDeleting(true)
    setError(null)

    try {
      const res = await fetch("/api/user/account", { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Failed to delete")

      await supabase.auth.signOut()
      window.location.href = "/"
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete account")
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 px-6 py-8">
        <div className="mx-auto w-full max-w-lg space-y-5">
          <div>
            <div className="mb-1.5 h-4 w-10 rounded bg-zinc-100 animate-pulse" />
            <div className="h-10 w-full rounded-lg bg-zinc-100 animate-pulse" />
          </div>
          <div>
            <div className="mb-1.5 h-4 w-12 rounded bg-zinc-100 animate-pulse" />
            <div className="h-10 w-full rounded-lg bg-zinc-50 animate-pulse" />
            <div className="mt-1 h-3 w-32 rounded bg-zinc-100 animate-pulse" />
          </div>
          <div className="h-10 w-28 rounded-lg bg-zinc-100 animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Top bar */}
      <div className="border-b border-[var(--color-border-faint)] bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-[#18181B]">Settings</h1>
        <div className="mt-3 flex gap-1">
          {(["profile", "security", "api-keys"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-zinc-100 text-[#18181B]"
                  : "text-[#71717A] hover:text-[#18181B]"
              }`}
            >
              {t === "profile" ? "Profile" : t === "security" ? "Security" : "API Keys"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 px-6 py-8">
        <div className="mx-auto w-full max-w-lg shadow-red-500/10">
          <ErrorBanner message={error} className="mb-4" />

          {saveMessage && (
            <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
              {saveMessage}
            </div>
          )}

          {/* ── Profile Tab ──────────────────────── */}
          {tab === "profile" && (
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-[#18181B] outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 outline-none"
                />
                <p className="mt-1 text-xs text-zinc-400">
                  Email cannot be changed.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving || !name.trim()}
                className="inline-flex items-center gap-2 rounded-lg border border-[#18181B]/70 bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-all hover:border-[#18181B] hover:bg-[#27272A] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          )}

          {/* ── Security Tab ─────────────────────── */}
          {tab === "security" && (
            <div className="space-y-8">
              {/* Password change */}
              <div>
                <h2 className="text-base font-semibold text-[#18181B]">Password</h2>
                <p className="mt-1 text-sm text-[#71717A]">
                  Set a new password for your account.
                </p>

                {passwordChanged ? (
                  <p className="mt-3 text-sm font-medium text-emerald-600">
                    Password changed successfully.
                  </p>
                ) : !showPasswordForm ? (
                  <button
                    type="button"
                    onClick={() => setShowPasswordForm(true)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-[#18181B] transition-all hover:bg-zinc-50"
                  >
                    Change password
                  </button>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
                        New password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-[#18181B] outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
                        Confirm new password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-[#18181B] outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { setShowPasswordForm(false); setError(null) }}
                        className="rounded-lg px-3 py-2 text-sm font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleChangePassword}
                        disabled={changingPassword || !newPassword || !confirmPassword}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#18181B]/70 bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-all hover:border-[#18181B] hover:bg-[#27272A] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {changingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                        {changingPassword ? "Saving..." : "Save password"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <hr className="border-zinc-200" />

              {/* Log out */}
              <div>
                <h2 className="text-base font-semibold text-[#18181B]">Session</h2>
                <p className="mt-1 text-sm text-[#71717A]">
                  Sign out of your account on this device.
                </p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-[#18181B] transition-all hover:bg-zinc-50"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>

              <hr className="border-zinc-200" />

              {/* Delete account */}
              <div>
                <h2 className="text-base font-semibold text-red-600">Delete Account</h2>
                <p className="mt-1 text-sm text-[#71717A]">
                  Permanently delete your account and all associated data
                  (voices, presentations). This cannot be undone.
                </p>

                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-50"
                  >
                    Delete account
                  </button>
                ) : (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-600">
                      Are you sure?
                    </p>
                    <p className="mt-1 text-sm text-red-500">
                      Type <span className="font-bold">DELETE</span> to confirm.
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE"
                      className="mt-3 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-[#18181B] outline-none transition-colors placeholder:text-zinc-400 focus:border-red-400"
                    />
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText("") }}
                        className="rounded-lg px-3 py-2 text-sm font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== "DELETE" || deleting}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {deleting ? "Deleting..." : "Permanently delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── API Keys Tab ──────────────────────── */}
          {tab === "api-keys" && (
            <div className="space-y-6">
              {/* Gemini API Key */}
              <div>
                <h2 className="text-base font-semibold text-[#18181B]">Gemini API Key</h2>
                <p className="mt-1 text-sm text-[#71717A]">
                  Used for AI narration generation. Add your own key for unlimited generation
                  (shared key is capped at 5 requests/minute).
                </p>

                {geminiMessage?.type === "error" && (
                  <ErrorBanner message={geminiMessage.text} />
                )}
                {geminiMessage?.type === "success" && (
                  <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
                    {geminiMessage.text}
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showGeminiKey ? "text" : "password"}
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        placeholder={geminiKeyExists ? geminiKeyDisplay : "Paste your Gemini API key"}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 pr-10 text-sm text-[#18181B] outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 transition-colors hover:text-zinc-600"
                        aria-label={showGeminiKey ? "Hide key" : "Show key"}
                      >
                        {showGeminiKey ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">
                      Get a key from{" "}
                      <a
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 hover:text-zinc-600"
                      >
                        Google AI Studio
                      </a>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setSavingGemini(true)
                        setGeminiMessage(null)
                        try {
                          const res = await fetch("/api/user/gemini-key", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ geminiApiKey: geminiKey.trim() || null }),
                          })
                          const json = await res.json()
                          if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Failed to save")
                          if (geminiKey.trim()) {
                            setGeminiKeyDisplay(`············${geminiKey.trim().slice(-4)}`)
                            setGeminiKeyExists(true)
                            setGeminiMessage({ type: "success", text: "Gemini API key saved." })
                          } else {
                            setGeminiKeyExists(false)
                            setGeminiKeyDisplay("")
                            setGeminiMessage({ type: "success", text: "Gemini API key removed." })
                          }
                          setGeminiKey("")
                        } catch (e) {
                          setGeminiMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to save" })
                        } finally {
                          setSavingGemini(false)
                        }
                      }}
                      disabled={savingGemini}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#18181B]/70 bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-all hover:border-[#18181B] hover:bg-[#27272A] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {savingGemini && <Loader2 className="h-4 w-4 animate-spin" />}
                      {savingGemini ? "Saving..." : geminiKeyExists ? "Update" : "Save"}
                    </button>
                    {geminiKeyExists && (
                      <button
                        type="button"
                        onClick={async () => {
                          setSavingGemini(true)
                          setGeminiMessage(null)
                          try {
                            await fetch("/api/user/gemini-key", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ geminiApiKey: null }),
                            })
                            setGeminiKeyExists(false)
                            setGeminiKeyDisplay("")
                            setGeminiKey("")
                            setGeminiMessage({ type: "success", text: "Gemini API key removed." })
                          } catch {
                            setGeminiMessage({ type: "error", text: "Failed to remove key." })
                          } finally {
                            setSavingGemini(false)
                          }
                        }}
                        disabled={savingGemini}
                        className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-[#71717A] transition-all hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
