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
      <body className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">Something went wrong</h1>
          <p className="mt-2 text-sm text-zinc-500">
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={() => reset()}
            className="mt-6 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
