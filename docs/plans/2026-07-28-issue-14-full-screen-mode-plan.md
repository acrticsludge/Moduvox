# Plan: Add Fullscreen Mode to Editor and Viewer

## Implementation Order

### Step 1: Create shared fullscreen hook
**File:** `frontend/lib/use-fullscreen.ts` (new)

```typescript
"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const elementRef = useRef<HTMLElement | null>(null)

  const supported = typeof document !== "undefined" && 
    (document.fullscreenEnabled || 
     (document as any).webkitFullscreenEnabled || 
     (document as any).mozFullScreenEnabled)

  useEffect(() => {
    function onChange() {
      setIsFullscreen(
        !!(document.fullscreenElement || 
           (document as any).webkitFullscreenElement || 
           (document as any).mozFullScreenElement)
      )
    }
    document.addEventListener("fullscreenchange", onChange)
    document.addEventListener("webkitfullscreenchange", onChange)
    document.addEventListener("mozfullscreenchange", onChange)
    return () => {
      document.removeEventListener("fullscreenchange", onChange)
      document.removeEventListener("webkitfullscreenchange", onChange)
      document.removeEventListener("mozfullscreenchange", onChange)
    }
  }, [])

  const enter = useCallback((element: HTMLElement) => {
    elementRef.current = element
    if (element.requestFullscreen) {
      return element.requestFullscreen()
    } else if ((element as any).webkitRequestFullscreen) {
      return (element as any).webkitRequestFullscreen()
    } else if ((element as any).mozRequestFullScreen) {
      return (element as any).mozRequestFullScreen()
    }
  }, [])

  const exit = useCallback(() => {
    if (document.exitFullscreen) {
      return document.exitFullscreen()
    } else if ((document as any).webkitExitFullscreen) {
      return (document as any).webkitExitFullscreen()
    } else if ((document as any).mozCancelFullScreen) {
      return (document as any).mozCancelFullScreen()
    }
  }, [])

  const toggle = useCallback((element: HTMLElement) => {
    if (isFullscreen) return exit()
    return enter(element)
  }, [isFullscreen, enter, exit])

  return { isFullscreen, supported, enter, exit, toggle }
}
```

### Step 2: Update editor fullscreen button
**File:** `frontend/components/dashboard/SlideEditor.tsx`

- Replace the `<a href={pdfUrls[currentIndex]} target="_blank">Full screen</a>` link (lines ~1109-1119) with a button:
```tsx
<button
  type="button"
  onClick={() => fullscreenToggle(slideViewerRef.current)}
  className="..."
>
  <Maximize2 className="h-3 w-3" />
  {isFullscreen ? "Exit full screen" : "Full screen"}
</button>
```
- Add `slideViewerRef` to the slide viewer container div (the `relative flex flex-1 items-center justify-center p-4` div at line ~1060)
- In fullscreen mode, a CSS class hides the right panel, sidebar, and mobile drawer
- Arrow key navigation should continue working (it uses `window.addEventListener("keydown")` — already global)

### Step 3: Update viewer fullscreen
**File:** `frontend/app/view/[shareToken]/page.tsx`
- Add a fullscreen toggle button next to the existing prev/next slide navigation
- The button requests fullscreen on the `main` content area
- In fullscreen: sidebar is hidden (CSS), audio bar overlay at bottom (semi-transparent, auto-hides after 3s)
- Show "Exit fullscreen" button as a floating overlay

### Step 4: CSS for fullscreen modes
- Editor fullscreen: `body:fullscreen .editor-sidebar { display: none }` etc.
- Viewer fullscreen: `body:fullscreen .viewer-sidebar { display: none }` etc.
- Use Tailwind's peer/group or CSS classes toggled by `isFullscreen` state

## Verification
1. Editor: Click "Full screen" → slide expands to full viewport
2. Editor: Sidebar, right panel, mobile button all hidden
3. Editor: Arrow keys navigate slides
4. Editor: Esc exits fullscreen, layout restored
5. Editor: Unsupported browsers → opens PDF in new tab
6. Viewer: Click fullscreen → slide fills viewport
7. Viewer: Audio continues playing during fullscreen
8. Viewer: Floating controls appear on hover
9. Viewer: Esc exits fullscreen
10. Both: Smooth transition, no layout jump
