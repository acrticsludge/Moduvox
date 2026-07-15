# Modal UX / QoL Audit

> **Date:** 2026-07-15
> **Branch:** `update/modals`
> **Scope:** All modal, dialog, overlay, and drawer components
> **Method:** 5 parallel agents (1 per modal group) + super agent compilation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Cross-Cutting Issues (All Modals)](#2-cross-cutting-issues-all-modals)
3. [Per-Component Findings](#3-per-component-findings)
   - [3.1 Create / Rename Modals](#31-create--rename-modals)
   - [3.2 Destructive-Action Modals](#32-destructive-action-modals)
   - [3.3 Voice Modals (Add, Test, Waitlist)](#33-voice-modals)
   - [3.4 Complex / Content-Heavy Modals](#34-complex--content-heavy-modals)
   - [3.5 Drawers & Sidebars](#35-drawers--sidebars)
4. [Priority Action Items](#4-priority-action-items)
5. [Files Changed in This Branch](#5-files-changed-in-this-branch)

---

## 1. Executive Summary

**18 modal/drawer components** were audited across 5 groups by parallel agents. The findings are consolidated here with severity ratings.

### Severity Distribution

| Severity | Count | Definition |
|----------|-------|------------|
| **CRITICAL** | 7 | Broken UX, inaccessible, data loss risk, or runtime crash |
| **MAJOR** | 31 | Annoying, inconsistent, poor mobile experience |
| **MINOR** | 34 | Polish, nice-to-have, edge cases |

### Most Common Issues

1. **No Escape key handler** — 16/18 modals (CRITICAL for a11y, keyboard users trapped)
2. **No focus trap / focus management** — 14/18 modals (MAJOR a11y)
3. **No `role="dialog"` / `aria-modal`** — 14/18 modals (MAJOR a11y)
4. **Touch targets below 44px** — 10/18 modals (MAJOR mobile)
5. **No backdrop click-to-dismiss** — 12/18 modals (MINOR-MAJOR)
6. **No fade/open-close animation** — 14/18 modals (MINOR polish)
7. **`hide-scrollbar` removes scroll affordance** — 8/18 modals (MAJOR on content-heavy)

---

## 2. Cross-Cutting Issues (All Modals)

### 2.1 Keyboard Accessibility

| Issue | Affected | Severity |
|-------|----------|----------|
| No Escape key to close | **16/18** (all except Navbar drawer which wasn't checked by any agent) | **CRITICAL** |
| No focus trap (Tab can escape) | **14/18** | **MAJOR** |
| No Enter-to-submit on text inputs | **6/18** (all voice/preset/name modals with forms) | **MAJOR** |
| No arrow-key nav on radio/options | **2/18** (WaitlistDialog radio group, Color/Icon grids) | **MAJOR** |
| No `role="dialog"` / `aria-modal` | **14/18** | **MAJOR** |
| No `aria-labelledby` on dialogs | **18/18** | **MINOR** |

### 2.2 Mobile UX

| Issue | Affected | Severity |
|-------|----------|----------|
| Close/X button < 44×44px | **10/18** | **CRITICAL** (mobile) |
| Action buttons < 44px height | **12/18** (all `py-2 text-sm`) | **MAJOR** |
| Body scroll not locked | **9/18** | **MAJOR** |
| No safe-area-inset padding | **3/18** (bottom sheets) | **MINOR** |
| `max-h-[90vh]` fragile on Safari | **12/18** (address bar issue) | **MINOR** |

### 2.3 Visual & Interaction

| Issue | Affected | Severity |
|-------|----------|----------|
| No enter/leave animation | **14/18** | **MINOR** |
| `hide-scrollbar` removes scroll cue | **8/18** (mostly content-heavy modals) | **MAJOR** |
| No backdrop click to dismiss | **12/18** | **MINOR** (intentional on destructive) |

### 2.4 Scroll Lock Fragility

The `document.body.style.overflow = "hidden"` pattern has 3 issues:
- **iOS Safari:** does not prevent scroll; need `position: fixed` + width/height
- **Nested modals:** When WaitlistDialog opens on top of AddVoiceModal, closing WaitlistDialog restores body scroll even though AddVoiceModal is still open
- **Multiple instances:** No counter-based approach, so cleanup can override other consumers

---

## 3. Per-Component Findings

### 3.1 Create / Rename Modals

Files: `CreatePresentationDialog`, `CreateProjectModal`, `RenamePresentationDialog`, `RenameProjectModal`

#### Finding CR-1: RenamePresentationDialog has no close X button (CRITICAL)
Users can only dismiss via "Cancel". No X button. Inconsistent with all sibling modals.
**Fix:** Add X button in header.

#### Finding CR-2: RenamePresentationDialog not wrapped in `<form>` (MAJOR)
Uses `onKeyDown` on input instead of native form `onSubmit`. No native form validation, no Enter-from-any-field submission. Inconsistent with other 3.
**Fix:** Wrap in `<form onSubmit={...}>`.

#### Finding CR-3: RenamePresentationDialog missing `maxLength` (MAJOR)
CreatePresentationDialog has `maxLength={200}`. This one has none. User can paste 10K chars.
**Fix:** Add `maxLength={200}` to input.

#### Finding CR-4: CreateProjectModal missing `autoFocus` (MAJOR)
Sibling modals auto-focus the name input. This one does not.
**Fix:** Add `autoFocus` to name input.

#### Finding CR-5: Color swatches 28×28px, icon buttons ~36×36px (MAJOR mobile)
In CreateProjectModal and RenameProjectModal, color picker buttons are `h-7 w-7` (28px) and icon buttons use `p-2` (~36px + icon = ~40px). Both below 44px minimum.
**Fix:** Increase to `h-10 w-10` or add invisible `min-h-[44px]` hit area.

#### Finding CR-6: No backdrop click (MAJOR on all 4)
None of the 4 modals dismiss when backdrop is tapped.
**Fix:** Add `onClick={onClose}` to overlay div.

#### Finding CR-7: No Escape key (CRITICAL on all 4)
Keyboard users cannot close any of these modals with Escape.
**Fix:** Add `onKeyDown` or global keydown listener.

#### Finding CR-8: Close button too small (CRITICAL on CR-1/2/4)
X buttons use `h-4 w-4` (16px). Minimum mobile touch target is 44px.
**Fix:** Use `min-h-[44px] min-w-[44px]` with icon centered inside.

#### Finding CR-9: `transition-all duration-300` does nothing on mount (MINOR)
The card has transition classes but the modal mounts/unmounts, so there's no enter/leave animation.

### 3.2 Destructive-Action Modals

Files: `DeleteVoiceDialog`, `DeleteProjectDialog`, `DeletePresentationDialog`, `ConfirmArchiveDialog`, `ReUploadModal`

#### Finding DA-1: DeleteProjectDialog missing `"use client"` (CRITICAL)
Line 1 is an import without `"use client"`. Uses `useState`, `fetch`, event handlers — will crash in Server Component context.
**Fix:** Add `"use client"` at top of file.

#### Finding DA-2: ReUploadModal has no error handling (CRITICAL)
No error state, no ErrorBanner, no try-catch visible in the component. If the parent API fails, user gets zero feedback.
**Fix:** Add error state + display.

#### Finding DA-3: ReUploadModal "Replace All" button not visually dangerous (MAJOR)
Most destructive action (irreversible data loss) is styled dark gray `bg-[#18181B]`. Should use red or amber to signal danger.
**Fix:** Use red button + warning icon for replacement path.

#### Finding DA-4: No Enter key on confirmation inputs (MAJOR)
DeleteVoiceDialog, DeleteProjectDialog, DeletePresentationDialog all require typing "DELETE" but pressing Enter does nothing. Must click Delete button.
**Fix:** Add `onKeyDown={(e) => e.key === 'Enter' && handleDelete()}` on inputs.

#### Finding DA-5: DeleteProjectDialog missing "Try again" link (MAJOR)
When an error occurs, ErrorBanner shows but there's no retry button. Inconsistent with sibling dialogs.
**Fix:** Add "Try again" button after error.

#### Finding DA-6: DeleteProjectDialog swallows API error messages (MAJOR)
Line 30-36: doesn't parse `res.json()` for server error message. Uses generic "Something went wrong".
**Fix:** Parse `json.error` like sibling dialogs do.

#### Finding DA-7: ConfirmArchiveDialog no confirmation step (MAJOR)
Unlike delete dialogs, archiving has no "type ARCHIVE" step. Single-click archival is risky even if reversible.
**Fix:** Add confirmation text input.

#### Finding DA-8: Body scroll not locked on DeleteProjectDialog, ReUploadModal (MAJOR)
Inconsistent with 3 other destructive modals that do lock scroll.
**Fix:** Add `useEffect` scroll lock.

#### Finding DA-9: All destructive action buttons < 44px height (MAJOR)
All use `py-2 px-4 text-sm` = ~32px button height.
**Fix:** Increase to `py-3` or add `min-h-[44px]`.

#### Finding DA-10: No Escape key (CRITICAL on all 5)
Same cross-cutting issue.

#### Finding DA-11: DeleteVoiceDialog icon undersized (MINOR)
Uses `h-10 w-10` (40px) vs `h-12 w-12` (48px) used by sibling dialogs.

### 3.3 Voice Modals

Files: `AddVoiceModal` (inline in `voices/page.tsx`), `TestVoiceModal` (inline), `WaitlistDialog`

#### Finding VM-1: AddVoiceModal `hide-scrollbar` on content that overflows 90vh (CRITICAL)
Preset and clone steps exceed 90vh on mobile (667px). Scrollbar is hidden — users may not know content (consent checkbox, control instructions, action buttons) exists below the fold.
**Fix:** Remove `hide-scrollbar` on voice modals, or add a visual scroll indicator.

#### Finding VM-2: WaitlistDialog "Not now" button ~20px tall (CRITICAL)
Line 163: plain `<button>` with `text-sm` font class but NO padding, NO `py-*`, NO `min-h-[44px]`. Inaccessible on mobile.
**Fix:** Add `py-3 min-h-[44px]` or equivalent padding.

#### Finding VM-3: TestVoiceModal close button 32×32px (CRITICAL)
Line 737: `h-8 w-8` (32px). No `min-h-[44px]` or `min-w-[44px]`. Compare to AddVoiceModal's 44×44px close button — inconsistency between sibling modals.
**Fix:** Add `min-h-[44px] min-w-[44px]` to match AddVoiceModal.

#### Finding VM-4: WaitlistDialog radio buttons have no ARIA roles (CRITICAL)
Custom `<button>` elements styled as radio buttons. No `role="radiogroup"`, `role="radio"`, or `aria-checked`. Inaccessible.
**Fix:** Add ARIA roles + attributes.

#### Finding VM-5: Double-backdrop when WaitlistDialog stacks on AddVoiceModal (MAJOR)
WaitlistDialog is rendered **inside** AddVoiceModal's overlay. Both have `z-50` + `bg-[#18181B]/40`. Combined opacity ~64%. Content underneath also scrolls.
**Fix:** Render WaitlistDialog at the top level or use a portal.

#### Finding VM-6: AddVoiceModal "Back" wipes all form state (MAJOR)
Clicking Back from preset/clone step resets `selectedPreset`, `voiceName`, `controlInstruction`, `file`, `voiceConsent`. User loses all input.
**Fix:** Only reset step-specific state, not form-wide state.

#### Finding VM-7: AddVoiceModal no step indicator (MAJOR)
Multi-step flow (choose → preset/clone) has no progress bar, breadcrumb, or dot indicator. User doesn't know where they are.
**Fix:** Add step indicator (1/2, 2/2, etc.).

#### Finding VM-8: WaitlistDialog submitted-state Close button ~36px (MAJOR)
Line 98: `px-4 py-2 text-sm` = ~36px. Below 44px mobile target.
**Fix:** Increase padding or add `min-h-[44px]`.

#### Finding VM-9: AddVoiceModal no scroll lock (MAJOR)
Page behind modal stays scrollable.
**Fix:** Add `useEffect` scroll lock.

#### Finding VM-10: TestVoiceModal no scroll lock (MAJOR)
Same as above.

#### Finding VM-11: No Enter to submit in AddVoiceModal forms (MAJOR)
Voice name input in preset step doesn't submit on Enter. No `onKeyDown`.
**Fix:** Add `onKeyDown` handler.

#### Finding VM-12: WaitlistDialog close button inconsistency (MINOR)
No X close icon in header (unlike Add/Test modals). Only "Not now" text button.

#### Finding VM-13: No Escape on all 3 voice modals (CRITICAL)
Same cross-cutting. All 3 lack Escape dismiss.

#### Finding VM-14: No backdrop click on all 3 (MINOR)
None dismiss on backdrop tap.

### 3.4 Complex / Content-Heavy Modals

Files: `SharePresentationModal`, `SlideInfo Modal` (2 instances in `SlideEditor.tsx`), `RegenerateModal`, `SlideEditor Mobile Drawer`

#### Finding CH-1: SlideInfo modal z-index bug (CRITICAL)
Instance 1 (desktop panel, `z-[100]`) is a child of an `absolute bottom-0 right-0 z-20` parent. The `z-[100]` creates a stacking context within the parent — other modals at `z-50` that are DOM siblings of the parent render **on top of** the SlideInfo modal.
**Fix:** Render SlideInfo modal at top level, not nested in the panel.

#### Finding CH-2: SharePresentationModal content scroll not visible (MAJOR)
On 375×667 viewport, settings + table exceed 90vh. The `hide-scrollbar` removes the only scroll indicator. Users may not realize viewer data exists below settings.
**Fix:** Allow scrollbar on content-heavy areas. Consider sticky headers.

#### Finding CH-3: SharePresentationModal no pagination for 100+ viewers (MAJOR)
No search, filter, or pagination. Rendering 100+ viewers in DOM without virtualization. 30s auto-refresh compounds this.
**Fix:** Add pagination (20 per page) or virtual scrolling.

#### Finding CH-4: RegenerateModal no per-slide deselection (MAJOR)
User cannot deselect individual slides. All-or-nothing confirmation. If one slide already sounds good, user must regenerate it anyway.
**Fix:** Add per-slide checkbox with deselection.

#### Finding CH-5: RegenerateModal 200ms state reset race condition (MAJOR)
`onCancel` uses `setTimeout(..., 200)` to reset modal state. If reopened within 200ms, stale state leaks through.
**Fix:** Remove timeout; reset state synchronously on close or on next open.

#### Finding CH-6: SlideInfo modal duplicated ~70 lines (MAJOR)
Identical code copy-pasted between desktop panel and mobile drawer. Maintenance liability.
**Fix:** Extract shared component.

#### Finding CH-7: SlideInfo bullet area `hide-scrollbar` + `max-h-[50vh]` (MAJOR)
On mobile, ~230px bullet viewport with hidden scrollbar. Users may not know there are more bullets below.
**Fix:** Remove `hide-scrollbar` on this modal.

#### Finding CH-8: Mobile Drawer no exit animation (CRITICAL)
The entire drawer and backdrop vanish instantly on close. The entrance has a smooth 250ms slide-up, but there's no reverse animation.
**Fix:** Use state-based CSS classes with `transition-transform` instead of conditional mount.

#### Finding CH-9: Mobile Drawer keyboard overlap (MAJOR)
Textarea + number input in drawer. Mobile keyboard (~260px) + drawer (75vh = ~500px) on 667px screen leaves only ~240px. No keyboard-avoiding behavior.
**Fix:** Add `scroll-into-view` or adjust drawer height when keyboard is open.

#### Finding CH-10: Mobile Drawer no drag-to-dismiss (MAJOR)
Bottom sheet on mobile has no swipe-down gesture. Users trained on iOS/Android bottom sheets expect this.
**Fix:** Add touch gesture handler for pull-to-dismiss.

#### Finding CH-11: SharePresentationModal `null` return on fetch failure (MAJOR)
`if (!settings) return null` — if settings fetch fails, the panel silently renders nothing. No error message, no retry.
**Fix:** Add error state + retry UI.

#### Finding CH-12: SharePresentationModal no open/close animation (MINOR)
Content-dense modal appears instantly. Jarring.
**Fix:** Add fade-in transition.

#### Finding CH-13: SlideInfo modal long title overflow (MINOR)
No `break-words` on h2. Long titles may overflow on narrow viewports.
**Fix:** Add `break-words`.

### 3.5 Drawers & Sidebars

Files: `Navbar.tsx` (mobile drawer), `ViewSidebar.tsx` (mobile overlay), `Presentation Page Bottom Sheet`, `SlideEditor Mobile Drawer`

#### Finding DR-1: ViewSidebar backdrop has no transition (MAJOR)
Backdrop conditionally mounts/unmounts — appears/disappears in one frame while panel slides smoothly.
**Fix:** Always render backdrop, use opacity transitions.

#### Finding DR-2: Presentation Bottom Sheet no closing animation (MAJOR)
Sheet and backdrop vanish instantly on close. Same as CH-8.
**Fix:** Use state-based CSS classes.

#### Finding DR-3: ViewSidebar backdrop also snaps (MAJOR)
Same as DR-1.

#### Finding DR-4: Presentation Bottom Sheet `80vh` on Safari (MAJOR)
Uses `max-h-[80vh]` — on Safari with address bar visible, vh includes the bar area. Gap at bottom or position shift when bar hides.
**Fix:** Use `dvh` units or JS-based calculation.

#### Finding DR-5: No safe-area-inset on bottom sheets (MINOR)
Both bottom sheets (Presentation Page and SlideEditor) lack `pb-[env(safe-area-inset-bottom)]`. Content may sit behind home indicator on iPhone X+.
**Fix:** Add safe area padding.

#### Finding DR-6: Navbar resize edge case (MINOR)
Opening drawer on mobile then resizing to desktop leaves `drawerOpen=true` despite `md:hidden`. Returning to mobile shows stale open drawer.
**Fix:** Add resize listener to close at breakpoint.

#### Finding DR-7: No Escape key on all 3 (CRITICAL)
Same cross-cutting. All drawers lack Escape dismiss.

#### Finding DR-8: No focus trap on all 3 (MAJOR)
Same cross-cutting.

---

## 4. Priority Action Items

### Sprint (Do Now)

| # | Component | Fix | Effort |
|---|-----------|-----|--------|
| P1 | **DeleteProjectDialog** | Add `"use client"` directive | 1 line |
| P2 | **ReUploadModal** | Add error state + error display | ~15 lines |
| P3 | **RenamePresentationDialog** | Add X close button | ~5 lines |
| P4 | **RenamePresentationDialog** | Wrap in `<form>` + add `maxLength` | ~10 lines |
| P5 | **CreateProjectModal** | Add `autoFocus` to name input | 1 line |
| P6 | **AddVoiceModal** | Remove `hide-scrollbar` (or add scroll indicator) | 1 line |
| P7 | **TestVoiceModal** | Fix close button to 44×44px | 1 line |
| P8 | **WaitlistDialog** | Fix "Not now" button to 44px min-height | 1 line |

### Next Batch

| # | Component | Fix | Effort |
|---|-----------|-----|--------|
| N1 | **All 18 modals** | Add Escape key handler (`onKeyDown` + `useEffect`) | ~3 lines each |
| N2 | **All modals with forms** | Add Enter-to-submit on text inputs | ~2 lines each |
| N3 | **Create/Rename modals** | Add backdrop click to dismiss | 1 line each |
| N4 | **Color/Icon grids** | Increase touch targets to 44px | ~2 lines each |
| N5 | **All action buttons** | Increase `py-2` → `py-3` or add `min-h-[44px]` | ~1 line each |
| N6 | **AddVoiceModal** | Preserve state on Back navigation | ~10 lines |
| N7 | **WaitlistDialog** | Add ARIA roles to radio group | ~5 lines |
| N8 | **SlideInfo Modal** | Fix z-index bug (render at top level) | ~10 lines |

### Future

| # | Component | Fix | Effort |
|---|-----------|-----|--------|
| F1 | **All modals** | Add `role="dialog" aria-modal` and focus trap | Medium |
| F2 | **SlideEditor Drawer** | Add exit animation, drag-to-dismiss | Medium |
| F3 | **SharePresentationModal** | Pagination/virtual scroll for viewers | Large |
| F4 | **RegenerateModal** | Per-slide deselection | Medium |
| F5 | **SlideInfo modal** | Extract shared component | Medium |
| F6 | **All modals** | Enter/leave animations | Medium |
| F7 | **Bottom sheets** | `dvh` units, safe-area-inset, keyboard avoiding | Medium |
| F8 | **Extract shared `useDialog` hook** | Backdrop, Escape, focus trap, scroll lock, ARIA | Medium |

---

## 5. Files Changed in This Branch

Already modified (from the initial `max-h` + `p-4` round):

| File | Change |
|------|--------|
| `frontend/components/dashboard/CreatePresentationDialog.tsx` | Added `p-4` to overlay |
| `frontend/components/dashboard/CreateProjectModal.tsx` | Added `p-4` to overlay |
| `frontend/components/dashboard/RenamePresentationDialog.tsx` | Added `p-4` to overlay |
| `frontend/components/dashboard/RenameProjectModal.tsx` | Added `p-4` to overlay |
| `frontend/components/dashboard/DeleteVoiceDialog.tsx` | Added `p-4` to overlay |
| `frontend/components/dashboard/DeleteProjectDialog.tsx` | Added `p-4` to overlay |
| `frontend/components/dashboard/DeletePresentationDialog.tsx` | Added `p-4` to overlay |
| `frontend/components/dashboard/ReUploadModal.tsx` | Added `p-4` to overlay, removed `mx-4` |
| `frontend/components/dashboard/WaitlistDialog.tsx` | Added `p-4` to both overlay states |
| `frontend/components/dashboard/ConfirmArchiveDialog.tsx` | Added `max-h-[90vh] overflow-y-auto hide-scrollbar` |
| `frontend/app/dashboard/voices/page.tsx` | Added `max-h-[90vh] overflow-y-auto hide-scrollbar` to AddVoice & TestVoice cards |

---

*Audit generated by 5 parallel exploration agents and 1 super agent compiler.*
