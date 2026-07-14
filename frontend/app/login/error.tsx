"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Login page error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
      <div className="mx-auto max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <span className="text-xl font-bold text-red-600">!</span>
        </div>
        <h2 className="text-xl font-semibold text-[#18181B]">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#71717A]">
          The login page failed to load. Please try again.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="min-h-[48px] min-w-[48px] rounded-lg bg-[#18181B] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#27272A]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="min-h-[48px] min-w-[48px] rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-[#18181B] transition hover:bg-zinc-50"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
