# Audit Report: Remotion Editor Scenes vs Actual Moduvox Presentation Editor

**Date:** 2026-07-14  
**Auditor:** Parallel Agent (Explore)  
**Files Compared:**  
- Actual: `frontend/app/dashboard/projects/[id]/presentations/[presentationId]/page.tsx`, `frontend/components/dashboard/SlideEditor.tsx` (1748 lines), `frontend/components/dashboard/CreatePageSidebar.tsx`, `frontend/components/dashboard/AudioPlayer.tsx`, `frontend/components/shared/SlidePdfViewer.tsx`, `frontend/components/dashboard/RegenerateModal.tsx`, `frontend/components/dashboard/ReUploadModal.tsx`, `frontend/components/dashboard/VoiceRecorder.tsx`, `frontend/components/dashboard/ShareSettingsPanel.tsx`  
- Remotion: `remotion-demo/src/scenes/UploadPptx.tsx`, `SlideEditorScene.tsx`, `VoiceSelection.tsx`, `AudioGeneration.tsx`, `AudioPreview.tsx`, `ShareSettings.tsx`, `remotion-demo/src/components/SlideViewer.tsx`, `AudioPlayer.tsx`

---

## Executive Summary

**Overall Match: ~18%** - The Remotion editor scenes are visual prototypes only. They lack virtually all interactive functionality, real data fetching, state management, and complex components. The actual editor is ~4,500 lines of production code across 14 components; Remotion has ~1,200 lines of mock animations.

---

## Critical Gaps (Priority: 🔴 FIX IMMEDIATELY)

### 1. Missing Entire Components (Not Implemented in Remotion)

| Missing Component | Actual File | Lines | Key Functionality |
|-------------------|-------------|-------|-------------------|
| **VoiceRecorder** | `VoiceRecorder.tsx` | 291 | WebRTC MediaRecorder, 30s max, tips, example script, timer, progress bar, permission handling, playback, re-record |
| **ReUploadModal** | `ReUploadModal.tsx` | 111 | Diff view: replacement (red), identical (gray), changed (amber) with per-slide +/−/↔ indicators |
| **RegenerateModal** | `RegenerateModal.tsx` | 220 | 3-step: Review (expandable slides) → Generating (per-slide progress) → Complete (retry failed) |
| **ShareSettingsPanel** | `ShareSettingsPanel.tsx` | 437 | Password strength meter, calendar popover, email gate toggle, copy invite message |
| **ViewerTable** | `ViewerTable.tsx` | 232 | Paginated viewer tracking table with CSV export |
| **SlidePdfViewer** | `SlidePdfViewer.tsx` | 85 | `react-pdf` Document + Page rendering (not HTML mock) |
| **PptxUploadZone** | `PptxUploadZone.tsx` | 119 | Real drag-drop, .pptx validation, 50MB limit, file info display |

### 2. Voice Selector - Missing Radix Select, Cloned Voices, State-Dependent Behavior

| Actual (`CreatePageSidebar.tsx:267 lines`) | Remotion (`VoiceSelection.tsx`) |
|--------------------------------------------|----------------------------------|
| **Radix Select** with `SelectTrigger`, `SelectContent`, `SelectGroup`, `SelectItem` | Plain styled `<div>` with custom dropdown |
| **Optgroups**: "Preset Voices" / "Cloned Voices" (dynamic from Supabase) | Hardcoded preset array only |
| **Preview button** calls `/api/generate/test` with `voice_id`, plays `<audio controls>` | Visual button only, no API call |
| **Control Instructions textarea** with 4 states:<br/>- Preset w/ CI: disabled + preset text<br/>- Cloned + Ultimate: disabled<br/>- Cloned: editable "Describe tone..."<br/>- Custom: editable "Describe voice..." | Static textarea, one placeholder |
| **Ultimate Clone toggle** (Radix Switch) - only for cloned voices, disables CI | **MISSING** |
| Loading skeleton: `h-9 w-full animate-pulse rounded-lg bg-zinc-100` | None |
| Empty state: "No voices yet. Create one" → `/dashboard/voices` | None |

### 3. Center Panel - No react-pdf, No Overlay Controls, No Keyboard Nav

| Actual (`SlideEditor.tsx` + `SlidePdfViewer.tsx`) | Remotion (`UploadPptx.tsx` + `SlideViewer.tsx`) |
|---------------------------------------------------|--------------------------------------------------|
| **SlidePdfViewer**: `react-pdf` `Document` + `Page` per slide | HTML/CSS mock slide (`SlideViewer.tsx`) |
| **Overlay controls** (bottom-right): Re-upload (file input), Remove PPT (confirm), Full screen (link) | **MISSING** |
| **Keyboard navigation**: Arrow keys (←/→) for slides, disabled on input focus | **MISSING** |
| **Slide info modal**: "View parsed information" → title + bullets + "Modified" badge | **MISSING** |
| **Real upload pipeline**: PptxUploadZone → presigned URL → conversion polling (2s, 150 max) | Frame-based animation only |
| **Error states** with retry button | None |

