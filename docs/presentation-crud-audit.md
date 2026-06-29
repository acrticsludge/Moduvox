# Presentation CRUD — Full Audit Report

> Generated 2026-06-29. Audit of all CRUD operations for presentations and projects.

---

## 1. What Exists vs. What's Missing

### Project CRUD

| Operation | API Endpoint | UI Component | Status |
|-----------|-------------|-------------|--------|
| Create | `POST /api/projects` | `CreateProjectModal.tsx` | ✅ |
| List | `GET /api/projects` | Dashboard page grid | ✅ |
| Read (single) | Direct Supabase query | `ProjectDetailPage` | ✅ (no API route) |
| Update | `PATCH /api/projects/[id]` | `RenameProjectModal.tsx` | ✅ |
| Delete | `DELETE /api/projects/[id]` | `DeleteProjectDialog.tsx` | ✅ (cascades to presentations) |
| Archive | ❌ No endpoint | ❌ No UI | ❌ |

### Presentation CRUD

| Operation | API Endpoint | UI Component | Status |
|-----------|-------------|-------------|--------|
| Create | `POST /api/presentations` | `CreatePresentationDialog.tsx` | ✅ |
| List (by project) | Direct Supabase query | Project detail page cards | ✅ (no API route) |
| Read (single) | Direct Supabase query | Editor page | ✅ (no API route) |
| Update (editor state) | `PATCH /api/presentations/[id]/state` | Auto-save in editor | ✅ |
| **Update (title)** | ❌ No endpoint | ❌ No UI | ❌ **🔴 HIGH** |
| **Delete** | ❌ No endpoint | ❌ No UI | ❌ **🔴 CRITICAL** |
| Archive | ❌ No endpoint | ❌ No UI | ❌ |

### File Operations (PPTX in Storage)

| Operation | API Endpoint | UI Component | Status |
|-----------|-------------|-------------|--------|
| Upload | `POST /api/presentations/[id]/upload` + confirm | `PptxUploadZone.tsx` | ✅ |
| Re-upload | Same endpoint | `SlideEditor.tsx` ("Re-upload" button) | ✅ |
| **Delete PPTX** | ❌ No endpoint | ❌ No UI | ❌ **🔴 HIGH** |
| Download PPTX | ❌ No endpoint | ❌ No UI | ❌ |

### Sidebar & Navigation

| UI Element | Action | Status |
|-----------|--------|--------|
| "All Projects" link | Navigates to `/dashboard` | ✅ |
| "My Voices" link | Navigates to `/dashboard/voices` | ✅ |
| "Settings" link | Navigates to `/dashboard/settings` | ✅ |
| **"Archived" button** | **No onClick, no route** | ❌ **DEAD UI** |
| **"Trash" button** | **No onClick, no route** | ❌ **DEAD UI** |

---

## 2. Presentation Cards (Project Detail Page)

**Status:** Zero action buttons. Clicking opens the editor — that's it.

Compare to `ProjectCard.tsx` which has a three-dot menu with "Edit" and "Delete" — presentation cards have **nothing**.

Missing from presentation cards:
- ❌ Delete button
- ❌ Rename option
- ❌ Status display/change
- ❌ Any context menu at all

---

## 3. Presentation Editor Page

**Missing from editor:**
- ❌ Delete this presentation button
- ❌ Rename presentation title (shown in breadcrumb, not editable)
- ❌ Download original PPTX
- ❌ Archive presentation

---

## 4. Data Loading Pattern Inconsistency

- **Projects**: Dashboard loads projects via direct Supabase query (not via `GET /api/projects`)
- **Presentations**: Both project detail and editor pages load via direct Supabase query
- **Editor state**: Uses API route (`PATCH /api/presentations/[id]/state`)

Mixed patterns — if RLS or middleware logic is added, the direct queries won't match the API routes.

---

## 5. Dead UI in Sidebar

The sidebar in `CreatePageSidebar.tsx` renders:

```tsx
<button className="...">  // No onClick
  <Archive className="h-5 w-5" />
  Archived
</button>
<button className="...">  // No onClick
  <Trash2 className="h-5 w-5" />
  Trash
</button>
```

These render but do nothing. Likely planned features with placeholder UI.

---

## Priority Summary

### 🔴 CRITICAL
| # | Gap | Impact |
|---|-----|--------|
| 1 | **No way to delete a presentation** | Users cannot remove presentations without deleting the entire project. Need `DELETE /api/presentations/[id]` + UI button. |

### 🔴 HIGH
| # | Gap | Impact |
|---|-----|--------|
| 2 | **No way to rename a presentation** | Title is set at creation, never changeable. Need `PATCH /api/presentations/[id]` + editable title. |
| 3 | **No delete uploaded PPTX** | When presentation is deleted, the PPTX file in Supabase Storage is orphaned. Need to clean up in the delete handler. |
| 4 | **Presentation cards have no actions** | Unlike ProjectCard, no context menu at all. Need at minimum "Delete" and "Rename". |

### 🟡 MEDIUM
| # | Gap | Impact |
|---|-----|--------|
| 5 | **Dead sidebar buttons** | "Archived" and "Trash" render but do nothing. Either implement or remove. |
| 6 | **No archive functionality** | DB supports `status = 'archived'` but no API/UI to use it. |
| 7 | **Inconsistent data loading** | Mix of direct Supabase queries and API routes. Not urgent but worth standardizing. |

### 🟢 LOW
| # | Gap | Impact |
|---|-----|--------|
| 8 | **No PPTX download** | Users can't download the original file they uploaded. |
| 9 | **No presentation navigation in editor** | No sidebar to jump between presentations in the same project. |
