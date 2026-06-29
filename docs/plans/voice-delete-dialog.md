# Voice Delete Dialog Implementation Plan

**Goal:** Replace `window.confirm()` with a custom modal for voice deletion.

**Files:**
- Create: `frontend/components/dashboard/DeleteVoiceDialog.tsx`
- Modify: `frontend/app/dashboard/voices/page.tsx`

### Task 1: Create DeleteVoiceDialog

Create `frontend/components/dashboard/DeleteVoiceDialog.tsx` — identical pattern to DeleteProjectDialog but for voices:

```tsx
"use client"

import { useState } from "react"
import { Loader2, TriangleAlert } from "lucide-react"

type Voice = {
  id: string
  name: string
}

export function DeleteVoiceDialog({
  voice,
  onClose,
  onDeleted,
}: {
  voice: Voice
  onClose: () => void
  onDeleted: () => void
}) {
  const [confirm, setConfirm] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  async function handleDelete() {
    if (confirm !== "DELETE") return
    setDeleting(true)
    setError("")

    try {
      const res = await fetch(`/api/voices/${voice.id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? "Something went wrong")
        return
      }
      onDeleted()
    } catch {
      setError("Something went wrong")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
          <TriangleAlert className="h-5 w-5 text-red-600" />
        </div>

        <h2 className="text-center text-base font-semibold text-[#18181B]">
          Delete {voice.name}?
        </h2>
        <p className="mt-1 text-center text-sm text-[#71717A]">
          This will permanently delete this voice. This action cannot be undone.
        </p>

        <div className="mt-4">
          <label className="text-sm font-medium text-[#18181B]">
            Type <span className="font-semibold text-red-600">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="DELETE"
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-[#18181B] focus:border-red-400 focus:outline-none"
          />
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-[#71717A] hover:text-[#18181B]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={confirm !== "DELETE" || deleting}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-red-700 disabled:opacity-50"
          >
            {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Task 2: Wire into voices page

Modify `frontend/app/dashboard/voices/page.tsx`:

1. Import `DeleteVoiceDialog` at top
2. Add state: `const [deleteVoice, setDeleteVoice] = useState<Voice | null>(null)`
3. Replace `handleDelete`:
   - Remove the `if (!confirm(...))` line
   - Change it to `setDeleteVoice(voice)` (where voice is the param)
4. Add `onDelete` in VoiceCard: change from `onDelete(voice.id)` to `onDelete(voice)` (pass the whole object)
5. Keep the actual DELETE call inside the dialog's handler
6. After successful delete, remove voice from state: `setVoices((prev) => prev.filter((v) => v.id !== id))`
7. Add the dialog at the bottom of the return, alongside the other modals

### Task 3: Build and verify

```bash
npm run build
```
