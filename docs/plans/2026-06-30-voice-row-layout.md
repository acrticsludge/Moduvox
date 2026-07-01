# Voice Row Layout — Implementation Plan

**Goal:** Replace the VoiceCard component with a horizontal row layout and change the container from a card grid to a bordered list.

**Architecture:** Single-file change in `voices/page.tsx`. Rename `VoiceCard` to `VoiceRow`, rewrite the JSX, update the container wrapper. Remove inline cloned sample preview — all voices use "Test → TestVoiceModal" flow.

---

### Task 1: Rewrite VoiceRow component and container

**Files:**
- Modify: `frontend/app/dashboard/voices/page.tsx`

- [ ] **Step 1: Rewrite VoiceCard → VoiceRow**

Replace the entire VoiceCard function (from `function VoiceCard(` to the `// ── Add Voice Modal ──` comment) with:

```tsx
// ── Voice Row ────────────────────────────────────────
function VoiceRow({
  voice,
  onTest,
  onDelete,
}: {
  voice: Voice
  onTest: (voice: Voice) => void
  onDelete: (voice: Voice) => void
}) {
  const presetInfo = voice.preset_id
    ? PRESET_VOICES.find((p) => p.id === voice.preset_id)
    : null

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-zinc-50">
      {/* Icon */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100">
        {voice.type === "preset" ? (
          <Music className="h-3.5 w-3.5 text-[#71717A]" />
        ) : (
          <Mic className="h-3.5 w-3.5 text-[#71717A]" />
        )}
      </div>

      {/* Name */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#18181B]">
          {voice.name}
        </p>
      </div>

      {/* Type badge — hidden on mobile */}
      <span className="hidden shrink-0 items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-[#71717A] sm:inline-flex">
        {voice.type === "preset" ? "Preset" : "Cloned"}
      </span>

      {/* Description — preset only, hidden on mobile */}
      {voice.type === "preset" && presetInfo && (
        <p className="hidden max-w-[180px] truncate text-xs text-zinc-500 md:block">
          {presetInfo.description}
        </p>
      )}

      {/* Test button */}
      <button
        type="button"
        onClick={() => onTest(voice)}
        className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-zinc-400 transition-colors hover:text-[#18181B]"
      >
        <Volume2 className="h-3 w-3" strokeWidth={1.5} />
        <span className="hidden sm:inline">Test</span>
      </button>

      {/* Date */}
      <span className="hidden shrink-0 text-xs text-zinc-400 md:block">
        {formatDate(voice.created_at)}
      </span>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(voice)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
        aria-label="Delete voice"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Update the container from grid to list**

Replace the existing grid container:
```tsx
<div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {voices.map((v) => (
      <VoiceCard
        key={v.id}
        voice={v}
        onTest={setTestVoice}
        onDelete={setDeleteVoice}
      />
    ))}
</div>
```

With the list container:
```tsx
<div className="w-full overflow-hidden rounded-xl border border-zinc-200 bg-white">
  <div className="divide-y divide-zinc-100">
    {voices.map((v) => (
      <VoiceRow
        key={v.id}
        voice={v}
        onTest={setTestVoice}
        onDelete={setDeleteVoice}
      />
    ))}
  </div>
</div>
```

- [ ] **Step 3: Clean up unused imports**

Remove `useRef` from the import line (no longer needed without inline audio).
Remove `Loader2` from the lucide import if it's no longer used in VoiceRow (check AddVoiceModal and TestVoiceModal still use it).

Check current usage:
- `Loader2` used in AddVoiceModal (line 383, 461) and TestVoiceModal (line 575) — keep it
- `useRef` — not used anywhere else in the file — remove it
- `Play` — used in TestVoiceModal (line — let me check) and AddVoiceModal (line — for the preview button). Actually the inline VoiceRow no longer uses `Play` but the other modals might. Let me keep it.

Actually, the `VoiceRow` no longer uses:
- `useRef` — should remove from import
- `previewUrl` state — removed (inline preview gone)
- `loadingUrl` state — removed
- `handlePlay` function — removed

Let me be precise about what changes to the imports. The VoiceRow function no longer needs:
- `useRef`
- `Loader2` (but still used elsewhere in the file)

The `Play` icon is still used in the cloned preview button... wait, the cloned preview is removed. So `Play` is no longer used in VoiceRow. But it might be used in AddVoiceModal or TestVoiceModal.

Let me check TestVoiceModal — it uses `Loader2` at line 575. It doesn't use `Play`.
Let me check AddVoiceModal — it uses `Loader2` (lines 383, 461) and `Play` ... hmm, does it?

Looking at AddVoiceModal step "clone":
- The file upload doesn't use `Play` directly. The old code used `Play` in the "Preview voice sample" button, but that was in VoiceCard, not AddVoiceModal.
- Wait, `Play` was used in the VoiceCard's preview button. But now that's gone.

So `Play` might not be used anywhere in the file anymore. Let me check:
- The `TestVoiceModal` doesn't use it
- The `AddVoiceModal` doesn't use it directly  
- The `VoiceRow` doesn't use it

But wait — is `Play` used anywhere else? Let me just leave the imports and let TypeScript tell me. Actually TS won't error on unused imports. Let me clean them up anyway since we're doing a rewrite.

Let me check the current imports at line 5:
```
import { Plus, Mic, Play, Trash2, Music, Loader2, Volume2 } from "lucide-react"
```

Used by:
- `Plus` — main page (Add Voice button)
- `Mic` — VoiceRow icon, AddVoiceModal
- `Play` — was used in VoiceCard preview, need to check if still used elsewhere
- `Trash2` — VoiceRow delete
- `Music` — VoiceRow icon
- `Loader2` — AddVoiceModal, TestVoiceModal
- `Volume2` — VoiceRow test button, TestVoiceModal

Does `Play` appear anywhere in the file now? Let me search...

Actually, looking at AddVoiceModal step "clone" — there used to be a `Play` icon in the file upload button. But that was replaced too. Let me search the current file content.

I'll just leave the import as-is and remove `Play` and `useRef` if they're not needed. Actually, let me just not worry about it — unused imports don't cause errors and the build will tree-shake them.

Wait, I should be surgical. The user wants clean code. Let me remove `useRef` and `Play` from imports if they're truly unused. Let me check in the current file.

Actually, I'll just check after the edit. Let me proceed.

- [ ] **Step 4: TypeScript check**

Run: `npx tsc --noEmit`
Expected: Exit code 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/dashboard/voices/page.tsx docs/specs/2026-06-30-voice-row-layout.md
git commit -m "feat: replace VoiceCard grid with horizontal VoiceRow list"
git push origin feat/UI-improvements
```
