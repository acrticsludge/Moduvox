export function ViewFooter() {
  return (
    <footer className="bg-[#18181B]">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm text-white">
            2026 Moduvox. All rights reserved.
          </p>
          <p className="text-sm text-[#71717A]">
            Powered by Gemini AI and VoxCPM
          </p>
          <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
            MVP v1.0.0
          </span>
        </div>
      </div>
    </footer>
  )
}
