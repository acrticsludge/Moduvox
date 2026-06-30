import { SkipBack, Play, SkipForward } from "lucide-react"

export function BentoPlayer() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      {/* Slide area */}
      <div className="bg-zinc-100 p-5">
        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-zinc-500 shadow-sm">
            1 / 5
          </div>
          <div className="p-5">
            <h3 className="text-sm font-bold text-[#18181B]">
              Q4 Revenue Overview
            </h3>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2 text-xs text-zinc-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                Market trends and competitive positioning
              </li>
              <li className="flex items-start gap-2 text-xs text-zinc-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                Growth projections for Q1 2025
              </li>
              <li className="flex items-start gap-2 text-xs text-zinc-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                Key strategic initiatives and roadmap
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Narration caption */}
      <div className="border-t border-zinc-100 px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          Narration
        </p>
        <p className="mt-1 text-xs italic text-zinc-600">
          &ldquo;Let&rsquo;s walk through the key highlights from this
          quarter&rsquo;s performance.&rdquo;
        </p>
      </div>

      {/* Controls bar */}
      <div className="border-t border-zinc-200 px-4 py-3">
        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-zinc-200">
          <div className="h-1.5 w-[35%] rounded-full bg-[#18181B] transition-all" />
        </div>

        {/* Transport controls */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 hover:text-[#18181B]"
            >
              <SkipBack className="h-3 w-3" />
            </button>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#18181B] text-white"
            >
              <Play className="h-3 w-3" />
            </button>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 hover:text-[#18181B]"
            >
              <SkipForward className="h-3 w-3" />
            </button>
          </div>
          <span className="text-[10px] tabular-nums text-zinc-400">
            1:24 / 3:47
          </span>
        </div>

        {/* Slide scrubber */}
        <div className="mt-2 flex items-center gap-1">
          <div className="h-1 flex-1 rounded-full bg-[#18181B]" />
          <div className="h-1 flex-1 rounded-full bg-zinc-400" />
          <div className="h-1 flex-1 rounded-full bg-zinc-200" />
          <div className="h-1 flex-1 rounded-full bg-zinc-200" />
          <div className="h-1 flex-1 rounded-full bg-zinc-200" />
        </div>
      </div>
    </div>
  )
}