### 4. Right Panel - Missing Modified/Voice Change Banners, Retry Button, Editable Textarea

| Actual (`SlideEditor.tsx` right panel) | Remotion (`SlideEditorScene.tsx`, `AudioPreview.tsx`) |
|----------------------------------------|------------------------------------------------------|
| **Modified slides banner**: Amber "N slide(s) modified since re-upload" | **MISSING** |
| **Voice changed banner**: Amber "Voice settings changed. Regenerate audio..." | **MISSING** |
| **Retry button** (outline) shown after audio generation failure | **MISSING in SlideEditorScene** |
| **Narration textarea**: Editable `Textarea` with word/char count, dynamic placeholder | Static div with typing animation |
| **Generate Audio button**: Primary with Play icon, spinner when loading | Styled div "▶ Generate Audio" |
| **AudioPlayer**: Hidden `<audio>` element, per-slide URLs via API | Visual only, no audio element |

### 5. AudioPlayer - No Hidden Audio Element, No Click-to-Seek, No Per-Slide URL Resolution

| Actual (`AudioPlayer.tsx:161 lines`) | Remotion (`AudioPlayer.tsx`) |
|--------------------------------------|------------------------------|
| Hidden `<audio ref={audioRef} src={resolvedUrl} preload="auto">` | **MISSING** |
| **Click-to-seek** on progress bar | Progress fill only |
| **Hover thumb** on slider (`group-hover:opacity-100`) | No thumb |
| **Per-slide URL resolution**: `/api/presentations/:id/audio/slide/:num` | Static props |
| **Error state**: Red banner "Failed to load audio. Try generating audio again." | **MISSING** |
| **Loading state**: Spinner in play button | Progress prop only |
| **Play button**: 44px touch target (`min-h-[44px] min-w-[44px]`) | 40px circle |
| **onEnded/onError** callbacks | **MISSING** |

### 6. RegenerateModal - Only Generating Step Implemented

| Actual (3 steps) | Remotion (`AudioGeneration.tsx` modal) |
|------------------|----------------------------------------|
| **Step 1 Review**: Expandable slides (ChevronRight/Down), slide title + "Modified" badge, bullets on expand, navigate to slide | **MISSING** |
| **Voice changed banner**: Blue "Voice settings changed. All slides will be regenerated." | **MISSING** |
| **Affected slides list**: Only modified/changed (or all if voice changed) | **MISSING** |
| **Step 2 Generating**: Spinner, "Slide X of Y: Title", progress bar, error display, **Cancel button** | Spinner, slide number, progress bar, percentage |
| **Step 3 Complete**: Success/Partial failure, summary counts, **"Retry Failed"** button, Close | Green banner only (success case) |

---

## High Priority Gaps (Priority: 🟠 FIX SOON)

### 7. Mobile Responsive - Actual Has Drawers, Remotion Desktop-Only

| Actual | Remotion |
|--------|----------|
| Left sidebar → bottom sheet drawer (microphone button) | Fixed left panel |
| Right panel → bottom drawer (chat bubble FAB) | Fixed right panel |
| Mobile breadcrumb truncation | Full breadcrumb |

### 8. Auto-Save & Save Status Indicator

| Actual (`page.tsx:20-35`) | Remotion |
|---------------------------|----------|
| Top bar: "Saving…" (gray dot), "Saved" (green dot), "Save failed" (red dot) | **MISSING** |
| 2s debounced PATCH to `/api/presentations/:id/state` | **MISSING** |
| `beforeunload` warning on unsaved changes | **MISSING** |

### 9. Presentation Actions in Top Bar

| Actual (`page.tsx:354-439`) | Remotion |
|-----------------------------|----------|
| Rename (pencil), Archive (archive icon), Delete (trash, red hover) | **MISSING** |
| Archive shows "Restore" (rotate icon) when archived | **MISSING** |
| All open respective dialogs | **MISSING** |

### 10. Narration Generation Pipeline

| Actual (`SlideEditor.tsx`) | Remotion |
|----------------------------|----------|
| Auto-generates on first load via `/api/generate/narration` | **MISSING** |
| "Try again" button on failure | **MISSING** |
| Rate limit handling with countdown toast | **MISSING** |
| Partial failure: "AI narration skipped N slide(s): ..." toast | **MISSING** |
| Changed slides tracking (`changedSlides` array) | **MISSING** |

