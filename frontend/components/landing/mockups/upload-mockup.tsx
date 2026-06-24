export function UploadMockup() {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-lg">
      <div className="space-y-5">
        {/* Slide upload card */}
        <div className="rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 p-6 text-center transition-colors hover:border-zinc-400">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-xs">
            <svg className="h-5 w-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
            </svg>
          </div>
          <span className="text-sm font-medium text-zinc-600">Drop your PPTX here</span>
          <p className="mt-1 text-xs text-zinc-400">or click to browse (max 50MB)</p>
        </div>

        {/* Voice section */}
        <div>
          <span className="text-xs font-medium text-zinc-500">Voice sample</span>
          <div className="mt-1.5 flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="h-2.5 w-2/3 rounded bg-zinc-200" />
              <div className="mt-1 h-2 w-1/3 rounded bg-zinc-100" />
            </div>
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">Replace</span>
          </div>
        </div>

        {/* Consent */}
        <div className="flex items-center gap-2">
          <span className="flex h-4 w-4 items-center justify-center rounded-[3px] border border-zinc-300 bg-white">
            <svg className="h-3 w-3 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </span>
          <span className="text-xs text-zinc-500">I confirm this is my own voice</span>
        </div>

        {/* Generate button */}
        <div className="flex justify-end">
          <span className="rounded-lg bg-zinc-800 px-5 py-2 text-sm font-medium text-white">
            Generate Narration
          </span>
        </div>
      </div>
    </div>
  );
}
