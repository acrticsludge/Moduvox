"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function ViewError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("View error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="mx-auto max-w-sm text-center">
        <h2 className="text-xl font-semibold text-[#18181B]">
          Unable to load presentation
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#71717A]">
          This presentation could not be loaded. The link may be invalid or the presentation has been removed.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="min-h-[48px] min-w-[48px] rounded-lg bg-[#18181B] px-5 py-2.5 text-sm font-medium text-white"
          >
            Try again
          </button>
          <Link
            href="/"
            className="min-h-[48px] min-w-[48px] rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-[#18181B]"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
