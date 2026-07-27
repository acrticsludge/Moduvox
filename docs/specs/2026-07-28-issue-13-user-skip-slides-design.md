# Issue #13: Let User Skip Slides During Audio Generation

## Status
Not started — planning phase

## Root Cause
During audio generation or regeneration, the system processes ALL slides in sequence. There is no way for the user to skip a slide that they don't want audio for, or to cancel a particular slide that has no narration content. If a slide has an empty narration text, it's filtered out, but the user can't explicitly opt out of generating audio for a specific slide.

## Expected Behavior
- In the regeneration review step (RegenerateModal), let users individually select/deselect which slides to regenerate
- During generation, show a "Skip" button per slide that's taking too long

## Actual Behavior
- All slides with narration text are included in generation
- No per-slide selection in the review modal
- No skip functionality during generation

## Files Affected
- `frontend/components/dashboard/RegenerateModal.tsx` — add per-slide checkbox selection
- `frontend/components/dashboard/SlideEditor.tsx` — accept selected slides set

## Edge Cases
1. User skips all slides → show "No slides selected" warning
2. User has 30 slides, selects 5 → only 5 regenerated
3. User skips a slide that has no previous audio → no audio for that slide (expected)
4. Selection persists across modal open/close → state management

## Acceptance Criteria
1. RegenerateModal review step shows each slide with a checkbox (pre-selected based on change detection)
2. User can toggle individual slides on/off
3. "Select All" / "Deselect All" toggle for convenience
4. Only checked slides are sent for regeneration
5. Clear visual feedback on which slides will be regenerated
6. Summary shows: "Regenerating audio for N of M slides"
