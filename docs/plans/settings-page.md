# Settings Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a settings page at `/dashboard/settings` with Profile tab (name, email) and Security tab (password reset, delete account).

**Architecture:** Client component page using the existing dashboard layout. Two API routes: `PATCH /api/user/profile` (update name) and `DELETE /api/user/account` (delete user + data). Password reset calls `supabase.auth.resetPasswordForEmail()` directly from the client.

**Tech Stack:** Supabase Auth, Supabase DB (users table), Next.js API routes, Zod, lucide-react.

**Design reference (from brainstorming):**
- Tabbed layout: Profile | Security
- Profile tab: editable name input, read-only email, save button
- Security tab: password reset button, delete account with confirmation modal
- Uses existing dashboard layout (navbar, sidebar, footer from `dashboard/layout.tsx`)
- Sidebar already has "Settings" linked to `/dashboard/settings` (wired in layout.tsx)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `frontend/lib/validations/user.ts` | Create | Zod schemas for profile update |
| `frontend/app/api/user/profile/route.ts` | Create | PATCH — update user name |
| `frontend/app/api/user/account/route.ts` | Create | DELETE — delete user + all data |
| `frontend/app/dashboard/settings/page.tsx` | Create | Settings page with Profile + Security tabs |
| `docs/migrations/008_create_users_table.sql` | Create | (if not already run) Migration for users table |

---

### Task 1: Create Zod validation for profile update

**Files:**
- Create: `frontend/lib/validations/user.ts`

```typescript
// frontend/lib/validations/user.ts
import { z } from "zod"

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
}).strict()

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
```

- [ ] **Step 1: Create the file**
- [ ] **Step 2: Commit**

```bash
git add frontend/lib/validations/user.ts
git commit -m "feat: add user profile validation schema"
```

---

### Task 2: Create `PATCH /api/user/profile` route

**Files:**
- Create: `frontend/app/api/user/profile/route.ts`

```typescript
// frontend/app/api/user/profile/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { updateProfileSchema } from "@/lib/validations/user"

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const { error } = await supabase
    .from("users")
    .update({ name: parsed.data.name, updated_at: new Date().toISOString() })
    .eq("id", user.id)

  if (error) {
    console.error("PATCH /api/user/profile:", error.message)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }

  return NextResponse.json({ data: { name: parsed.data.name } })
}
```

- [ ] **Step 1: Create the directory and file**
- [ ] **Step 2: Commit**

```bash
mkdir -p frontend/app/api/user/profile
git add frontend/app/api/user/profile/route.ts
git commit -m "feat: add PATCH /api/user/profile to update name"
```

---

### Task 3: Create `DELETE /api/user/account` route

**Files:**
- Create: `frontend/app/api/user/account/route.ts`

```typescript
// frontend/app/api/user/account/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  try {
    // 1. Delete voice samples from storage
    const { data: voices } = await supabase
      .from("voices")
      .select("sample_path, preview_audio_path")
      .eq("user_id", user.id)

    if (voices && voices.length > 0) {
      const paths = voices.flatMap((v) => [v.sample_path, v.preview_audio_path].filter(Boolean))
      if (paths.length > 0) {
        await admin.storage.from("voice-samples").remove(paths as string[])
      }
    }

    // 2. Delete user data from tables (cascades handle related records)
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", user.id)

    if (deleteError) {
      console.error("DELETE /api/user/account:", deleteError.message)
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
    }

    // 3. Delete the auth user (requires admin key)
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(user.id)
    if (authDeleteError) {
      console.error("DELETE /api/user/account (auth):", authDeleteError.message)
      // User data already deleted — return success anyway
    }

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    console.error("DELETE /api/user/account:", err)
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}
```

- [ ] **Step 1: Create the directory and file**
- [ ] **Step 2: Commit**

```bash
mkdir -p frontend/app/api/user/account
git add frontend/app/api/user/account/route.ts
git commit -m "feat: add DELETE /api/user/account for account deletion"
```

---

### Task 4: Create the Settings page frontend

**Files:**
- Create: `frontend/app/dashboard/settings/page.tsx`

```tsx
// frontend/app/dashboard/settings/page.tsx
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Loader2, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

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
  const router = useRouter()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setEmail(user.email ?? "")

      const { data } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .single()

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
      if (!res.ok) throw new Error(json.error ?? "Failed to save")
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
      if (!res.ok) throw new Error(json.error ?? "Failed to delete")

      await supabase.auth.signOut()
      router.push("/")
      router.refresh()
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
        {/* Tab bar */}
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
```

- [ ] **Step 1: Create the directory and file**
- [ ] **Step 2: Build check**

```bash
mkdir -p frontend/app/dashboard/settings
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/dashboard/settings/page.tsx
git commit -m "feat: add settings page with profile and security tabs"
```

---

### Task 5: Full build check and smoke test

- [ ] **Step 1: Build**

```bash
cd frontend
npm run build
```

Expected: "Compiled successfully". New routes: `ƒ /api/user/profile`, `ƒ /api/user/account`, `○ /dashboard/settings`.

- [ ] **Step 2: Push**

```bash
git push origin main
```

---

## Self-Review

**Spec coverage:**
- Tabbed layout with Profile and Security ✓ (Task 4)
- Name editing via PATCH API ✓ (Task 2)
- Read-only email display ✓ (Task 4)
- Password reset via Supabase Auth ✓ (Task 4)
- Delete account with confirmation + API ✓ (Task 3 + Task 4)
- Zod validation on profile update ✓ (Task 1)
- Generic error messages, server-side logging ✓ (Task 2, Task 3)
- Storage cleanup on account deletion ✓ (Task 3)
- Auth user deletion via admin API ✓ (Task 3)

**Placeholder scan:** No TODOs, no TBDs. All code is complete.

**Edge cases covered:**
- Profile save with empty name → disabled button
- Delete confirmation requires typing "DELETE" exactly
- Storage file cleanup on account deletion (voice samples + previews)
- Auth user deletion best-effort (continues even if admin API fails)
- Password reset: shows success message after sending, hides button
- Loading state on initial profile fetch
- Saving state with spinner on save button
- Error state with inline red banner
- Success state with green "Profile saved" banner (auto-dismisses 3s)
