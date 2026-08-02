"use client"

import { Menu, Mic, FileText } from "lucide-react"

/**
 * Floating action dock for small screens. Sits at the bottom-center of the screen
 * and exposes the most-used navigation/editor triggers so the top bar doesn't get
 * crammed: left sidebar + voice info (phones, <md) and the narration script panel
 * (everything below lg, since the desktop narration panel only renders at lg+).
 */
export function MobileActionDock({
  onOpenSidebar,
  onOpenVoice,
  onOpenNarration,
}: {
  onOpenSidebar: () => void
  onOpenVoice: () => void
  onOpenNarration: () => void
}) {
  return (
    <div className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 lg:hidden">
      <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white/95 p-1.5 shadow-lg backdrop-blur-sm">
        {/* Left sidebar drawer — only needed below md (static sidebar at md+) */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex h-11 w-11 min-h-[48px] min-w-[48px] items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 md:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="h-5 w-px bg-zinc-200 md:hidden" />
        {/* Voice info — only needed below md (CreatePageSidebar visible at md+) */}
        <button
          type="button"
          onClick={onOpenVoice}
          className="flex h-11 w-11 min-h-[48px] min-w-[48px] items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 md:hidden"
          aria-label="Voice info"
        >
          <Mic className="h-5 w-5" />
        </button>
        <div className="hidden h-5 w-px bg-zinc-200 md:block" />
        {/* Narration script — needed on all screens below lg (right panel is lg+) */}
        <button
          type="button"
          onClick={onOpenNarration}
          className="flex h-11 w-11 min-h-[48px] min-w-[48px] items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          aria-label="Narration script"
        >
          <FileText className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
