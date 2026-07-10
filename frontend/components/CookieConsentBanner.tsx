"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

const COOKIE_CONSENT_KEY = "moduvox_cookie_consent"

export function CookieConsentBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!stored) setShow(true)
  }, [])

  function accept() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted")
    // Record acceptance server-side for logged-in users
    fetch("/api/auth/accept-cookies", { method: "POST" }).catch(() => {})
    setShow(false)
  }

  function decline() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined")
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white p-4 shadow-lg">
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-zinc-600">
          <p>
            We use essential cookies for authentication and optional cookies for analytics
            and feedback cooldowns.{" "}
            <Link href="/privacy" className="font-medium text-zinc-800 underline underline-offset-2 hover:text-zinc-900">
              Learn more
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={decline}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={accept}
            className="rounded-lg bg-[#18181B] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#27272A]"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
