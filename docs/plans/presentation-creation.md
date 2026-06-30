# Presentation Creation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to create a presentation (name only) within a project and navigate to a blank presentation detail page.

**Architecture:** Add a `presentations` table in Supabase, a `POST /api/presentations` endpoint (auth-gated, ownership-verified), a create dialog component, and a blank detail page route. Follow the existing patterns from the `projects` CRUD — same Supabase client setup, same Zod validation pattern, same dialog-overlay pattern.

**Tech Stack:** Next.js 16 App Router, Supabase (auth + db), Zod validation, Tailwind CSS, Lucide icons

**Spec:** `docs/specs/2026-06-25-presentation-creation-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/validations/presentation.ts` | **Create** | Zod schema + TypeScript types for Presentation |
| `app/api/presentations/route.ts` | **Create** | `POST` endpoint — create presentation record |
| `components/dashboard/CreatePresentationDialog.tsx` | **Create** | Modal dialog: title input → create → redirect |
| `app/dashboard/presentations/[id]/page.tsx` | **Create** | Blank detail page for a presentation |
| `app/dashboard/projects/[id]/page.tsx` | **Modify** | Enable "New Presentation" buttons, wire up dialog |
| `app/dashboard/layout.tsx` | **Modify** | Update sidebar regex to match `/dashboard/presentations/*` |
| SQL (manual Supabase run) | **Provided** | CREATE TABLE + RLS for `presentations` |

---

### Task 1: Create validation schema

**Files:**
- Create: `lib/validations/presentation.ts`

- [ ] **Step 1: Write the schema file**

```typescript
import { z } from "zod"

export const PRESENTATION_STATUSES = [
  "draft",
  "ready",
  "archived",
] as const

export type PresentationStatus = (typeof PRESENTATION_STATUSES)[number]

export type Presentation = {
  id: string
  project_id: string
  user_id: string
  title: string
  status: PresentationStatus
  slide_count: number
  created_at: string
  updated_at: string
}

export const createPresentationSchema = z.object({
  project_id: z.string().uuid("Invalid project ID"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
})

export type CreatePresentationInput = z.infer<typeof createPresentationSchema>
```

- [ ] **Step 2: Verify file compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | Select-String -Pattern "presentation"`  
Expected: No errors related to `presentation.ts`

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/validations/presentation.ts
git commit -m "feat: add presentation validation schema"
```

---

### Task 2: Create POST /api/presentations

**Files:**
- Create: `app/api/presentations/route.ts`

- [ ] **Step 1: Write the API route**

```typescript
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createPresentationSchema } from "@/lib/validations/presentation"

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createPresentationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  // Verify the project exists and belongs to the user
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", parsed.data.project_id)
    .eq("user_id", user.id)
    .single()

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const { data, error } = await supabase
    .from("presentations")
    .insert({
      project_id: parsed.data.project_id,
      user_id: user.id,
      title: parsed.data.title,
      status: "draft",
      slide_count: 0,
    })
    .select()
    .single()

  if (error) {
    console.error("POST /api/presentations:", error.message)
    return NextResponse.json({ error: "Failed to create presentation" }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
```

- [ ] **Step 2: Verify file compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | Select-String -Pattern "presentations"`  
Expected: No errors related to `presentations/route.ts`

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/presentations/route.ts
git commit -m "feat: add POST /api/presentations endpoint"
```

---

### Task 3: Create the CreatePresentationDialog

**Files:**
- Create: `components/dashboard/CreatePresentationDialog.tsx`

- [ ] **Step 1: Write the dialog component**

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, Loader2 } from "lucide-react"

