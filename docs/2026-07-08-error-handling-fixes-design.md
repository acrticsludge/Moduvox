# Error Handling Overhaul Design

## Scope

Fix all 8 failing checks from the error handling audit in one batch. Hybrid approach: shared utilities for mechanical patterns, surgical fixes for UX patterns.

## Shared Utilities

### 1. `lib/api-handler.ts` — `withApiHandler` wrapper

A higher-order function wrapping all API route handlers:

```ts
export function withApiHandler<T>(handler: Handler<T>) {
  return async (req: Request, ...args: any[]) => {
    try {
      return await handler(req, ...args)
    } catch (error) {
      console.error("[API Error]", error)
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.flatten().fieldErrors },
          { status: 422 },
        )
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
}
```

- Applies to all 34 API route files as an OUTER wrapper
- Each route's `export const GET/POST = withApiHandler(async (req) => {...})`
- Eliminates inconsistent error shapes (all pass through same formatter)
- Catches unexpected crashes that previously returned HTML 500
- **Routes with existing error handling keep their patterns** — e.g., `POST /api/generate/narration` classifies Gemini errors by type. The wrapper catches only errors that escape the route's own try/catch. If the route handles the error and returns a response, the wrapper passes it through.
- Needs `import { NextResponse } from "next/server"` and `import { ZodError } from "zod"`

### 2. `react-error-boundary` package (install via npm)

- Import `<ErrorBoundary>` from `react-error-boundary`
- Apply in dashboard layout to wrap the sidebar and main content separately:
  ```tsx
  <ErrorBoundary fallback={<SidebarError />}>
    <DashboardSidebar />
  </ErrorBoundary>
  <ErrorBoundary fallback={<MainError />}>
    <main>{children}</main>
  </ErrorBoundary>
  ```
- Each gets its own `fallback` component showing a widget-level error card
- Prevents a crash in one section from taking down the entire dashboard
- Also applies the same pattern to `/dashboard/projects/[id]/presentations/[presentationId]/page.tsx` (presentation page with left sidebar, main content, right panel)

## Surgical Fixes

### 3. Field-level form validation

**Files:** `app/login/page.tsx`, `app/signup/page.tsx`

Add per-field error state tracking alongside the existing global error:

```tsx
<input
  aria-invalid={!!fieldErrors.email}
  onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({...prev, email: ''})) }}
/>
{fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
```

Validation runs on submit with Zod schemas, errors displayed adjacent to each field.

### 4. Fix silent catch blocks

**Locations (6):**
- `SlideEditor.tsx` lines 733, 427, 492 — empty catch blocks
- `CreatePageSidebar.tsx` lines 114, 78 — `.catch(() => ({}))`
- `ShareSettingsPanel.tsx` lines 43, 70 — empty catch
- `ViewAudioBar.tsx` line 46 — `.catch(() => ({}))`

**Fix:** Replace each with `catch (err) { console.error("[Location]:", err); /* user feedback */ }` and a user-facing state update where appropriate. Critical failures get toast.error; non-critical background operations at minimum log the error.

### 5. Fix inconsistent API error shapes

**Routes to fix:**
- `POST /api/voices` — line 40 returns `{ error: fieldErrorsObject }` → change to `{ error: "Validation failed", details: fieldErrors }`
- `POST /api/view/[shareToken]/verify` — returns `{ error: "invalid_link", message: "..." }` → change to `{ error: "Presentation link is invalid or expired" }` with status codes distinguishing 404 vs 410
- `POST /api/view/[shareToken]` — same nested pattern → flat `{ error: string }`

### 6. Retry buttons on CRUD dialogs

**Files:** CreateProjectModal, CreatePresentationDialog, RenameProjectModal, RenamePresentationDialog, DeleteVoiceDialog, DeletePresentationDialog, ConfirmArchiveDialog

Each dialog already has an error state (`setError(msg)`). Add a "Try again" button in the error UI:

```tsx
{error && (
  <div className="flex items-center gap-2 text-red-500">
    <span>{error}</span>
    <button onClick={handleSubmit} className="underline">Try again</button>
  </div>
)}
```

The `handleSubmit` function already preserves form state (it reads from state, not reset fields), so retry re-submits with the same data.

## Files Changed

### New files
- `lib/api-handler.ts` — withApiHandler wrapper

### Modified files
- All 34 API route files — wrap handlers with `withApiHandler`
- `app/login/page.tsx` — field-level errors
- `app/signup/page.tsx` — field-level errors
- `components/dashboard/SlideEditor.tsx` — fix 3 silent catches
- `components/dashboard/CreatePageSidebar.tsx` — fix 2 silent catches
- `components/view/ViewAudioBar.tsx` — fix 1 silent catch
- `app/dashboard/layout.tsx` — add ErrorBoundary sections
- `app/api/voices/route.ts` — fix error shape
- `app/api/view/[shareToken]/verify/route.ts` — fix error shape
- `app/api/view/[shareToken]/route.ts` — fix error shape
- All CRUD dialog components (7 files) — add retry buttons

### Package changes
- Install `react-error-boundary`

## Verification

1. **API routes:** Each returns `{ error: string }` on failure, never HTML or nested objects
2. **Forms:** Login/signup show field-level errors on submit
3. **Dashboard:** Simulate a widget crash — other sections remain interactive
4. **Silent catches:** Each previously-silent error now produces a visible feedback
5. **Retry buttons:** Each CRUD dialog shows a "Try again" button on error
6. **Existing error handling preserved:** Routes with custom error classification (narration) continue producing their specific error types — wrapper only catches unexpected escapes
7. **Build:** `npm run build` passes with no regressions
