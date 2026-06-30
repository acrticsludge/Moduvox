import { Upload, Mic } from "lucide-react"

export function BentoUpload() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="p-5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          Upload your PPTX
        </p>

        {/* Drop zone */}
        <div className="mt-3 cursor-pointer rounded-lg border-2 border-dashed border-zinc-300 p-5 text-center hover:border-zinc-400 hover:bg-zinc-50">
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100">
            <Upload className="h-4 w-4 text-[#18181B]" />
          </div>
          <p className="mt-2 text-xs font-medium text-[#18181B]">
            Drop your PPTX here
          </p>
          <p className="mt-1 text-[10px] text-[#71717A]">
            .pptx files up to 50MB &middot; max 30 slides
          </p>
        </div>

        {/* Voice sample card */}
        <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-100">
              <Mic className="h-3 w-3 text-zinc-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-[#18181B]">
                Record voice sample
              </p>
              <p className="text-[10px] text-[#71717A]">
                30 seconds &middot; WAV or MP3
              </p>
            </div>
          </div>
          <div className="mt-2 h-1 w-full rounded-full bg-zinc-200">
            <div className="h-1 w-0 rounded-full bg-[#18181B]" />
          </div>
        </div>
      </div>
    </div>
  )
}
