"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

type Tab = "profile" | "security"

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setEmail(user.email ?? "")

      const { data } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .maybeSingle()

      setName(data?.name ?? user.user_metadata?.full_name ?? "")
      setLoading(false)
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

  async function handleResetPassword() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) {
      setError(error.message)
    } else {
      setResetSent(true)
    }
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
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#71717A]" />
      </div>
    )
  }

  return (
    <>
      {/* Top bar */}
      <div className="border-b border-[var(--color-border-faint)] bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-[#18181B]">Settings</h1>
        <div className="mt-3 flex gap-1">
          {(["profile", "security"] as const).map((t) => (
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
              {t === "profile" ? "Profile" : "Security"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 px-6 py-8">
        <div className="mx-auto w-full max-w-lg">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

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
                className="inline-flex items-center gap-2 rounded-lg bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#27272A] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          )}

          {/* ── Security Tab ─────────────────────── */}
          {tab === "security" && (
            <div className="space-y-8">
              {/* Password reset */}
              <div>
                <h2 className="text-base font-semibold text-[#18181B]">Password</h2>
                <p className="mt-1 text-sm text-[#71717A]">
                  Change your password via email reset. A reset link will be sent
                  to your email address.
                </p>

                {resetSent ? (
                  <p className="mt-3 text-sm font-medium text-emerald-600">
                    Reset email sent. Check your inbox.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-[#18181B] transition-all hover:bg-zinc-50"
                  >
                    Send reset email
                  </button>
                )}
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
        </div>
      </div>
    </>
  )
}
