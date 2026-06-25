# Project CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the project system — users can create, list, rename, and delete projects with color + icon. Project detail page shows an empty state for presentations (added later).

**Architecture:** Follows the same pattern as voices: API routes with server supabase client (auth/RLS) for all operations. Client components fetch and display. Zod validation on all writes. Migration first, then API, then UI.

**Tech Stack:** Next.js App Router API routes, Supabase server client (auth-based), Zod, lucide-react, Tailwind CSS

---

## File Structure

**Create:**
- `docs/migrations/010_create_projects_table.sql` — DB migration
- `frontend/lib/validations/project.ts` — Zod schemas for project CRUD
- `frontend/app/api/projects/route.ts` — GET list + POST create
- `frontend/app/api/projects/[id]/route.ts` — PATCH update + DELETE by id
- `frontend/components/dashboard/ProjectCard.tsx` — project card display component
- `frontend/components/dashboard/CreateProjectModal.tsx` — create project modal
- `frontend/components/dashboard/RenameProjectModal.tsx` — rename project modal
- `frontend/components/dashboard/DeleteProjectDialog.tsx` — delete confirmation dialog

**Modify:**
- `frontend/app/dashboard/page.tsx` — replace empty state with live project grid
- `frontend/app/dashboard/projects/[id]/page.tsx` — real project detail page

---

### Task 1: Migration — Create projects table

**Files:**
- Create: `docs/migrations/010_create_projects_table.sql`

- [ ] **Write the migration**

```sql
-- 010: Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  color TEXT NOT NULL DEFAULT '#F5F5F5',
  icon TEXT NOT NULL DEFAULT 'FolderKanban',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own projects"
ON projects
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

- [ ] **Commit**

```bash
git add -f docs/migrations/010_create_projects_table.sql
git commit -m "feat: add projects table migration"
```

---

### Task 2: Zod validation schemas

**Files:**
- Create: `frontend/lib/validations/project.ts`

- [ ] **Write the validation schemas**

```ts
import { z } from "zod"

export const COLOR_PALETTE = [
  "#FFFDE7",
  "#E8F0FE",
  "#E8F5E9",
  "#FCE4EC",
  "#F3E5F5",
  "#FFF3E0",
  "#E0F2F1",
  "#F5F5F5",
] as const

export const ICON_SET = [
  "FolderKanban",
  "BookOpen",
  "GraduationCap",
  "Shield",
  "FileText",
  "Presentation",
  "Notebook",
  "ClipboardList",
] as const

export type ProjectColor = (typeof COLOR_PALETTE)[number]
export type ProjectIcon = (typeof ICON_SET)[number]
export type Project = {
  id: string
  user_id: string
  name: string
  description: string
  color: ProjectColor
  icon: ProjectIcon
  created_at: string
  updated_at: string
}

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional().default(""),
  color: z.enum(COLOR_PALETTE).optional(),
  icon: z.enum(ICON_SET).optional(),
})

