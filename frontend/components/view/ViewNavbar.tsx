"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

export function ViewNavbar({ onRefresh, onToggleInfo }: { onRefresh?: () => void; onToggleInfo?: () => void }) {
  const [spinning, setSpinning] = useState(false)

  const handleRefresh = useCallback(() => {
    if (spinning) return
    setSpinning(true)
    onRefresh?.()
    // Reset after animation completes (spin + fade)
    setTimeout(() => setSpinning(false), 1000)
  }, [spinning, onRefresh])

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center px-4 sm:px-6 lg:px-8">
        <Image src="/logo-wordmark.svg" alt="Moduvox" width={112} height={28} className="h-7 w-auto" priority />
        <div className="ml-auto" />
        {onToggleInfo && (
          <button
            type="button"
            aria-label="Show presentation info"
            onClick={onToggleInfo}
            className="touch-target-sm mr-1 flex items-center justify-center rounded-lg text-zinc-500 transition-colors hover:text-zinc-800 md:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </button>
        )}
        {onRefresh && (
          <button
            type="button"
            aria-label="Refresh page"
            onClick={handleRefresh}
            className={cn(
              "touch-target-sm flex items-center gap-1.5 text-xs font-medium text-zinc-300 transition-all duration-200 hover:text-zinc-500 focus-visible:outline-none focus-visible:text-zinc-500",
              spinning && "pointer-events-none"
            )}
          >
            <RefreshCw className={cn("h-3.5 w-3.5 transition-transform", spinning && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}
      </div>
    </header>
  )
}
