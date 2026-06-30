import { ChevronLeft, ChevronRight, Play } from "lucide-react"

export function BentoEditor() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-zinc-100 px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          Edit Narration
        </p>
      </div>

      {/* Content */}
      <div className="space-y-3 p-4">
        {/* Slide nav */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#71717A]">Slide</span>
          <div className="flex w-8 items-center justify-center rounded border border-zinc-200 py-0.5 text-xs text-[#18181B]">
            1
          </div>
          <span className="text-xs text-[#71717A]">of 5</span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-[#18181B]"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-[#18181B]"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Narration textarea */}
        <div>
          <p className="text-[10px] font-medium text-[#71717A]">
            Narration Script
          </p>
          <div className="mt-1 min-h-[60px] rounded-lg border border-zinc-200 p-2">
            <p className="text-xs leading-relaxed text-zinc-400">
              Let&rsquo;s walk through the key highlights from this
              quarter&rsquo;s performance...
            </p>
          </div>
          <p className="mt-1 text-right text-[10px] text-zinc-400">
            142 chars
          </p>
        </div>

        {/* Generate button */}
        <div className="inline-block rounded-lg bg-[#18181B] px-3 py-1.5 text-xs font-medium text-white">
          Generate Audio
        </div>

        {/* Audio player */}
        <div className="flex items-center gap-2 rounded-lg border border-zinc-200 p-2">
          <button
            type="button"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#18181B] text-white"
          >
            <Play className="h-3 w-3" />
          </button>
          <div className="flex-1">
            <div className="h-1 w-full rounded-full bg-zinc-200">
              <div className="h-1 w-[60%] rounded-full bg-[#18181B]" />
            </div>
          </div>
          <span className="text-[10px] tabular-nums text-zinc-400">2:15</span>
        </div>
      </div>
    </div>
  )
}