export const updateProjectSchema = createProjectSchema.partial()
```

- [ ] **Commit**

```bash
git add frontend/lib/validations/project.ts
git commit -m "feat: add project zod validation schemas"
```

---

### Task 3: API routes — GET list + POST create

**Files:**
- Create: `frontend/app/api/projects/route.ts`

- [ ] **Write the route**

```ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createProjectSchema, COLOR_PALETTE, ICON_SET } from "@/lib/validations/project"

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("GET /api/projects:", error.message)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }

  return NextResponse.json({ data })
}

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
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = createProjectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const color = parsed.data.color ?? COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]
  const icon = parsed.data.icon ?? ICON_SET[Math.floor(Math.random() * ICON_SET.length)]

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      color,
      icon,
    })
    .select()
    .single()

  if (error) {
    console.error("POST /api/projects:", error.message)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
```

- [ ] **Commit**

```bash
git add frontend/app/api/projects/route.ts
git commit -m "feat: add project list + create API routes"
```

---

### Task 4: API routes — PATCH update + DELETE

**Files:**
- Create: `frontend/app/api/projects/[id]/route.ts`

- [ ] **Create directory and route file**

```bash
New-Item -ItemType Directory -Path "frontend/app/api/projects/[id]" -Force
```

```ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { updateProjectSchema, COLOR_PALETTE, ICON_SET } from "@/lib/validations/project"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = updateProjectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const updates: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.description !== undefined) updates.description = parsed.data.description
  if (parsed.data.color !== undefined) updates.color = parsed.data.color
  if (parsed.data.icon !== undefined) updates.icon = parsed.data.icon
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    console.error("PATCH /api/projects/[id]:", error.message)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    console.error("DELETE /api/projects/[id]:", error.message)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ data: { id } })
}
```

- [ ] **Commit**

```bash
git add frontend/app/api/projects/
git commit -m "feat: add project update + delete API routes"
```

---

### Task 5: ProjectCard component

**Files:**
- Create: `frontend/components/dashboard/ProjectCard.tsx`

- [ ] **Write the card component**

```tsx
"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { MoreHorizontal, Pencil, Trash2, FolderKanban } from "lucide-react"
import type { Project } from "@/lib/validations/project"
import { RenameProjectModal } from "./RenameProjectModal"
import { DeleteProjectDialog } from "./DeleteProjectDialog"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const ICON_MAP: Record<string, React.ReactNode> = {
  FolderKanban: <FolderKanban className="h-5 w-5" />,
  BookOpen: <BookOpen className="h-5 w-5" />,
  GraduationCap: <GraduationCap className="h-5 w-5" />,
  Shield: <Shield className="h-5 w-5" />,
  FileText: <FileText className="h-5 w-5" />,
  Presentation: <Presentation className="h-5 w-5" />,
  Notebook: <Notebook className="h-5 w-5" />,
  ClipboardList: <ClipboardList className="h-5 w-5" />,
}

// Need to import the icons used in ICON_MAP
import {
  BookOpen,
  GraduationCap,
  Shield,
  FileText,
  Presentation,
  Notebook,
  ClipboardList,
} from "lucide-react"

