export function EditorMockup() {
  return (
    <div className="w-full max-w-[500px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
      {/* Title bar */}
      <div className="flex items-center gap-1.5 border-b border-zinc-200 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
        <span className="ml-3 text-[11px] font-medium text-zinc-400">
          Moduvox — Security Training Q3
        </span>
      </div>

      <div className="flex">
        {/* Slide thumbnail strip */}
        <div className="flex flex-col gap-1.5 border-r border-zinc-200 bg-zinc-50 p-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-9 w-14 rounded border ${i === 1 ? "border-zinc-800 ring-1 ring-zinc-800" : "border-zinc-200"} bg-white p-1 shadow-xs`}
            >
              <div className="flex h-full flex-col gap-[1px]">
                <div
                  className={`h-[3px] w-3/5 rounded-[1px] ${i === 1 ? "bg-zinc-800" : "bg-zinc-300"}`}
                />
                <div className="h-[2px] w-full rounded-[1px] bg-zinc-200" />
                <div className="h-[2px] w-3/4 rounded-[1px] bg-zinc-200" />
              </div>
            </div>
          ))}
        </div>

        {/* Main editor area */}
        <div className="flex flex-1 flex-col">
          {/* Slide preview */}
          <div className="flex items-center justify-center border-b border-zinc-200 bg-zinc-50 p-6">
            <div className="aspect-video w-full max-w-none rounded-lg border border-zinc-300 bg-white p-6 shadow-sm">
              <div className="flex h-full flex-col gap-2">
                <div className="h-3 w-3/5 rounded bg-zinc-800" />
                <div className="mt-auto flex flex-col gap-1.5">
                  <div className="h-2 w-full rounded bg-zinc-200" />
                  <div className="h-2 w-4/5 rounded bg-zinc-200" />
                  <div className="h-2 w-3/5 rounded bg-zinc-200" />
                </div>
              </div>
            </div>
          </div>

          {/* Narration editor */}
          <div className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500">
                Narration
              </span>
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                Calm
              </span>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex flex-col gap-1.5">
                <div className="h-2.5 w-full rounded bg-zinc-300" />
                <div className="h-2.5 w-11/12 rounded bg-zinc-200" />
                <div className="h-2.5 w-5/6 rounded bg-zinc-200" />
                <div className="h-2.5 w-3/4 rounded bg-zinc-200" />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">5 of 12 slides</span>
              <div className="flex gap-1">
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500">
                  Previous
                </span>
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] text-white">
                  Next
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
