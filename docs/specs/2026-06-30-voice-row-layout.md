# Voice List — Horizontal Row Layout

**Goal:** Replace the card-grid VoiceCard with a single-row-per-voice list layout. Every row is the exact same height, no variance.

## Layout

Container is a bordered rounded box with `divide-y` between rows.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Icon  Name                   Type · Description        [▶]  [🗑]  Date   │
├───────────────────────────────────────────────────────────────────────────┤
│ Icon  Name                   Type · Description        [▶]  [🗑]  Date   │
└───────────────────────────────────────────────────────────────────────────┘
```

Each row is `flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition-colors`.

## Column Layout

| Element | Size | Behavior |
|---------|------|----------|
| Icon | h-7 w-7 rounded-md bg-zinc-100 | Music (preset) or Mic (cloned), h-3.5 w-3.5 icon |
| Name | text-sm font-semibold, flex-1, truncate | Voice name |
| Type badge | text-[10px] font-medium, rounded-md bg-zinc-100 px-1.5 py-0.5 | "Preset" or "Cloned" |
| Description | text-xs text-zinc-500, max-w-[200px] truncate | Preset description only |
| Test button | text-xs font-medium text-zinc-400 hover:text-[#18181B] | Opens TestVoiceModal |
| Divider | text-xs text-zinc-300 | `·` between test and date |
| Date | text-xs text-zinc-400, whitespace-nowrap | Formatted date |
| Delete | h-7 w-7 rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600 | Trash2 icon |

## Sample Preview Removal

The inline cloned voice sample preview ("Preview voice sample" button + `<audio controls>` player) is **removed** from the row. All voice types use the existing "Test" button → TestVoiceModal flow. This eliminates the height variance entirely.

(If inline sample playback is needed later, it can be added back as an accordion expand within the row.)

## Mobile Behavior

On small screens (`< sm`): description is hidden, date is hidden. Row shows: icon + name + type badge + test + delete.

## SVG Icon Sharpness

All icons rendered at integer pixel sizes (`h-3.5 w-3.5` = 14px, `h-4 w-4` = 16px). No CSS transforms, no `scale()`, no fractional sizes. Icon containers use `flex items-center justify-center` to center without distortion.

## File Changes

- Modify: `frontend/app/dashboard/voices/page.tsx` — rename VoiceCard to VoiceRow, rewrite layout, update container from grid to list
