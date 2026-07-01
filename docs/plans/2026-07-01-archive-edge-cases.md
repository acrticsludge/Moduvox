# Archive Edge Cases — Implementation Plan

**Goal:** Make archival meaningful by blocking public view links for archived presentations, fixing the restore-status bug, and adding visual treatment.

**Architecture:** 1 migration + 4 file changes. No new components needed — reuse existing 410 handling, toast, and status badges.

**Tech Stack:** Supabase migration, Next.js API routes, React, Tailwind

---

### Task 1: Add `previous_status` migration

**Files:**
- Create: `docs/migrations/023_add_previous_status.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- docs/migrations/023_add_previous_status.sql
-- Track the status before archival so restore can return to the original state

ALTER TABLE presentations ADD COLUMN previous_status TEXT CHECK (previous_status IN ('draft', 'ready'));

-- Set previous_status for existing archived presentations to 'draft' (safe default)
UPDATE presentations SET previous_status = 'draft' WHERE status = 'archived' AND previous_status IS NULL;
```

- [ ] **Step 2: Verify migration**

The column is nullable. Archived presentations get `previous_status = 'draft'` as a safe default. Non-archived presentations have `NULL`.

---

### Task 2: PATCH endpoint — track and use previous_status

**Files:**
- Modify: `frontend/app/api/presentations/[id]/route.ts`

- [ ] **Step 1: Read current record before updating**

Modify the PATCH handler to first fetch the current record, then use `previous_status` when archiving/restoring.

Current code (lines 43-55):
```ts
const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
if (parsed.data.title) updates.title = parsed.data.title
if (parsed.data.status) updates.status = parsed.data.status
```

Replace with:
```ts
const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
if (parsed.data.title) updates.title = parsed.data.title
if (parsed.data.status) {
  updates.status = parsed.data.status

  // When archiving, save the previous status
  if (parsed.data.status === "archived") {
    updates.previous_status = presentation.status
  }

  // When restoring from archived, use previous_status
  if (presentation.status === "archived" && parsed.data.status !== "archived") {
    updates.previous_status = null
  }
}
```

Wait — need to think about this more carefully. The current code queries the presentation for ownership check but doesn't store the result before the update. Let me look at the actual code structure.

The PATCH function currently:
1. Parses body
2. Builds `updates` object
3. Updates DB
4. Returns updated record

I need to:
1. First fetch the current record (for ownership check AND to get current status)
2. Build updates (including previous_status logic)
3. Update DB

The current code already fetches the record for ownership verification:
```ts
const { data: presentation, error: fetchError } = await supabase
  .from("presentations")
  .select("*")
  .eq("id", presentationId)
  .eq("user_id", user.id)
  .single()
```

This already gives us the current `status`. I can use it in the updates logic.

- [ ] **Step 2: Modify the updates logic**

```ts
if (parsed.data.status) {
  updates.status = parsed.data.status

  // Save previous status when archiving
  if (parsed.data.status === "archived" && presentation.status !== "archived") {
    updates.previous_status = presentation.status
  }

  // Restore to previous status when un-archiving
  if (presentation.status === "archived" && parsed.data.status !== "archived") {
    updates.status = presentation.previous_status || parsed.data.status
    updates.previous_status = null
  }
}
```

---

### Task 3: View API — block archived presentations

**Files:**
- Modify: `frontend/app/api/view/[shareToken]/route.ts`

- [ ] **Step 1: Add status check after finding presentation**

After the presentation is found by share_token (but before returning it), check if `status === "archived"`.

The current flow:
```ts
const { data: presentation, error } = await supabase
  .from("presentations")
  .select(/* fields */)
  .eq("share_token", shareToken)
  .single()

if (error || !presentation) {
  return NextResponse.json({ error: "Presentation not found" }, { status: 404 })
}
```

Add after the existence check:
```ts
if (presentation.status === "archived") {
  return NextResponse.json(
    { error: "This presentation has been archived by its owner." },
    { status: 410 }
  )
}
```

The frontend already handles 410 — it shows the "expired" screen. We should update the message to be more accurate for archived.

- [ ] **Step 2: Update the frontend 410 message**

In `frontend/app/view/[shareToken]/page.tsx`, find where 410 is handled and update the message.

The current code likely shows "This link has expired." — change to handle both expired and archived cases. The API already returns `{ error: "..." }`, so use that message.

---

### Task 4: Frontend — archived message on view page

**Files:**
- Modify: `frontend/app/view/[shareToken]/page.tsx`

- [ ] **Step 1: Update the expired/archived screen**

Find the `"expired"` state rendering and update it to also handle archived:

```tsx
{state === "expired" && (
  <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
    <div className="w-full max-w-sm text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100">
        <Lock className="h-7 w-7 text-[#71717A]" />
      </div>
      <h2 className="text-lg font-semibold text-[#18181B]">
        {presentationError === "archived" ? "Presentation Archived" : "Link Expired"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[#71717A]">
        {presentationError || "This presentation link is no longer active."}
      </p>
    </div>
  </div>
)}
```

