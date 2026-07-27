"use client"

import { useState, useEffect, useCallback } from "react"

/**
 * Hook wrapping the Fullscreen API with cross-browser support.
 *
 * Returns:
 * - isFullscreen: boolean
 * - supported: boolean (feature detection)
 * - enter: (el: HTMLElement) => Promise<void>
 * - exit: () => Promise<void>
 * - toggle: (el: HTMLElement) => Promise<void>
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const supported =
    typeof document !== "undefined" &&
    (document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      false)

  useEffect(() => {
    function onChange() {
      setIsFullscreen(
        !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement
        ),
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

  const enter = useCallback(async (element: HTMLElement) => {
    if (element.requestFullscreen) {
      await element.requestFullscreen()
    } else if ((element as any).webkitRequestFullscreen) {
      await (element as any).webkitRequestFullscreen()
    } else if ((element as any).mozRequestFullScreen) {
      await (element as any).mozRequestFullScreen()
    }
  }, [])

  const exit = useCallback(async () => {
    if (document.exitFullscreen) {
      await document.exitFullscreen()
    } else if ((document as any).webkitExitFullscreen) {
      await (document as any).webkitExitFullscreen()
    } else if ((document as any).mozCancelFullScreen) {
      await (document as any).mozCancelFullScreen()
    }
  }, [])

  const toggle = useCallback(
    async (element: HTMLElement) => {
      if (isFullscreen) {
        await exit()
      } else {
        await enter(element)
      }
    },
    [isFullscreen, enter, exit],
  )

  return { isFullscreen, supported, enter, exit, toggle }
}
