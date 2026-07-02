import { Play, SkipBack, SkipForward, Volume2 } from "lucide-react"

export function ViewAudioBar() {
  return (
    <div className="border-t border-zinc-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4">
        {/* Skip back */}
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-[#18181B]"
        >
          <SkipBack className="h-5 w-5" />
        </button>

        {/* Play/Pause */}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#18181B] text-white transition-colors hover:bg-[#27272A]"
        >
          <Play className="h-5 w-5 ml-0.5" />
        </button>

        {/* Skip forward */}
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-[#18181B]"
        >
          <SkipForward className="h-5 w-5" />
        </button>

        {/* Progress bar */}
        <div className="relative flex-1">
          <div className="h-1.5 w-full rounded-full bg-zinc-200">
            <div
              className="h-1.5 w-1/3 rounded-full bg-[#18181B] transition-all"
            />
          </div>
        </div>

        {/* Time display */}
        <span className="whitespace-nowrap text-xs font-medium text-zinc-500">
          1:23 / 9:45
        </span>

        {/* Volume */}
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-[#18181B]"
        >
          <Volume2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
