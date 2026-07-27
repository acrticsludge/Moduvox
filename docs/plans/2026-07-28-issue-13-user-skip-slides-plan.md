# Plan: Let User Skip Slides During Audio Generation

## Implementation Order

### Step 1: Update RegenerateModal review step
**File:** `frontend/components/dashboard/RegenerateModal.tsx`
- In the "review" step, show each slide with a checkbox
- Pre-selected based on change detection:
  - `changedSlides` slides → checked
  - `voiceChangedSinceAudio` → all slides checked
- Add "Select All" / "Deselect All" toggle
- Show slide title/number for each checkbox
- Pass the selected set back to the parent on confirm

### Step 2: Update onConfirm callback
**File:** `frontend/components/dashboard/SlideEditor.tsx`
- RegenerateModal `onConfirm` now receives a `Set<number>` of selected slides
- `handleGenerate` uses this set
- If all slides are selected, no change in behavior

### Step 3: Handle "No slides selected" edge case
- If user skips all slides, show warning "No slides selected for regeneration"
- Don't close the modal — let user select some slides

## Verification
1. Open "Regenerate Audio" → review step shows checkboxes
2. Modified slides are pre-checked
3. Uncheck some slides → only checked ones regenerate
4. "Select All" / "Deselect All" works
5. Uncheck all slides → warning shown, modal stays open
6. After generation, summary shows correct count
