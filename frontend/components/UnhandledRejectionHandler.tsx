"use client"

import { useEffect } from "react"

export function UnhandledRejectionHandler() {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason)
    }
    window.addEventListener("unhandledrejection", handler)
    return () => window.removeEventListener("unhandledrejection", handler)
  }, [])

  return null
}