### 11. Voice Change Detection

| Actual | Remotion |
|--------|----------|
| `voiceChangedSinceAudio` tracks voice/description/ultimateMode vs snapshot | **MISSING** |
| Shows amber banner when voice changed | **MISSING** |

### 12. Ultimate Clone Mode

| Actual | Remotion |
|--------|----------|
| Switch in sidebar for cloned voices | **MISSING** |
| Disables control instructions when active | **MISSING** |

---

## Medium Priority Gaps (Priority: 🟡 FIX FOR POLISH)

### 13. Three-Panel Layout Implementation Difference

| Actual | Remotion |
|--------|----------|
| Absolute positioning: `md:ml-80 md:mr-[380px]`, sidebar `absolute bottom-0 left-0 top-0 z-30 w-80` | Flex container with fixed widths |

### 14. Breadcrumb Navigation

| Actual | Remotion |
|--------|----------|
| "All Projects / Project / Presentation" with clickable links | Visual only |

### 15. Loading Skeletons

| Actual | Remotion |
|--------|----------|
| Full skeleton for left sidebar, center, right panel | None |

### 16. Error Boundaries

| Actual | Remotion |
|--------|----------|
| `<ErrorBoundary>` wraps SlideEditor with reload button | **MISSING** |

---

## Files to Create/Modify in Remotion Demo

### New Components Needed (14 files)
1. `SlidePdfViewer.tsx` - `react-pdf` wrapper
2. `PptxUploadZone.tsx` - Drag-drop upload
3. `VoiceRecorder.tsx` - WebRTC recording
4. `ReUploadModal.tsx` - Diff view
5. `RegenerateModal.tsx` - 3-step flow
6. `ShareSettingsPanel.tsx` - Full settings
7. `ViewerTable.tsx` - Viewer tracking
8. `SlideInfoModal.tsx` - Parsed slide info
9. `CreatePresentationDialog.tsx` - Title form
10. `RenamePresentationDialog.tsx` - Rename
11. `DeletePresentationDialog.tsx` - Delete confirm
12. `ConfirmArchiveDialog.tsx` - Archive confirm
13. `ErrorBoundary.tsx` - Error wrapper
14. `AutoSaveIndicator.tsx` - Save status

### Components to Rewrite
1. `VoiceSelection.tsx` → `CreatePageSidebar.tsx` - Radix Select, optgroups, preview API, Ultimate Clone Switch, state-dependent CI textarea
2. `UploadPptx.tsx` → `SlideEditorCenter.tsx` - PDF viewer, overlay controls, keyboard nav, slide info modal
3. `SlideEditorScene.tsx` → `SlideEditorRight.tsx` - Editable textarea, modified/voice banners, retry button, real AudioPlayer
4. `AudioPlayer.tsx` - Hidden audio element, click-to-seek, per-slide URLs, error handling
5. `AudioGeneration.tsx` → `RegenerateModal.tsx` - Full 3-step with expandable slides, cancel, retry failed
6. `ShareSettings.tsx` → `ShareSettingsPanel.tsx` - Password strength, calendar popover, email gate, viewer table

---

## Verification Checklist

After fixes, verify:
- [ ] Voice selector uses Radix Select with Preset/Cloned optgroups
- [ ] Voice preview calls API and plays audio
- [ ] Control Instructions textarea has 4 state variations
- [ ] Ultimate Clone Switch appears for cloned voices, disables CI
- [ ] Center panel renders slides via `react-pdf` (not HTML)
- [ ] Overlay controls: Re-upload, Remove PPT, Full screen
- [ ] Arrow key navigation between slides
- [ ] Slide info modal with parsed content
- [ ] Right panel: Modified slides banner, Voice changed banner
- [ ] Narration textarea editable with word/char count
- [ ] Generate Audio button with loading spinner
- [ ] AudioPlayer has hidden `<audio>`, click-to-seek, per-slide URLs
- [ ] RegenerateModal: 3 steps (Review→Generating→Complete)
- [ ] Review step: expandable slides with bullets, navigate to slide
- [ ] Generating step: per-slide progress with title, Cancel button
- [ ] Complete step: success/partial failure, Retry Failed button
- [ ] ReUploadModal: 3 diff types (replacement/changed/identical)
- [ ] VoiceRecorder: WebRTC, 30s timer, tips, example script, playback
- [ ] ShareSettingsPanel: password strength meter, calendar popover, email gate
- [ ] ViewerTable: pagination, CSV export
- [ ] Mobile: sidebar drawer, right panel drawer
- [ ] Auto-save indicator: Saving/Saved/Failed states
- [ ] Presentation actions: Rename, Archive/Restore, Delete
- [ ] ErrorBoundary wraps editor with reload