export function CreatePresentationDialog({
  projectId,
  onClose,
}: {
  projectId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError("")

    try {
      const res = await fetch("/api/presentations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), project_id: projectId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Something went wrong")
        return
      }
      router.push(`/dashboard/presentations/${json.data.id}`)
    } catch {
      setError("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#18181B]">New Presentation</h2>
          <button type="button" onClick={onClose} className="text-[#71717A] hover:text-[#18181B]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-[#18181B]">Presentation name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Security Training Q3"
              maxLength={200}
              required
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-[#71717A] hover:text-[#18181B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#18181B]/70 bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-all hover:border-[#18181B] hover:bg-[#27272A] disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify file compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | Select-String -Pattern "CreatePresentation"`  
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/components/dashboard/CreatePresentationDialog.tsx
git commit -m "feat: add CreatePresentationDialog component"
```

---

### Task 4: Create blank presentation detail page

**Files:**
- Create: `app/dashboard/presentations/[id]/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ChevronRight, FileText, Presentation } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Presentation as PresentationType } from "@/lib/validations/presentation"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function PresentationDetailPage() {
  const params = useParams<{ id: string }>()
  const [presentation, setPresentation] = useState<PresentationType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase
      .from("presentations")
      .select("*")
      .eq("id", params.id)
      .single()
      .then(({ data }) => {
        setPresentation(data as PresentationType | null)
        setLoading(false)
      })
  }, [params.id])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
      </div>
    )
  }

  if (!presentation) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <p className="text-sm text-[#71717A]">Presentation not found</p>
      </div>
    )
  }

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-faint)] bg-white px-6 py-4">
        <div className="flex items-center gap-2 text-sm">
          <a
            href="/dashboard"
            className="font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
          >
            All Projects
          </a>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          <a
            href={`/dashboard/projects/${presentation.project_id}`}
            className="font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
          >
            Project
          </a>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          <span className="font-medium text-[#18181B]">{presentation.title}</span>
        </div>
      </div>

      {/* Presentation info */}
      <div className="border-b border-[var(--color-border-faint)] px-6 py-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
            <Presentation className="h-7 w-7 text-zinc-700" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#18181B]">{presentation.title}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-[#71717A]">
              <span className="capitalize">{presentation.status}</span>
              <span className="text-zinc-300">·</span>
              <span>Created {formatDate(presentation.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Empty editor state */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100">
            <FileText className="h-7 w-7 text-[#71717A]" />
          </div>
          <h2 className="text-xl font-semibold text-[#18181B]">
            Ready for slides
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#71717A]">
            Upload a PPTX file to start building your narrated presentation.
          </p>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify file compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | Select-String -Pattern "presentations"`  
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/app/dashboard/presentations/
git commit -m "feat: add blank presentation detail page"
```

---

### Task 5: Modify project detail page — wire up dialog

**Files:**
- Modify: `app/dashboard/projects/[id]/page.tsx`

- [ ] **Step 1: Add imports at top (after existing imports)**

Add:
```tsx
import { CreatePresentationDialog } from "@/components/dashboard/CreatePresentationDialog"
```

- [ ] **Step 2: Add state for dialog visibility**

Add after `const [showEdit, setShowEdit] = useState(false)`:
```tsx
const [showCreatePresentation, setShowCreatePresentation] = useState(false)
```

- [ ] **Step 3: Enable the "New Presentation" button in the top bar**

Change from:
```tsx
<button
  type="button"
  disabled
  className="..."
>
```

To:
```tsx
<button
  type="button"
  onClick={() => setShowCreatePresentation(true)}
  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#71717A] transition-colors duration-150 hover:text-[#18181B]"
>
```

- [ ] **Step 4: Enable the empty-state "Create your first presentation" button**

Change from:
```tsx
<button
  type="button"
  disabled
  className="..."
>
```

To:
```tsx
<button
  type="button"
  onClick={() => setShowCreatePresentation(true)}
  className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#71717A] transition-colors duration-150 hover:text-[#18181B]"
>
```

- [ ] **Step 5: Add dialog rendering before the closing `</>` fragment**

Add right before `{showEdit && project && (`:
```tsx
      {showCreatePresentation && (
        <CreatePresentationDialog
          projectId={params.id}
          onClose={() => setShowCreatePresentation(false)}
        />
      )}
```

- [ ] **Step 6: Verify file compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | Select-String -Pattern "projects.*id.*page"`  
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add frontend/app/dashboard/projects/\[id\]/page.tsx
git commit -m "feat: enable New Presentation button on project detail page"
```

---

### Task 6: Update sidebar regex

**Files:**
- Modify: `app/dashboard/layout.tsx`

- [ ] **Step 1: Update the sidebar match regex for "All Projects"**

Change line 10 from:
```tsx
  { label: "All Projects", icon: LayoutGrid, href: "/dashboard", match: /^\/dashboard(\/projects\/?.*)?$/ },
```

To:
```tsx
  { label: "All Projects", icon: LayoutGrid, href: "/dashboard", match: /^\/dashboard(\/projects\/?.*|\/presentations\/?.*)?$/ },
```

- [ ] **Step 2: Verify file compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | Select-String -Pattern "layout"`  
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/app/dashboard/layout.tsx
git commit -m "fix: update sidebar regex to cover presentation pages"
```

---

### Task 7: Provide SQL migration

- [ ] **Step 1: Create migration file**

Create `docs/specs/migrations/001-create-presentations-table.sql`:

```sql
-- Create presentations table
CREATE TABLE IF NOT EXISTS presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'archived')),
  slide_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;

-- RLS: users can CRUD their own presentations
CREATE POLICY "Users can CRUD own presentations"
ON presentations
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Index for listing presentations by project
CREATE INDEX idx_presentations_project_id ON presentations(project_id);

-- Index for listing presentations by user
CREATE INDEX idx_presentations_user_id ON presentations(user_id);
```

- [ ] **Step 2: Provide instructions for running migration**

The user runs this SQL in the Supabase dashboard SQL editor.

- [ ] **Step 3: Commit**

```bash
git add docs/specs/migrations/001-create-presentations-table.sql
git commit -m "feat: add SQL migration for presentations table"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - Presentation data model ✅ (Task 1 + Task 7)
   - POST /api/presentations ✅ (Task 2)
   - CreatePresentationDialog ✅ (Task 3)
   - Blank detail page ✅ (Task 4)
   - Enable "New Presentation" buttons ✅ (Task 5)
   - Sidebar regex ✅ (Task 6)

2. **Placeholder scan:** No TBDs, TODOs, or incomplete code blocks. All code is complete and ready to use.

3. **Type consistency:** `createPresentationSchema` used in both Task 1 (validation) and Task 2 (API). `Presentation` type used in Task 1 and Task 4. All method signatures and property names are consistent across tasks.
