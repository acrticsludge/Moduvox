# Presentation Create Page — Design Spec

> **Date:** 2026-06-25  
> **Status:** Draft  
> **Related PRD:** `docs/PRD.md` (§8 Proposed Workflow)  
> **Previous spec:** `docs/superpowers/specs/2026-06-25-presentation-creation-design.md`

---

## 1. Goal

Transform the blank presentation detail page at `/dashboard/projects/[id]/presentations/[presentationId]` into a functional creation page with a sidebar (voice selector + controls) and a main area (PPTX upload zone). No post-upload logic yet.

---

## 2. Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Breadcrumb: All Projects > Project Name > Presentation Title │
├──────────────┬───────────────────────────────────────────────┤
│  SIDEBAR     │            MAIN CONTENT                       │
│  (w-80)      │                                               │
│              │    ┌──────────────────────────────────┐        │
│  ▼ VOICE     │    │                                  │        │
│  ┌─────────┐ │    │     Drop your PPTX here          │        │
│  │ Sel... ▼│ │    │                                  │        │
│  └─────────┘ │    │    ┌──────────────────────────┐  │        │
│              │    │    │                          │  │        │
│  Control     │    │    │   Drag & drop or click   │  │        │
│  Instructions│    │    │   to browse               │  │        │
│  ┌─────────┐ │    │    │                          │  │        │
│  │         │ │    │    │   .pptx up to 50MB       │  │        │
│  │         │ │    │    └──────────────────────────┘  │        │
│  │         │ │    │                                  │        │
│  └─────────┘ │    └──────────────────────────────────┘        │
│              │                                               │
│  ○ Ultimate  │                                               │
│    Clone     │                                               │
│              │                                               │
│  "Preserves  │                                               │
│   every      │                                               │
│   nuance..." │                                               │
│              │                                               │
└──────────────┴───────────────────────────────────────────────┘
```

### Sidebar (fixed, scrollable)
- **Voice selector** — shadcn `<Select>` dropdown listing all saved voices from the `voices` table, grouped by type (Preset / Cloned). Empty state if no voices.
- **Control Instructions** — shadcn `<Textarea>` for tone/voice description instructions
- **Ultimate Clone toggle** — shadcn `<Switch>` + `<Label>`, with a muted description shown below when the user has a cloned voice selected

### Main Content Area
- **PPTX upload zone** — drag-and-drop file upload area accepting `.pptx` files up to 50MB. Shows a dashed-border drop zone with an upload icon. On file select/drop, shows the filename and file size.

---

## 3. Component Breakdown

### New shadcn UI components to install
| Component | Package / Source | Purpose |
|-----------|-----------------|---------|
| `<Select>` | `@radix-ui/react-select` | Voice dropdown |
| `<Textarea>` | Built-in (no Radix dep) | Control instructions |
| `<Switch>` | `@radix-ui/react-switch` | Ultimate clone toggle |
| `<Label>` | `@radix-ui/react-label` | Form labels |

### New app-specific components
| Component | Responsibility |
|-----------|---------------|
| `CreatePageSidebar` | Voice selector + control instructions + ultimate clone toggle |
| `PptxUploadZone` | Drag-and-drop PPTX upload area |

### Modified components
| Component | Change |
|-----------|--------|
| `app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx` | Replace blank state with sidebar + main layout |

---

## 4. Voice Selector Behavior

- **Data source:** Fetches from Supabase `voices` table filtered by `user_id`
- **Groups:** Two optgroups — "Preset Voices" and "Cloned Voices"
- **Display:** Shows voice `name`, with a small badge/label showing type
- **Default:** No voice selected (placeholder: "Select a voice...")
- **On change:** Stores selected voice ID in state

### Interaction with Ultimate Clone
- **Ultimate Clone toggle visible** only when a **cloned** voice is selected
- When **preset** voice selected: control instructions become a "voice description" for the Voice Design mode
- When **cloned** voice selected: control instructions act as tone guidance, and Ultimate Clone toggle is shown
- Toggling Ultimate Clone on: VoxCPM2 uses `ultimateMode=true`, control instructions are ignored by the API

---

## 5. Data Flow

```
[Page Mount]
    │
    ▼
Fetch presentation by presentationId from DB
Fetch user's voices from DB
    │
    ▼
Render sidebar + upload zone
    │
[User selects voice]
    │
    ▼
Update selectedVoice state
Show/hide Ultimate Clone toggle based on voice type
    │
[User toggles Ultimate Clone]
    │
    ▼
Update ultimateMode state
    │
[User drags/drops or selects PPTX]
    │
    ▼
Validate: is .pptx? under 50MB?
On success: show filename + size (no upload yet)
    │
    ▼
All inputs stored in state — ready for next phase (post-upload)
```

---

## 6. Shadcn Setup

This project currently has no shadcn components installed. The setup requires:

1. Install packages: `@radix-ui/react-select`, `@radix-ui/react-switch`, `@radix-ui/react-label`, `@radix-ui/react-slot`, `class-variance-authority`
2. Install Tailwind plugin: `tailwindcss-animate`
3. Update `globals.css` with shadcn CSS variables merged with existing custom tokens
4. Create component files for: `Select`, `Textarea`, `Switch`, `Label`

---

## 7. Non-Goals (Explicitly Out of Scope)

- PPTX file upload to Supabase Storage (next phase)
- Narration generation via Gemini (next phase)
- Slide editor UI (next phase)
- Audio generation (next phase)
- Progress/loading states for generation
- Error handling for upload failures (beyond client-side validation)

---

## 8. Edge Cases

- **No voices exist:** Select dropdown shows placeholder "No voices found. Create one in My Voices." with a link to `/dashboard/voices`
- **Preset selected + Ultimate Clone toggled on:** Ultimate Clone is hidden for presets, but if somehow activated, treated as Voice Design mode
- **Invalid file type:** Upload zone shows inline error "Please select a .pptx file"
- **File too large:** Shows "File exceeds 50MB limit"
- **File selected then changed:** New file replaces previous selection
- **Presentation not found:** Existing "not found" state preserved
