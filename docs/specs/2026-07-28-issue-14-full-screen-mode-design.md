# Issue #14: Full Screen Option (Editor + Viewer)

## Status
Spec updated — planning phase (was: editor only)

## Root Cause
**Editor:** The "Full screen" button (`<a href={pdfUrls[currentIndex]} target="_blank">`) opens the raw slide PDF in a new browser tab. This provides no UI context, no navigation controls, and breaks the app experience.

**Viewer:** No fullscreen option exists at all. The viewer has a slide area, sidebar, audio bar, and footer but no way to view just the slide fullscreen.

## Expected Behavior
- **Editor:** Toggle that expands the slide viewer to fill the browser window, hiding sidebars, panels, and navbar. Arrow keys still navigate slides. Shows an "Exit fullscreen" overlay button.
- **Viewer:** Toggle that expands the slide viewing area to fullscreen, hiding the sidebar, audio bar (but audio continues playing), and footer. Shows minimal controls.

## Actual Behavior
- Editor opens raw PDF in new tab
- Viewer has no fullscreen at all

## Files Affected
- `frontend/lib/use-fullscreen.ts` (new) — shared hook wrapping Fullscreen API
- `frontend/components/dashboard/SlideEditor.tsx` — replace fullscreen link with toggle
- `frontend/app/view/[shareToken]/page.tsx` — add fullscreen button in the slide area
- `frontend/components/shared/SlidePdfViewer.tsx` — fullscreen-aware container

## Edge Cases
1. Fullscreen API not supported → fall back to `window.open(pdfUrl)` for the editor
2. Fullscreen navigation: arrow keys should still work in both editor and viewer
3. Audio continues playing in viewer fullscreen
4. Exiting fullscreen restores the layout unchanged
5. Mobile: Android Chrome supports fullscreen, Safari iOS does not (use fallback)

## Acceptance Criteria: Editor
1. "Fullscreen" button uses `element.requestFullscreen()` on the slide viewer container
2. In fullscreen: navbar, sidebar, right panel, bottom drawer all hidden
3. Arrow keys navigate slides
4. Overlay button "Exit fullscreen" appears on hover
5. Esc key exits fullscreen
6. Fallback: opens PDF in new tab when API unavailable

## Acceptance Criteria: Viewer
1. Fullscreen button on the slide viewer area
2. In fullscreen: sidebar, audio bar, footer hidden (audio keeps playing)
3. Minimal overlay: [Exit fullscreen] + [slide counter] + [prev/next arrows]
4. Esc to exit
5. Fallback: expand the viewer container to max width instead of true fullscreen
