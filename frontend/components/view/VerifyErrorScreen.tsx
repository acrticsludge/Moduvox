"use client"

import { AlertTriangle } from "lucide-react"

export function VerifyErrorScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
        <h1 className="mb-2 text-lg font-semibold text-[#18181B]">
          Link expired or invalid
        </h1>
        <p className="text-sm text-zinc-500">
          This verification link has expired or is no longer valid.
        </p>
        <p className="mt-4 text-sm text-zinc-500">
          Please contact the presentation owner to extend the link expiry or share a new one.
        </p>
      </div>
    </div>
  )
}