export function ProjectCard({ project }: { project: Project }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const iconEl = ICON_MAP[project.icon] ?? <FolderKanban className="h-5 w-5" />

  return (
    <>
      <div
        className="group relative cursor-pointer rounded-xl border border-zinc-200 bg-white transition-all hover:shadow-sm"
        onClick={() => router.push(`/dashboard/projects/${project.id}`)}
      >
        {/* Color bar */}
        <div
          className="h-1 w-full rounded-t-xl"
          style={{ backgroundColor: project.color }}
        />

        <div className="p-5">
          {/* Top row: icon + name + menu */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: project.color }}
              >
                {iconEl}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#18181B]">{project.name}</h3>
                <p className="text-xs text-[#71717A]">0 presentations</p>
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(!menuOpen)
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] opacity-0 transition-all hover:bg-zinc-100 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpen(false)
                        setShowRename(true)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#18181B] hover:bg-zinc-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpen(false)
                        setShowDelete(true)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[#71717A]">
              {project.description}
            </p>
          )}

          {/* Date */}
          <p className="mt-3 text-xs text-zinc-400">
            {formatDate(project.created_at)}
          </p>
        </div>
      </div>

      {showRename && (
        <RenameProjectModal
          project={project}
          onClose={() => setShowRename(false)}
          onSaved={() => {
            setShowRename(false)
            router.refresh()
          }}
        />
      )}
      {showDelete && (
        <DeleteProjectDialog
          project={project}
          onClose={() => setShowDelete(false)}
          onDeleted={() => {
            setShowDelete(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
```

- [ ] **Commit**

```bash
git add frontend/components/dashboard/ProjectCard.tsx
git commit -m "feat: add project card component with menu"
```

---

### Task 6: CreateProjectModal component

**Files:**
- Create: `frontend/components/dashboard/CreateProjectModal.tsx`

- [ ] **Write the modal**

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, Loader2, Check } from "lucide-react"
import { COLOR_PALETTE, ICON_SET, type ProjectColor, type ProjectIcon } from "@/lib/validations/project"

// Icon picker mapping
import {
  FolderKanban, BookOpen, GraduationCap, Shield,
  FileText, Presentation, Notebook, ClipboardList,
} from "lucide-react"

const ICON_COMPONENTS: Record<string, React.ReactNode> = {
  FolderKanban: <FolderKanban className="h-5 w-5" />,
  BookOpen: <BookOpen className="h-5 w-5" />,
  GraduationCap: <GraduationCap className="h-5 w-5" />,
  Shield: <Shield className="h-5 w-5" />,
  FileText: <FileText className="h-5 w-5" />,
  Presentation: <Presentation className="h-5 w-5" />,
  Notebook: <Notebook className="h-5 w-5" />,
  ClipboardList: <ClipboardList className="h-5 w-5" />,
}

export function CreateProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState<ProjectColor | null>(null)
  const [icon, setIcon] = useState<ProjectIcon | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError("")

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          color: color ?? undefined,
          icon: icon ?? undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Something went wrong")
        return
      }
      onCreated()
      router.refresh()
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
          <h2 className="text-base font-semibold text-[#18181B]">New Project</h2>
          <button type="button" onClick={onClose} className="text-[#71717A] hover:text-[#18181B]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-[#18181B]">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Security Training Q3"
              maxLength={100}
              required
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-[#18181B]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              maxLength={500}
              rows={2}
              className="mt-1 w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="text-sm font-medium text-[#18181B]">Color</label>
            <div className="mt-1.5 flex gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c as ProjectColor)}
                  className="flex h-7 w-7 items-center justify-center rounded-full transition-all hover:scale-110"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="h-3.5 w-3.5 text-[#18181B]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <div>
            <label className="text-sm font-medium text-[#18181B]">Icon</label>
            <div className="mt-1.5 grid grid-cols-4 gap-2">
              {ICON_SET.map((ico) => (
                <button
                  key={ico}
                  type="button"
                  onClick={() => setIcon(ico as ProjectIcon)}
                  className={`flex items-center justify-center rounded-lg border p-2 transition-all ${
                    icon === ico
                      ? "border-[#18181B] bg-zinc-100"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  {ICON_COMPONENTS[ico]}
                </button>
              ))}
            </div>
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
              disabled={!name.trim() || saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#18181B]/90 disabled:opacity-50"
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

- [ ] **Commit**

```bash
git add frontend/components/dashboard/CreateProjectModal.tsx
git commit -m "feat: add create project modal"
```

---

### Task 7: RenameProjectModal component

**Files:**
- Create: `frontend/components/dashboard/RenameProjectModal.tsx`

- [ ] **Write the modal**

```tsx
"use client"

import { useState } from "react"
import { X, Loader2, Check } from "lucide-react"
import { COLOR_PALETTE, ICON_SET, type Project, type ProjectColor, type ProjectIcon } from "@/lib/validations/project"

import {
  FolderKanban, BookOpen, GraduationCap, Shield,
  FileText, Presentation, Notebook, ClipboardList,
} from "lucide-react"

const ICON_COMPONENTS: Record<string, React.ReactNode> = {
  FolderKanban: <FolderKanban className="h-5 w-5" />,
  BookOpen: <BookOpen className="h-5 w-5" />,
  GraduationCap: <GraduationCap className="h-5 w-5" />,
  Shield: <Shield className="h-5 w-5" />,
  FileText: <FileText className="h-5 w-5" />,
  Presentation: <Presentation className="h-5 w-5" />,
  Notebook: <Notebook className="h-5 w-5" />,
  ClipboardList: <ClipboardList className="h-5 w-5" />,
}

export function RenameProjectModal({
  project,
  onClose,
  onSaved,
}: {
  project: Project
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description)
  const [color, setColor] = useState<ProjectColor>(project.color as ProjectColor)
  const [icon, setIcon] = useState<ProjectIcon>(project.icon as ProjectIcon)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError("")

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          color,
          icon,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Something went wrong")
        return
      }
      onSaved()
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
          <h2 className="text-base font-semibold text-[#18181B]">Rename Project</h2>
          <button type="button" onClick={onClose} className="text-[#71717A] hover:text-[#18181B]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-[#18181B]">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-[#18181B] focus:border-zinc-400 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-[#18181B]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={2}
              className="mt-1 w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-[#18181B] focus:border-zinc-400 focus:outline-none"
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="text-sm font-medium text-[#18181B]">Color</label>
            <div className="mt-1.5 flex gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c as ProjectColor)}
                  className="flex h-7 w-7 items-center justify-center rounded-full transition-all hover:scale-110"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="h-3.5 w-3.5 text-[#18181B]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <div>
            <label className="text-sm font-medium text-[#18181B]">Icon</label>
            <div className="mt-1.5 grid grid-cols-4 gap-2">
              {ICON_SET.map((ico) => (
                <button
                  key={ico}
                  type="button"
                  onClick={() => setIcon(ico as ProjectIcon)}
                  className={`flex items-center justify-center rounded-lg border p-2 transition-all ${
                    icon === ico
                      ? "border-[#18181B] bg-zinc-100"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  {ICON_COMPONENTS[ico]}
                </button>
              ))}
            </div>
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
              disabled={!name.trim() || saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#18181B]/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add frontend/components/dashboard/RenameProjectModal.tsx
git commit -m "feat: add rename project modal"
```

---

### Task 8: DeleteProjectDialog component

**Files:**
- Create: `frontend/components/dashboard/DeleteProjectDialog.tsx`

- [ ] **Write the dialog**

```tsx
"use client"

import { useState } from "react"
import { Loader2, TriangleAlert } from "lucide-react"
import type { Project } from "@/lib/validations/project"

export function DeleteProjectDialog({
  project,
  onClose,
  onDeleted,
}: {
  project: Project
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
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok) {
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
          Delete {project.name}?
        </h2>
        <p className="mt-1 text-center text-sm text-[#71717A]">
          This will permanently delete this project and all its presentations. This action cannot be undone.
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

- [ ] **Commit**

```bash
git add frontend/components/dashboard/DeleteProjectDialog.tsx
git commit -m "feat: add delete project confirmation dialog"
```

---

### Task 9: Update dashboard page — project grid

**Files:**
- Modify: `frontend/app/dashboard/page.tsx`

- [ ] **Rewrite the dashboard page with live project grid**

```tsx
"use client"

import { useEffect, useState } from "react"
import { Plus, FolderKanban } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { ProjectCard } from "@/components/dashboard/ProjectCard"
import { CreateProjectModal } from "@/components/dashboard/CreateProjectModal"
import type { Project } from "@/lib/validations/project"

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  async function loadProjects() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (data) setProjects(data as Project[])
    setLoading(false)
  }

  useEffect(() => {
    loadProjects()
  }, [])

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-[#18181B]">All Projects</h1>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#71717A] transition-colors duration-150 hover:text-[#18181B]"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-[#18181B]" />
          </div>
        ) : projects.length === 0 ? (
          /* Empty state */
          <div className="flex flex-1 items-center justify-center">
            <div className="mx-auto max-w-sm text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100">
                <FolderKanban className="h-7 w-7 text-[#71717A]" />
              </div>
              <h2 className="text-xl font-semibold text-[#18181B]">No projects yet</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#71717A]">
                Create a project to organize your narrated presentations.
              </p>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#71717A] transition-colors duration-150 hover:text-[#18181B]"
              >
                <Plus className="h-4 w-4" />
                Create your first project
              </button>
            </div>
          </div>
        ) : (
          /* Project grid */
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            loadProjects()
          }}
        />
      )}
    </>
  )
}
```

- [ ] **Commit**

```bash
git add frontend/app/dashboard/page.tsx
git commit -m "feat: add live project grid to dashboard page"
```

---

### Task 10: Update project detail page

**Files:**
- Modify: `frontend/app/dashboard/projects/[id]/page.tsx`

- [ ] **Rewrite the project detail page**

```tsx
"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ChevronRight, Plus, FileText } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Project } from "@/lib/validations/project"

import {
  FolderKanban, BookOpen, GraduationCap, Shield,
  FileText as FileTextIcon, Presentation, Notebook, ClipboardList,
} from "lucide-react"

const ICON_MAP: Record<string, React.ReactNode> = {
  FolderKanban: <FolderKanban className="h-5 w-5" />,
  BookOpen: <BookOpen className="h-5 w-5" />,
  GraduationCap: <GraduationCap className="h-5 w-5" />,
  Shield: <Shield className="h-5 w-5" />,
  FileText: <FileTextIcon className="h-5 w-5" />,
  Presentation: <Presentation className="h-5 w-5" />,
  Notebook: <Notebook className="h-5 w-5" />,
  ClipboardList: <ClipboardList className="h-5 w-5" />,
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function ProjectDetailPage() {
  const params = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", params.id)
        .single()
      if (data) setProject(data as Project)
      setLoading(false)
    }
    load()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-[#18181B]" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-[#71717A]">Project not found</p>
      </div>
    )
  }

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div className="flex items-center gap-2 text-sm">
          <a
            href="/dashboard"
            className="font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
          >
            All Projects
          </a>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          <span className="font-medium text-[#18181B]">{project.name}</span>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#71717A] transition-colors duration-150 hover:text-[#18181B]"
        >
          <Plus className="h-4 w-4" />
          New Presentation
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col px-6 py-6">
        {/* Project header */}
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: project.color }}
          >
            {ICON_MAP[project.icon] ?? <FolderKanban className="h-7 w-7" />}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#18181B]">{project.name}</h1>
            {project.description && (
              <p className="mt-0.5 text-sm text-[#71717A]">{project.description}</p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 flex gap-6 text-xs text-[#71717A]">
          <span>0 presentations</span>
          <span>Created {formatDate(project.created_at)}</span>
        </div>

        <hr className="my-6 border-zinc-200" />

        {/* Empty state for presentations */}
        <div className="flex flex-1 items-center justify-center">
          <div className="mx-auto max-w-sm text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100">
              <FileText className="h-7 w-7 text-[#71717A]" />
            </div>
            <h2 className="text-xl font-semibold text-[#18181B]">
              No presentations yet
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#71717A]">
              Upload a PPTX to create your first narrated presentation.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Commit**

```bash
git add frontend/app/dashboard/projects/
git commit -m "feat: add project detail page with empty state"
```

---

### Task 11: Update the sidebar match pattern

The sidebar's "All Projects" link match regex needs to include the new project detail route. Currently it's `/^\/dashboard(\/projects\/?.*)?$/` which already matches `/dashboard/projects/[id]`. So this should work already.

Verify by checking the regex in `frontend/app/dashboard/layout.tsx`.

- [ ] **Verify sidebar regex covers project detail**

The current regex `match: /^\/dashboard(\/projects\/?.*)?$/` already matches:
- `/dashboard`
- `/dashboard/projects/abc-123`

No change needed.

- [ ] **Commit (if needed)**

---

### Task 12: Build and verify

- [ ] **Run the build**

```bash
npm run build
```

Expected: Compiles successfully, no TypeScript errors.

- [ ] **Commit any fixes if needed**

---

## Summary

After completing all tasks:

1. Run the migration `010_create_projects_table.sql` in Supabase SQL editor
2. ✅ Project CRUD works (create/list/rename/delete with color + icon)
3. ✅ Dashboard shows live project grid with colored cards + icon
4. ✅ Project detail page shows header + empty state for presentations
5. ✅ Sidebar navigation works for all project routes
6. ✅ Zod validation on all inputs
7. ✅ Consistent error handling pattern

The presentation/slide layers come in a future session.
