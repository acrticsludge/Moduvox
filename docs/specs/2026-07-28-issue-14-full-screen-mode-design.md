# Issue #14: Full Screen Option

## Status
Not started — planning phase

## Root Cause
The editor currently has a "Full screen" link (`<a href={pdfUrls[currentIndex]} target="_blank">`) that opens the current slide PDF in a new browser tab. This opens the raw PDF, not a full-screen mode within the app. There's no proper fullscreen toggle that uses the Fullscreen API to view the slide in fullscreen within the editor.

## Expected Behavior
- A proper fullscreen toggle that expands the slide viewer to full screen
- Fullscreen mode hides editor UI (sidebar, panels) and shows only the slide
- User can exit fullscreen via Esc or a close button

## Actual Behavior
- "Full screen" opens PDF in a new tab (raw PDF viewer, not app-integrated)
- No in-app fullscreen experience

## Files Affected
- `frontend/components/dashboard/SlideEditor.tsx` — fullscreen toggle button + logic
- `frontend/components/shared/SlidePdfViewer.tsx` — fullscreen-aware sizing

## Edge Cases
1. Fullscreen API not supported (Safari non-iOS) → fall back to PDF in new tab
2. Multiple fullscreen elements → only one at a time
3. Fullscreen navigation (arrow keys should still work) → handle in fullscreen
4. Exiting fullscreen should restore editor layout unchanged
5. Mobile fullscreen → different UX, portrait orientation

## Acceptance Criteria
1. "Fullscreen" button uses `element.requestFullscreen()` to expand the slide viewer
2. In fullscreen, only the slide is visible (no sidebar, no right panel, no navbar)
3. Exit via Esc, a visible "Exit fullscreen" button, or F11
4. Arrow key navigation works in fullscreen
5. Fallback to `target="_blank"` PDF link when Fullscreen API unavailable
6. Smooth transition, no layout jump on enter/exit
