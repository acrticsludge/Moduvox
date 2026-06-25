"use client"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB]">
      <div className="mx-auto max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <span className="text-xl">!</span>
        </div>
        <h2 className="text-xl font-semibold text-[#18181B]">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#71717A]">
          An unexpected error occurred. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-[#18181B]/70 bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-all hover:border-[#18181B] hover:bg-[#27272A]"
        >
          Try again
        </button>
        <div className="mt-4">
          <a
            href="/dashboard"
            className="text-sm font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
          >
            Go to dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
