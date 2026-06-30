"use client"

import { useState, useEffect, useRef } from "react"
import { Mail, Lock, Loader2, AlertCircle, Info } from "lucide-react"

export function CombinedGateDialog({
  shareToken,
  title,
  hasPassword,
  emailGateEnabled,
  onSuccess,
}: {
  shareToken: string
  title?: string
  hasPassword: boolean
  emailGateEnabled: boolean
  onSuccess: (data: { viewer_id: string; viewer_name: string; email: string }) => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const turnstileRef = useRef<HTMLDivElement>(null)
  const turnstileRendered = useRef(false)

  // Load Turnstile widget (runs once — ref guards against StrictMode double-mount)
  useEffect(() => {
    if (!turnstileRef.current || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return
    if (turnstileRendered.current) return
    turnstileRendered.current = true

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    const w = window as { turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => void } }

    function renderWidget() {
      if (!turnstileRef.current || turnstileRef.current.hasChildNodes()) return
      w.turnstile?.render(turnstileRef.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          turnstileRef.current?.setAttribute("data-token", token)
        },
      })
    }

    if (w.turnstile) {
      renderWidget()
    } else {
      if (!document.querySelector('script[src*="turnstile/v0/api.js"]')) {
        const script = document.createElement("script")
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
        script.async = true
        script.defer = true
        script.onload = renderWidget
        document.head.appendChild(script)
      }
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!consent) {
      setError("You must confirm you are watching for yourself.")
      return
    }

    setLoading(true)

    try {
      const body: Record<string, unknown> = {
        viewer_name: name,
        viewer_email: email,
        consent_granted: true,
      }

      if (hasPassword) {
        body.password = password
      }

      // Get Turnstile token from widget
      const turnstileToken = turnstileRef.current?.getAttribute("data-token") || ""
      body.cf_turnstile_response = turnstileToken

      const res = await fetch(`/api/view/${shareToken}/gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || "Something went wrong")
        return
      }

      // Check if email was actually sent (gate returns 200 even on email failure)
      if (json.data?.email_sent === false) {
        setError(json.data?.message || "We couldn't send the verification email. Please try again.")
        setLoading(false)
        return
      }

      onSuccess({ viewer_id: json.data.viewer_id, viewer_name: json.data.viewer_name || name, email })
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
          {hasPassword ? (
            <Lock className="h-5 w-5 text-zinc-600" />
          ) : (
            <Mail className="h-5 w-5 text-zinc-600" />
          )}
        </div>
        <h1 className="mb-2 text-center text-lg font-semibold text-[#18181B]">
          {title || "Presentation"}
        </h1>
        <p className="mb-6 text-center text-sm text-zinc-500">
          Enter your details to watch this presentation.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {hasPassword && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter presentation password"
                autoFocus={hasPassword}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              autoFocus={!hasPassword}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your work email"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          <label className="flex items-start gap-3 rounded-lg bg-zinc-50 px-3 py-2.5">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-[#18181B] focus:ring-zinc-500"
            />
            <span className="text-sm leading-relaxed text-zinc-600">
              I confirm I am watching this myself and not on behalf of another person.
            </span>
          </label>

          <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
            <p className="text-xs leading-relaxed text-blue-700">
              We'll send a verification link to your email to confirm your identity.
            </p>
          </div>

          {/* Cloudflare Turnstile - bot protection (only in browser with configured key) */}
          {typeof window !== "undefined" && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
            <div ref={turnstileRef} />
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !name || !email || !consent || (hasPassword && !password)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#18181B] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#27272A] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending verification…
              </>
            ) : (
              "Send Verification Link"
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
