import Image from "next/image"
import { RefreshCw } from "lucide-react"

export function ViewNavbar({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center px-4 sm:px-6 lg:px-8">
        <Image src="/logo-wordmark.svg" alt="Moduvox" width={112} height={28} className="h-7 w-auto" priority />
        <div className="ml-auto" />
        {onRefresh && (
          <button
            type="button"
            aria-label="Refresh page"
            onClick={onRefresh}
            className="touch-target-sm flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}
      </div>
    </header>
  )
}
