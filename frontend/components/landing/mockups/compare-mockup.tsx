export function CompareMockup() {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-zinc-200 bg-white p-5 shadow-lg">
      <div className="flex items-center gap-2">
        {/* Old slide */}
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-400">Old</span>
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">Slide 7</span>
          </div>
          <div className="aspect-[4/3] rounded-lg border border-zinc-200 bg-white p-3 shadow-xs">
            <div className="flex h-full flex-col gap-2">
              <div className="h-2.5 w-4/5 rounded bg-zinc-300" />
              <div className="mt-1 flex flex-col gap-1.5">
                <div className="h-1.5 w-full rounded bg-zinc-200" />
                <div className="h-1.5 w-full rounded bg-zinc-200" />
                <div className="h-1.5 w-3/4 rounded bg-zinc-200" />
              </div>
              <div className="mt-auto h-1.5 w-1/2 rounded bg-zinc-100" />
            </div>
          </div>
        </div>

        {/* Arrow between */}
        <div className="flex shrink-0 items-center justify-center">
          <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </div>

        {/* New slide */}
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-medium text-green-600">Updated</span>
            <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
              Slide 7
            </span>
          </div>
          <div className="aspect-[4/3] rounded-lg border-2 border-green-300 bg-white p-3 shadow-xs">
            <div className="flex h-full flex-col gap-2">
              <div className="h-2.5 w-3/5 rounded bg-zinc-800" />
              <div className="mt-1 flex flex-col gap-1.5">
                <div className="h-1.5 w-full rounded bg-zinc-200" />
                <div className="h-1.5 w-full rounded bg-zinc-200" />
                <div className="h-1.5 w-3/4 rounded bg-zinc-200" />
              </div>
              <div className="mt-auto">
                <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  New policy: phishing prevention
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg bg-zinc-50 p-2.5">
        <span className="text-xs text-zinc-500">
          Only <span className="font-semibold text-zinc-800">1 of 12</span> slides changed
        </span>
        <span className="rounded bg-zinc-800 px-3 py-1 text-xs font-medium text-white">
          Update presentation
        </span>
      </div>
    </div>
  );
}
