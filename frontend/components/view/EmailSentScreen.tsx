"use client"

import { useState, useRef, useEffect } from "react"
import { MailCheck, Loader2, AlertCircle } from "lucide-react"

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void
      execute: (siteKey: string, opts: { action: string }) => Promise<string>
    }
  }
}

export function EmailSentScreen({
  email,
  viewerName,
  shareToken,
}: {
  email: string
  viewerName: string
  shareToken: string
}) {
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState("")
  const recaptchaLoaded = useRef(false)

  // Load reCAPTCHA script on mount (once)
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) return
    if (recaptchaLoaded.current) return
    if (document.querySelector('script[src*="recaptcha/api.js"]')) return
    recaptchaLoaded.current = true

    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
    const script = document.createElement("script")
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  }, [])

  async function handleResend() {
    setResending(true)
    setError("")

    // Get reCAPTCHA v3 token
    let recaptchaToken = ""
    if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && window.grecaptcha) {
      try {
        recaptchaToken = await new Promise<string>((resolve, reject) => {
          window.grecaptcha!.ready(async () => {
            try {
              const token = await window.grecaptcha!.execute(
                process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!,
                { action: "submit" },
              )
              resolve(token)
            } catch (e) {
              reject(e)
            }
          })
        })
      } catch {
        setError("Security verification failed. Please try again.")
        setResending(false)
        return
      }
    }

    try {
      const res = await fetch(`/api/view/${shareToken}/gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          viewer_name: viewerName,
          viewer_email: email,
          consent_granted: true,
          recaptcha_token: recaptchaToken,
        }),
      })
      const json = await res.json()

      if (json.data?.already_verified) {
        // Email gate was disabled or viewer already verified — redirect to player
        if (json.data?.session_token) {
          window.location.href = `/view/${shareToken}?session=${json.data.session_token}`
        } else {
          window.location.href = `/view/${shareToken}`
        }
        return
      }

      if (res.ok && json.data?.email_sent === true) {
        setResent(true)
        setTimeout(() => setResent(false), 5000)
      } else {
        setError(json.data?.message || json.error || "Failed to resend. Try again.")
      }
    } catch {
      setError("Network error.")
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <MailCheck className="h-6 w-6 text-green-600" />
        </div>
        <h1 className="mb-2 text-lg font-semibold text-[#18181B]">
          Check your inbox
        </h1>
        <p className="mb-2 text-sm text-zinc-500">
          We've sent a verification link to:
        </p>
        <p className="mb-6 text-sm font-medium text-[#18181B]">{email}</p>

        <div className="space-y-3">
          <p className="text-xs text-zinc-400">
            Click the link in the email to verify your identity and start watching.
            The link expires in 15 minutes.
          </p>

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition-colors hover:text-[#18181B] disabled:opacity-50"
            >
              {resending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Sending…
                </>
              ) : resent ? (
                "Sent!"
              ) : (
                "Didn't receive it? Resend"
              )}
            </button>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <p className="text-xs text-zinc-400">
              Check your spam folder if you don't see it.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
