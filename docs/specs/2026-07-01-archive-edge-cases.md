# Archive Edge Cases — Design Spec

**Goal:** Make archival meaningful by hardening access controls, fixing the restore-status bug, and improving the archive/restore UX.

## Decisions

| Concern | Decision | Rationale |
|---------|----------|-----------|
| Public view link | **Block** — return 410 Gone for archived | Archival should mean something. Share link ≠ permanent license. |
| Share settings | **Allow changes** but response includes `archived: true` | Owner may want to lock down access to an archived presentation. But consumers should know. |
| Project list | **Keep visible** but with "Archived" label + visual treatment | Users want to see everything. Don't hide content. |
| Editor access | **Allow viewing** — show banner "Archived — restore to edit" | User might need to reference old content. Just prevent accidental edits. |
| Restore status | **Restore to `previous_status`**, not always "draft" | This is a bug fix. Storing `previous_status` ensures restore is lossless. |
| Confirmation dialog | **Skip** — use toast with undo instead | Reversible one-click action. Don't add friction. |

## Changes

### 1. Database: Add `previous_status` column

New migration adds `previous_status TEXT` column to `presentations` table. When archiving, the API writes the current status to this field. When restoring, the API reads this field and sets status back.

### 2. View API: Block archived presentations

**File:** `frontend/app/api/view/[shareToken]/route.ts`

After finding the presentation by share_token, check `status`. If `status === "archived"`, return `{ error: "This presentation has been archived by its owner." }` with status 410.

The frontend already handles 410 (`view/[shareToken]/page.tsx` line 138-141 shows "expired" screen). Reuse the same UI but update the message to say "archived" instead of "expired."

### 3. Share PATCH: Allow but indicate archived

**File:** `frontend/app/api/presentations/[id]/share/route.ts`

No server-side block. The GET response already returns share settings. Add `presentation_status` to the response so the caller knows if it's archived.

### 4. Project list: Visual treatment

**File:** `frontend/app/dashboard/projects/[id]/page.tsx`

Sort archived presentations to the bottom of the list. Add a thin "Archived" section header above them. Archived cards show a muted opacity and an "Archived" badge.

### 5. Editor: Gallery mode for archived

**File:** `frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx`

On load, check `presentation.status`. If `"archived"`:
- Show a banner: "This presentation is archived. [Restore] to make changes."
- Disable the slide editor (replace with a read-only view of the last saved state)
- Hide the delete button (can delete from project list)

### 6. PATCH endpoint: Track previous_status

**File:** `frontend/app/api/presentations/[id]/route.ts`

When archiving (`status: "archived"`):
```ts
updates.previous_status = currentRecord.status // save "draft" or "ready"
```

When restoring from archived:
```ts
updates.status = currentRecord.previous_status || "draft"
updates.previous_status = null // clear after restore
```

### 7. Validation schema

**File:** `frontend/lib/validations/presentation.ts`

No changes needed — `status` is already optional in `updatePresentationSchema`.

## Non-Goals

- No confirmation dialog for archive (toast with undo is enough)
- No share settings lock (owner can still modify)
- No separate "Archived" view in project page (keep in same list, sorted to bottom)
- No cascade delete for archived presentations (delete still works as before)
