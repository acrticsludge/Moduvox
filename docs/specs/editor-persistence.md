# Editor State Persistence — Design Spec

**Goal:** Save all editor state (voice selection, controls, narration text, slide position) so users can close the page and resume exactly where they left off.

## Approach

Add a JSONB `editor_state` column to the `presentations` table. The page component manages all state centrally. On every change, auto-save via a debounced API call. On load, hydrate from saved state.

## Saved State Shape

```typescript
type EditorState = {
  selectedVoiceId: string
  controlInstructions: string
  ultimateMode: boolean
  currentSlide: number
  narrations: Record<number, string>
  audioGenerated: boolean
}
```

## Data Flow

1. **Page mount** → Fetch presentation → Extract `editor_state` JSON → Hydrate all child states
2. **Any state change** → Debounce 2s → `PATCH /api/presentations/[id]/state` with full state
3. **Page refresh/navigate away** → State is in DB, ready to restore

## File Changes

| File | Action |
|------|--------|
| `docs/migrations/014_add_editor_state.sql` | Create |
| `app/api/presentations/[id]/state/route.ts` | Create — PATCH endpoint |
| `lib/validations/presentation.ts` | Modify — add `EditorState` type |
| `app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx` | Modify — centralize state, load/save |
| `components/dashboard/CreatePageSidebar.tsx` | Modify — controlled props for CI, ult mode |
| `components/dashboard/SlideEditor.tsx` | Modify — controlled narration + slide state |
