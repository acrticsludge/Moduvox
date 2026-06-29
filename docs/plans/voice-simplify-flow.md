# Voice Flow Simplification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify voice creation to just upload + name (no clone mode or instructions). Move clone mode (Standard/Ultimate) + tone instructions to the presentation generation flow where Gemini narration text is sent to VoxCPM2.

**Architecture:** The `voices` table drops `clone_mode`. Voice creation API and UI no longer ask for clone mode. The voice card no longer displays clone mode. Clone mode + tone instructions become part of presentation-level config (to be built later during presentation generation).

**Tech Stack:** Supabase Postgres, Next.js API routes, React client component.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `docs/migrations/005_drop_voices_clone_mode.sql` | Create | Migration to drop `clone_mode` column |
| `frontend/lib/validations/voice.ts` | Modify | Remove `clone_mode` from `createClonedVoiceSchema` |
| `frontend/app/api/voices/upload/route.ts` | Modify | Remove `clone_mode` validation + field from insert |
| `frontend/app/dashboard/voices/page.tsx` | Modify | Remove clone mode from the clone step modal & from VoiceCard display |

---

### Task 1: Create migration to drop `clone_mode` from voices table

**Files:**
- Create: `docs/migrations/005_drop_voices_clone_mode.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- docs/migrations/005_drop_voices_clone_mode.sql
-- clone_mode moves to presentation-level config (added during generation flow)

ALTER TABLE voices DROP COLUMN clone_mode;
```

- [ ] **Step 2: Commit**

```bash
git add docs/migrations/005_drop_voices_clone_mode.sql
git commit -m "db: drop clone_mode from voices table (moved to presentation config)"
```

---

### Task 2: Remove `clone_mode` from Zod validation

**Files:**
- Modify: `frontend/lib/validations/voice.ts`

- [ ] **Step 1: Remove `clone_mode` from the cloned voice schema**

Change the schema from:
```typescript
export const createClonedVoiceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.literal("cloned"),
  clone_mode: z.enum(["standard", "ultimate"]),
  sample_duration_seconds: z.number().int().positive().optional(),
  emotion_default: z.string().default("calm"),
})
```

To:
```typescript
export const createClonedVoiceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.literal("cloned"),
  sample_duration_seconds: z.number().int().positive().optional(),
  emotion_default: z.string().default("calm"),
})
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/validations/voice.ts
git commit -m "voice: remove clone_mode from cloned voice validation"
```

---

### Task 3: Remove `clone_mode` from upload API route

**Files:**
- Modify: `frontend/app/api/voices/upload/route.ts`

**Changes:**
1. Remove line 20: `const cloneMode = formData.get("clone_mode") as string | null`
2. Remove lines 39-41: the `clone_mode` validation block
3. In the insert on line 68, remove `clone_mode: cloneMode,`

The insert object should become:
```typescript
const { data: voice, error: dbError } = await supabase
  .from("voices")
  .insert({
    user_id: user.id,
    name: name.trim(),
    type: "cloned",
    sample_path: filePath,
    sample_duration_seconds: null,
    emotion_default: emotionDefault ?? "calm",
  })
  .select()
  .single()
```

The full diff:
```typescript
// Remove: const cloneMode = formData.get("clone_mode") as string | null

// Remove this entire block:
// if (!cloneMode || !["standard", "ultimate"].includes(cloneMode)) {
//   return NextResponse.json({ error: "clone_mode must be 'standard' or 'ultimate'" }, { status: 400 })
// }

// In the insert object, remove: clone_mode: cloneMode,
```

- [ ] **Step 1: Make the edits**

Remove `clone_mode` form data extraction, validation, and insert field.

- [ ] **Step 2: Commit**

```bash
git add frontend/app/api/voices/upload/route.ts
git commit -m "voice: remove clone_mode from upload API route"
```

---

### Task 4: Remove `clone_mode` from My Voices frontend page

**Files:**
- Modify: `frontend/app/dashboard/voices/page.tsx`

**Changes:**

1. **Voice type (line 13)** — remove `clone_mode` from the type:
```typescript
type Voice = {
  id: string
  user_id: string
  name: string
  type: "preset" | "cloned"
  sample_path: string | null
  sample_duration_seconds: number | null
  emotion_default: string
  is_active: boolean
  created_at: string
}
```

2. **VoiceCard subtitle (line 62-65)** — replace the clone_mode display with a simple "Cloned voice" label:
```typescript
<p className="text-sm text-[#71717A]">
  {voice.type === "preset"
    ? "Preset voice"
    : "Cloned voice"}
</p>
```

3. **AddVoiceModal state (line 120)** — remove the `cloneMode` state:
```typescript
// Remove this line:
// const [cloneMode, setCloneMode] = useState<"standard" | "ultimate">("standard")
```

4. **handleUploadClone (line 163)** — remove `clone_mode` from FormData:
```typescript
// Remove this line:
// formData.append("clone_mode", cloneMode)
```

5. **Clone step UI (lines 345-380)** — remove the entire "Clone mode" section:
```tsx
{/* Clone mode */}
<div>
  <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
    Clone mode
  </label>
  <div className="grid grid-cols-2 gap-2">
    <button
      type="button"
      onClick={() => setCloneMode("standard")}
      className={`rounded-xl border p-3 text-left transition-all ${
        cloneMode === "standard"
          ? "border-[#18181B] bg-zinc-50"
          : "border-zinc-200 hover:border-zinc-300"
      }`}
    >
      <p className="text-sm font-medium text-[#18181B]">Standard</p>
      <p className="text-xs text-[#71717A]">
        Applies tone instructions
      </p>
    </button>
    <button
      type="button"
      onClick={() => setCloneMode("ultimate")}
      className={`rounded-xl border p-3 text-left transition-all ${
        cloneMode === "ultimate"
          ? "border-[#18181B] bg-zinc-50"
          : "border-zinc-200 hover:border-zinc-300"
      }`}
    >
      <p className="text-sm font-medium text-[#18181B]">Ultimate</p>
      <p className="text-xs text-[#71717A]">
        Raw clone, no instructions
      </p>
    </button>
  </div>
</div>
```

Remove all of that. The clone step should now only have: file upload, voice name, and the back/save buttons.

- [ ] **Step 1: Apply all five edits to the frontend file**

- [ ] **Step 2: Verify no remaining references to `cloneMode` or `clone_mode` in the file**

- [ ] **Step 3: Commit**

```bash
git add frontend/app/dashboard/voices/page.tsx
git commit -m "voice: remove clone_mode from voices page UI"
```

---

### Task 5: Full build check

- [ ] **Step 1: Run build**

```bash
cd frontend
npm run build
```

Expected: "Compiled successfully" with no TypeScript errors. Routes: `○ /dashboard/voices`, `ƒ /api/voices/upload`, etc.

- [ ] **Step 2: Push**

```bash
git push origin main
```

---

## Self-Review

**Spec coverage:**
- Migration drops `clone_mode` column ✓ (Task 1)
- Validation schema removes `clone_mode` ✓ (Task 2)
- Upload API removes `clone_mode` field ✓ (Task 3)
- Frontend removes `cloneMode` state, UI, and display ✓ (Task 4)

**Placeholder scan:** No TODOs, no TBDs.

**Type consistency:** After these changes, `Voice` type has no `clone_mode` field, `createClonedVoiceSchema` has no `clone_mode`, API route doesn't accept or store it. All aligned.

**Future note:** The clone mode (Standard/Ultimate) + tone instructions will be added to presentation-level config when building the generation flow. That data model isn't touched in this change.
