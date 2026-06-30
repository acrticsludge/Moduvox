"use client"

import { useState } from "react"
import { Loader2, CheckCircle2 } from "lucide-react"
import type { QuotaResult } from "@/lib/quota"
import type { WaitlistInterest } from "@/lib/validations/waitlist"

const LIMIT_MESSAGES: Record<string, { title: string; description: string }> = {
  presentations_lifetime: {
    title: "Presentation limit reached",
    description:
      "You've used all your free presentations. Upgrade to Pro to create unlimited presentations.",
  },
  presentations_daily: {
    title: "Daily limit reached",
    description:
      "You've hit your daily limit of 3 presentations. Try again tomorrow or upgrade to Pro.",
  },
  voice_clones: {
    title: "Voice clone limit reached",
    description:
      "You've reached the limit of 1 voice clone. Upgrade to Pro to clone more voices.",
  },
}

const INTEREST_OPTIONS: { value: WaitlistInterest; label: string; description: string }[] = [
  { value: "pro", label: "Pro", description: "$20/mo — for regular content creators" },
  { value: "team", label: "Team", description: "$50/mo — for teams creating together" },
  { value: "both", label: "Both", description: "Interested in both plans" },
]

export function WaitlistDialog({
  quota,
  onClose,
}: {
  quota: QuotaResult
  onClose: () => void
}) {
  const [interest, setInterest] = useState<WaitlistInterest | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [validationError, setValidationError] = useState("")

  const limitInfo = quota.limitKey ? LIMIT_MESSAGES[quota.limitKey] : null

  async function handleSubmit() {
    if (!interest) {
      setValidationError("Please select at least one plan")
      return
    }

    setSubmitting(true)
    setError("")
    setValidationError("")

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interest }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Something went wrong")
      setSubmitted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-xl">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
          <h2 className="mt-3 text-base font-semibold text-[#18181B]">
            You&apos;re on the list!
          </h2>
          <p className="mt-2 text-sm text-[#71717A]">
            We&apos;ll notify you when Pro launches. Thanks for your interest!
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-[#71717A] hover:text-[#18181B]"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/40">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto hide-scrollbar">
        {/* Header */}
        <div className="mb-5">
          <h2 className="text-base font-semibold text-[#18181B]">
            {limitInfo?.title ?? "Limit reached"}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[#71717A]">
            {limitInfo?.description ?? quota.message}
          </p>
        </div>

        {/* Plan selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#18181B]">
            Which plan interests you?
          </label>
          {INTEREST_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setInterest(opt.value)
                setValidationError("")
              }}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                interest === opt.value
                  ? "border-[#18181B] bg-zinc-50"
                  : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  interest === opt.value ? "border-[#18181B]" : "border-zinc-300"
                }`}
              >
                {interest === opt.value && (
                  <div className="h-2.5 w-2.5 rounded-full bg-[#18181B]" />
                )}
              </div>
              <div>
                <span className="text-sm font-medium text-[#18181B]">{opt.label}</span>
                <p className="text-xs text-[#71717A]">{opt.description}</p>
              </div>
            </button>
          ))}
          {validationError && <p className="text-xs text-red-600">{validationError}</p>}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-[#71717A] hover:text-[#18181B]"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#18181B]/70 bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-all hover:border-[#18181B] hover:bg-[#27272A] disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Notify me when available
          </button>
        </div>
      </div>
    </div>
  )
}
