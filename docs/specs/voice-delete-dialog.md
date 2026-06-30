# Voice Delete Confirmation Dialog — Design Spec

> **Date:** 2026-06-25  
> **Status:** Quick spec  

## Problem
Voice deletion uses `window.confirm()` — an ugly browser popup inconsistent with the project's custom modal pattern.

## Solution
Create `DeleteVoiceDialog` (same pattern as `DeleteProjectDialog`) and wire it into the voices page.

## Component: DeleteVoiceDialog
- Full-screen overlay with semi-transparent background
- max-w-sm white card with rounded-xl, border, shadow-xl, p-6
- TriangleAlert icon in red-100 circle at top center
- "Delete {voice.name}?" heading, centered
- "This will permanently delete this voice. This action cannot be undone." — centered text
- Text input: Type DELETE to confirm (same pattern)
- Cancel (border, flex-1) + Delete (red-600, flex-1) buttons
- Delete disabled when confirm text !== "DELETE" or deleting
- Loader2 on Delete while deleting
- On confirm: DELETE to `/api/voices/{id}` → callback → close
