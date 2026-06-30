# Presentation Creation — Design Spec

> **Date:** 2026-06-25  
> **Status:** Draft  
> **Related PRD:** `docs/PRD.md`

---

## 1. Goal

Enable users to create a new presentation within a project from the dashboard, and navigate to a blank presentation detail page. This is the first step of the "Upload PPTX → Narrate → Host → Track" pipeline.

---

## 2. Scope

**In scope (this phase):**

- Presentation data model: `presentations` table in Supabase
- `POST /api/presentations` endpoint: create a presentation record (title + project_id)
- `CreatePresentationDialog`: modal with title input → create → redirect
- Presentation detail page at `/dashboard/presentations/[id]`: blank placeholder
- Enable "New Presentation" button on project detail page
- Sidebar regex updated to highlight "All Projects" on presentation pages

**Not in scope (next phases):**

- PPTX upload and parsing
- Narration generation (Gemini)
- Slide editor UI
- Audio generation (VoxCPM2)
- Hosted player
- Viewer tracking

---

## 3. Data Model

### `presentations` table (Supabase PostgreSQL)

```sql
CREATE TABLE presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'archived')),
  slide_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies

```sql
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own presentations"
ON presentations
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

## 4. API

### `POST /api/presentations`

**Request body:**

```json
{
  "project_id": "uuid",
  "title": "string (1-200 chars)"
}
```

**Responses:**

| Status | Body | When |
|--------|------|------|
| 201 | `{ data: Presentation }` | Created successfully |
| 401 | `{ error: "Unauthorized" }` | Not authenticated |
| 404 | `{ error: "Project not found" }` | Project doesn't exist or doesn't belong to user |
| 422 | `{ error: "Validation failed", details: {...} }` | Invalid input (Zod) |
| 500 | `{ error: "Failed to create presentation" }` | DB error |

**Auth:** Requires authenticated session. Verifies project ownership before inserting.

---

## 5. UI Components

### CreatePresentationDialog

- Simple modal with one text input (presentation name)
- Cancel + Create buttons
- On create: `POST /api/presentations`, then `router.push()` to new page
- Error state: inline red text

### Project Detail Page (modified)

- Enable the currently disabled "New Presentation" button in the top bar
- Enable the "Create your first presentation" button in the empty state
- Both open the same `CreatePresentationDialog`

### Presentation Detail Page (new)

- Top breadcrumb: All Projects > Project > Presentation Title
- Shows presentation title, status, creation date
- Empty state: "Upload a PPTX file to start building" (placeholder for future)
- No editor functionality yet

---

## 6. Sidebar

Update the dashboard layout sidebar regex from:

```
match: /^\/dashboard(\/projects\/?.*)?$/
```

to:

```
match: /^\/dashboard(\/projects\/?.*|\/presentations\/?.*)?$/
```

So "All Projects" stays highlighted when viewing a presentation.

---

## 7. Files

| File | Status |
|------|--------|
| `lib/validations/presentation.ts` | New |
| `app/api/presentations/route.ts` | New |
| `components/dashboard/CreatePresentationDialog.tsx` | New |
| `app/dashboard/presentations/[id]/page.tsx` | New |
| `app/dashboard/projects/[id]/page.tsx` | Modified (enable buttons) |
| `app/dashboard/layout.tsx` | Modified (sidebar regex) |
| SQL migration (manual Supabase run) | Provided |

---

## 8. Edge Cases

- **Project not found / not owned:** API returns 404, dialog shows error "Project not found"
- **Empty title:** Create button disabled until at least 1 character typed
- **Duplicate titles:** Allowed (no uniqueness constraint — same project can have multiple presentations with same name)
- **Network error:** Dialog shows "Something went wrong" inline
