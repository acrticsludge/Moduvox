# Plan: Add True Fullscreen Mode for Slide Viewer

## Implementation Order

### Step 1: Add fullscreen hook or utility
**File:** `frontend/lib/use-fullscreen.ts` (new)
- Custom hook wrapping the Fullscreen API:
  - `isFullscreen: boolean`
  - `toggle(element?: HTMLElement)` → request/exit fullscreen
  - `supported: boolean` (feature detection)
- Handle cross-browser prefixes (webkit, moz, ms)
- Listen for `fullscreenchange` event

### Step 2: Update SlideEditor fullscreen button
**File:** `frontend/components/dashboard/SlideEditor.tsx`
- Replace current `<a href={pdfUrls[currentIndex]} target="_blank">Full screen</a>` with a fullscreen toggle
- On click, request fullscreen on the slide viewer container element
- In fullscreen, hide all surrounding UI (sidebar, right panel, navbar)
- Show "Exit fullscreen" overlay button
- Arrow key navigation works in fullscreen

### Step 3: Add fullscreen-aware styling
**File:** `frontend/components/dashboard/SlideEditor.tsx` (add fullscreen CSS)
- When in fullscreen: viewer takes 100vw × 100vh
- SlidePdfViewer scales to fit viewport
- Minimal overlay controls (exit button, slide number, nav arrows)

### Step 4: Fallback behavior
- If Fullscreen API unsupported, fall back to opening PDF in new tab (current behavior)

## Verification
1. Click "Fullscreen" → viewer expands to fill screen
2. Editor UI (sidebar, right panel, navbar) is hidden
3. Arrow keys navigate slides
4. "Exit fullscreen" button visible → click to exit
5. Esc key exits fullscreen
6. On unsupported browsers, opens in new tab
7. Layout restored correctly on exit
