# Plan: Lock Gender for Hard-Coded Presets

## Implementation Order

### Step 1: Server-side enforcement
**File:** `frontend/app/api/voices/route.ts`
- In POST handler, when `preset_id` is set, check that submitted `gender` matches the preset's fixed gender
- Import or reference `PRESET_VOICES` (currently only defined in `voices/page.tsx`)
- Option A: Move preset definitions to a shared file (e.g., `frontend/lib/presets.ts`)
- Option B: Duplicate the mapping in the API route
- Reject with 422 if gender doesn't match preset

### Step 2: UI lock in AddVoiceModal
**File:** `frontend/app/dashboard/voices/page.tsx`
- When a built-in preset is selected (`selectedPreset` is non-null), hide the gender toggle buttons
- Show a read-only badge: "Gender: Female" (matching the preset)
- When no preset is selected (custom mode), show the gender toggle as before
- When switching presets, auto-update the gender display

### Step 3: Extract shared preset definitions
**File:** `frontend/lib/presets.ts` (new)
- Move `PRESET_VOICES`, `PRESET_CONTROL_INSTRUCTIONS`, `PRESET_VOICE_MAP` and `GENDER_LABELS` here
- Import from this file in both `voices/page.tsx` and `api/voices/route.ts`

## Verification
1. Open Add Voice → select "Calm Female" → gender shows "Female" and is non-editable
2. Try to submit with different gender via API → 422 error
3. Select custom preset → gender buttons are interactive
4. Switch between presets → gender auto-updates
5. Deselect preset → gender buttons become interactive again
