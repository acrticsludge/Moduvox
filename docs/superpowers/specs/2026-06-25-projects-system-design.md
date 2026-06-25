# Project System — Design Spec

> **Date:** 2026-06-25  
> **Status:** Approved  
> **Branch:** `feat/projects-section`

---

## Overview

A project is a lightweight container that groups related presentations. Users create projects, then upload PPTX files into a project to generate narrated presentations. This session covers only the project CRUD layer — presentation/slide layers come in a later session.

---

## Data Model

### `projects` table

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  color TEXT NOT NULL DEFAULT '#F5F5F5',
  icon TEXT NOT NULL DEFAULT 'FolderKanban',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for listing projects by user
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own projects"
ON projects
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Color Palette (8 pastels)

Stored as hex string:

| Name          | Hex      |
|---------------|----------|
| White-Yellow  | `#FFFDE7` |
| White-Blue    | `#E8F0FE` |
| White-Green   | `#E8F5E9` |
| White-Pink    | `#FCE4EC` |
| White-Purple  | `#F3E5F5` |
| White-Orange  | `#FFF3E0` |
| White-Teal    | `#E0F2F1` |
| White-Gray    | `#F5F5F5` |

### Icon Set (lucide-react, 8 themed)

`FolderKanban`, `BookOpen`, `GraduationCap`, `Shield`, `FileText`, `Presentation`, `Notebook`, `ClipboardList`

If user doesn't pick a color/icon → server picks random from palette + random from icon set.

---

## API Routes

All under `/api/projects`. Admin client (service_role) for all operations. Response envelope: `{ data }` / `{ error }`.

| Method | Route                     | Description        | Request Body                                   | Response              |
|--------|---------------------------|--------------------|------------------------------------------------|-----------------------|
| GET    | `/api/projects`           | List user's projects (newest first) | —                                              | `{ data: Project[] }` |
| POST   | `/api/projects`           | Create project     | `{ name, description?, color?, icon? }`        | `{ data: Project }`   |
| PATCH  | `/api/projects/[id]`      | Update project     | `{ name?, description?, color?, icon? }`       | `{ data: Project }`   |
| DELETE | `/api/projects/[id]`      | Delete project     | —                                              | `{ data: { id } }`    |

### Zod Validation

**Create:** 
- `name` — z.string().min(1).max(100)
- `description` — z.string().max(500).optional().default('')
- `color` — z.enum(['#FFFDE7','#E8F0FE','#E8F5E9','#FCE4EC','#F3E5F5','#FFF3E0','#E0F2F1','#F5F5F5']).optional()
- `icon` — z.enum(['FolderKanban','BookOpen','GraduationCap','Shield','FileText','Presentation','Notebook','ClipboardList']).optional()

**Update:** Same fields but all optional via `.partial()`.

If `color` or `icon` is omitted, the server picks a random value from the respective set.

### Authorization

Extract user from session in each route. Reject with 401 if no session. Verify `user_id` matches on PATCH/DELETE (extra safety beyond RLS).

---

## Components

### ProjectGrid (dashboard page — `/dashboard/page.tsx`)

- **Top bar:** "All Projects" heading + "New Project" button (already exists)
- **Cards grid:** responsive — 1 col mobile, 2 col tablet, 3 col desktop
- **ProjectCard:** left colored border (project color), icon circle (project icon), name, description (2-line clamp), "0 presentations", date
- **Empty state:** existing illustration when no projects exist
- **"New Project" click:** opens CreateProjectModal
- **Card click:** navigates to `/dashboard/projects/[id]`
- **Card "..." menu:** rename + delete options

### ProjectCard

```
┌─────────────────────────────┐
│▌ Icon    Project Name    ⋮  │
│▌        Description line    │
│▌        0 presentations     │
│▌        Jun 25, 2026        │
└─────────────────────────────┘
```

Left border: 4px solid project.color.
Icon in a circle with project.color as background.
Description: line-clamp-2.
Date: relative or formatted.

**"⋮" menu (dropdown):**
- Rename — opens RenameModal
- Delete — opens DeleteConfirmDialog
- Clicking the card body (not the ⋮) navigates to project detail.

### CreateProjectModal

- Name (text input, required, max 100)
- Description (textarea, optional, max 500)
- Color picker: 8 clickable circles (28px) in a row, selected ring
- Icon picker: 8 icons in a 4×2 grid, selected highlighted
- Footer: Cancel + Create buttons
- If user never interacts with color/icon → random defaults on create

### RenameModal

Same layout as CreateProjectModal, pre-filled with current values. Can change name, description, color, icon. Cancel + Save.

### DeleteConfirmModal

- "Delete [Project Name]?" heading
- "This will permanently delete this project and all its presentations."
- Type `DELETE` to confirm text input
- Red "Delete" button + gray "Cancel"

---

## Project Detail Page

`/dashboard/projects/[id]/page.tsx`

**Header section:**
- Back link: "← All Projects" (navigates to /dashboard)
- Project name (large)
- Description (below name)
- Color dot + icon (left of name)
- Created/updated date

**Stats row:**
- "0 presentations"
- "Created Jun 25, 2026"
- "Last updated Jun 25, 2026"

**Content area:**
- Empty state: "No presentations yet" illustration + "Upload a PPTX to get started" text
- Presentation grid will be added in a later session

---

## Error Handling

- All API routes wrapped in try/catch, return `{ error: "Something went wrong" }` with `console.error`
- Zod validation errors return `{ error: "Validation failed", details: [...] }` with field-level messages
- Network/loading states handled in client components (spinner/skeleton while fetching)
- Error boundaries already exist on `/dashboard` and `/dashboard/projects/error.tsx`

---

## Migration

File: `docs/migrations/010_create_projects_table.sql`

Includes: CREATE TABLE, indexes, RLS enable + policy, palette + icon constraints enforced at DB level via CHECK constraints.
