"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

export function ViewNavbar({ onRefresh }: { onRefresh?: () => void }) {
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
