# Issue #5: Hard-Coded Presets Must Have Fixed Non-Editable Genders

## Status
Not started — planning phase

## Root Cause
In `voices/page.tsx`, the `AddVoiceModal` preset selection allows changing the gender after selecting a built-in preset. When user selects "calm-female", `setVoiceGender(pv.gender)` is called initially, but the gender toggle buttons remain interactive. User can click a different gender, and `handleSavePreset` submits whatever `voiceGender` state is set — potentially overwriting the preset's original fixed gender.

The `PRESET_VOICES` array defines fixed genders (`calm-female => female`, `energetic-male => male`, others => `neutral`), but this is only used for initial state, not enforced.

## Expected Behavior
- Built-in presets should have gender locked and non-editable
- Custom presets (user-created) should still allow free gender selection
- When switching between presets, gender auto-updates

## Actual Behavior
- Gender field is editable even for built-in presets
- User can save "Calm Female" with gender "male"

## Files Affected
- `frontend/app/dashboard/voices/page.tsx` — AddVoiceModal preset step
- `frontend/app/api/voices/route.ts` — POST handler (server-side enforcement)

## Edge Cases
1. User selects built-in preset, then deselects it → gender should unlock for custom
2. User switches between presets → gender updates automatically
3. User navigates back to "choose" step then forward to "preset" → gender re-locks
4. Direct API call bypasses UI locking → server also needs to enforce

## Acceptance Criteria
1. When a built-in preset is selected, the gender button group is disabled/hidden
2. A read-only gender badge or indicator is shown instead showing the preset's gender
3. When selecting a custom preset (no preset_id), gender buttons are interactive
4. POST `/api/voices` rejects requests where preset_id is set but gender doesn't match
5. The UI clearly communicates "Gender is fixed for built-in voices"
