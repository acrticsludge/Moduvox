# Editor Persistence — Implementation Plan

**Goal:** Save all editor state so users can close and resume.

**Files:** migration, API route, page (central state), sidebar (controlled), editor (controlled)

---

### Task 1: Migration

```sql
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS editor_state JSONB DEFAULT '{}'::jsonb;
```

### Task 2: API route — PATCH /api/presentations/[id]/state

Validates auth, ownership, then updates `editor_state` column.

### Task 3: Update page — centralized state + auto-save

- Lift all state to page: `selectedVoiceId`, `controlInstructions`, `ultimateMode`, `narrations`, `currentSlide`, `audioGenerated`
- On mount: load from `presentation.editor_state` if available
- Auto-save: useEffect with 2s debounce → PATCH to API

### Task 4: Update sidebar + editor — controlled components

- CreatePageSidebar: accept `controlInstructions`, `ultimateMode`, `onControlInstructionsChange`, `onUltimateModeChange` props
- SlideEditor: accept `narrations`, `currentSlide`, `audioGenerated` + setters as props, remove internal state