Need to track the error type to differentiate archived vs expired. Add a state variable.

---

### Task 5: Editor — archived banner

**Files:**
- Modify: `frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx`

- [ ] **Step 1: Check status on load and show banner**

When `presentation.status === "archived"`:
- Show a banner at the top of the content area (below the top bar)
- Banner: amber/yellow background, text "This presentation is archived."
- "Restore" button in the banner that calls `PATCH { status: "draft" }` (or use previous_status)
- Hide the slide editor (replace with a notice)
- Keep the top bar visible (breadcrumb, rename, archive button as disabled)

Actually, looking at the editor page — the page has:
```tsx
{/* Content */}
{mode === "upload" ? (
  <PptxUploadZone ... />
) : (
  <ErrorBoundary>
    <SlideEditor ... />
  </ErrorBoundary>
)}
```

For archived, I'll replace the `mode === "editor"` content with an archived notice:

```tsx
{presentation.status === "archived" ? (
  <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-4 text-center">
      <h3 className="text-sm font-semibold text-amber-800">Presentation Archived</h3>
      <p className="mt-1 text-sm text-amber-700">
        This presentation is archived. Restore it to make changes.
      </p>
      <button
        onClick={handleRestore}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#27272A]"
      >
        <RotateCcw className="h-4 w-4" />
        Restore Presentation
      </button>
    </div>
  </div>
) : mode === "upload" ? (
  ...
) : (
  ...
)}
```

Need to add `RotateCcw` icon import (or reuse existing `RotateCcw` if already imported).

Actually, looking at the imports — the page has:
```tsx
import { ChevronRight, MoreHorizontal, Trash2, Pencil, Archive } from "lucide-react"
```

I need to add `RotateCcw` for the restore button.

- [ ] **Step 2: Hide archive button when already archived**

When status is "archived", the archive button should be hidden (can't archive what's already archived).

- [ ] **Step 3: Add handleRestore function**

```tsx
async function handleRestore() {
  try {
    const res = await fetch(`/api/presentations/${params.presentationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "draft" }),
    })
    if (!res.ok) throw new Error()
    toast.success("Presentation restored")
    // The page will handle the status change via re-render
    // We need to update the local state
    setPresentation((prev) => prev ? { ...prev, status: "draft" as const } : null)
  } catch {
    toast.error("Failed to restore presentation")
  }
}
```

Wait, the PATCH endpoint uses `previous_status` to determine the target status. So sending `{ status: "draft" }` would be overwritten by the server to use `previous_status`. So I should send `{ status: "draft" }` (which acts as a trigger) or is there a better way?

Looking at my planned PATCH logic:
```ts
if (presentation.status === "archived" && parsed.data.status !== "archived") {
  updates.status = presentation.previous_status || parsed.data.status
  updates.previous_status = null
}
```

It uses `previous_status` (or falls back to the requested status). So sending `{ status: "draft" }` would correctly restore to the previous status. Good.

But wait, the frontend needs to know the FINAL status after restore. The PATCH returns the updated record, which now has the restored status. I'll use the response to update local state:

```tsx
const json = await res.json()
if (json.data) setPresentation(json.data)
```

This way the frontend gets the actual status from the server response.

---

### Task 6: Update frontend view 410 handling

Also need to update the view page to differentiate "expired" vs "archived" in the API response. The API currently returns 410 only for expiration. I'm adding another 410 for archived. The frontend needs to distinguish them.

Current view page 410 handling (from the API):
```ts
if (res.status === 410) {
  setState("expired")
  return
}
```

Change to:
```ts
if (res.status === 410) {
  const json = await res.json()
  if (json.error?.toLowerCase().includes("archived")) {
    setPresentationError(json.error)
    setState("expired") // reuse expired UI with archived message
  } else {
    setState("expired")
  }
  return
}
```

Actually, simpler approach — just pass the error message and let the UI display it:

```ts
if (res.status === 410) {
  const json = await res.json()
  setPresentationError(json.error) // "archived" or "expired" message
  setState("expired")
  return
}
```

The UI can just show `presentationError` regardless:
```tsx
<h2>Link Unavailable</h2>
<p>{presentationError || "This presentation link is no longer active."}</p>
```

Need to add `presentationError` state to the view page.

---

### Task 7: TypeScript check and commit

- [ ] **Run `npx tsc --noEmit`**
Expected: Exit 0

- [ ] **Commit**
```bash
git add docs/migrations/023_add_previous_status.sql \
  frontend/app/api/presentations/[id]/route.ts \
  frontend/app/api/view/[shareToken]/route.ts \
  frontend/app/view/[shareToken]/page.tsx \
  frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx \
  docs/specs/2026-07-01-archive-edge-cases.md
git commit -m "feat: strengthen archival — block view links, fix restore status, improve UX"
git push origin feat/archive-edge-cases
```
