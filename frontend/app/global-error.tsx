"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
        <div className="mx-auto max-w-sm text-center">
          <h2 className="text-xl font-semibold text-[#18181B]">
            Critical error
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#71717A]">
            The application encountered a critical error. Please refresh the page.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 min-h-[48px] min-w-[48px] rounded-lg bg-[#18181B] px-5 py-2.5 text-sm font-medium text-white"
          >
            Refresh page
          </button>
        </div>
      </body>
    </html>
  )
}
