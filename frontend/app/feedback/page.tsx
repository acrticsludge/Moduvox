"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, ArrowLeft, ChevronRight } from "lucide-react"
import { Navbar } from "@/components/ui/Navbar"
import { Footer } from "@/components/landing/footer"
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/validations/feedback"

// ── Types ──────────────────────────────────────────────────

type PageState =
  | { type: "form" }
  | { type: "submitting" }
  | { type: "success" }
  | { type: "rate_limited"; remainingMs: number }

const STEPS = ["welcome", "identity", "contact", "category", "rating", "message", "submit"] as const
type Step = (typeof STEPS)[number]

const STEP_ORDER: Step[] = ["welcome", "identity", "contact", "category", "rating", "message", "submit"]

// ── Helpers ────────────────────────────────────────────────

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// ── Step Components ────────────────────────────────────────

type StepProps = {
  onNext: () => void
  onBack?: () => void
  /* eslint-disable @typescript-eslint/no-explicit-any */
  data: any
  setData: (fn: (prev: any) => any) => void
  submitting: boolean
}

function StepWelcome({ onNext }: StepProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-700 shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-[#18181B]">We&apos;d love your feedback</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#71717A] max-w-xs">
        Your input shapes what we build next. Tell us what&apos;s working, what&apos;s not, and what you&apos;d love to see.
      </p>
      <p className="mt-1 text-xs text-zinc-400">Takes about 2 minutes</p>
      <button
        type="button"
        onClick={onNext}
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#18181B] px-6 py-3 text-sm font-medium text-white transition-all hover:bg-[#27272A] active:scale-[0.97]"
      >
        Share your thoughts
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function StepIdentity({ data, setData, onNext }: StepProps) {
  const anonymous = data.anonymous

  const handleToggle = (checked: boolean) => {
    setData((prev: Record<string, unknown>) => ({
      ...prev,
      anonymous: checked,
      name: checked ? "Anonymous" : "",
      email: checked ? "" : prev.email,
      can_contact: checked ? false : prev.can_contact,
    }))
  }

  return (
    <div className="flex flex-col">
      <p className="text-sm font-medium text-[#71717A] mb-6">How should we know you?</p>

      {/* Name */}
      <label className="mb-1.5 text-sm font-medium text-[#18181B]">
        Your name <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        value={data.name}
        onChange={(e) => setData((prev: Record<string, unknown>) => ({ ...prev, name: e.target.value }))}
        placeholder={anonymous ? "Anonymous" : "Your name"}
        disabled={anonymous}
        className={`mb-5 w-full rounded-xl border px-4 py-3 text-sm text-[#18181B] placeholder:text-zinc-400 transition-colors focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 ${data.fieldErrors?.name ? "border-red-300" : "border-zinc-200"}`}
        autoFocus
      />
      {data.fieldErrors?.name && (
        <p className="-mt-4 mb-5 text-xs text-red-500">{data.fieldErrors.name}</p>
      )}

      {/* Email (only when not anonymous) */}
      {!anonymous && (
        <>
          <label className="mb-1.5 text-sm font-medium text-[#18181B]">
            Email <span className="text-zinc-400">(optional)</span>
          </label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => setData((prev: Record<string, unknown>) => ({ ...prev, email: e.target.value }))}
            placeholder="your@email.com"
            className={`mb-5 w-full rounded-xl border px-4 py-3 text-sm text-[#18181B] placeholder:text-zinc-400 transition-colors focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 ${data.fieldErrors?.email ? "border-red-300" : "border-zinc-200"}`}
          />
          {data.fieldErrors?.email && (
            <p className="-mt-4 mb-5 text-xs text-red-500">{data.fieldErrors.email}</p>
          )}
        </>
      )}

      {/* Anonymous toggle */}
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 transition-colors hover:bg-zinc-50">
        <input
          type="checkbox"
          checked={anonymous}
          onChange={(e) => handleToggle(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 text-[#18181B] focus:ring-zinc-500"
        />
        <span className="text-sm text-zinc-600">Submit anonymously</span>
      </label>

      <button
        type="button"
        onClick={onNext}
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-[#18181B] px-6 py-3 text-sm font-medium text-white transition-all hover:bg-[#27272A] active:scale-[0.97]"
      >
        Continue
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function StepContact({ data, setData, onNext, onBack }: StepProps) {
  return (
    <div className="flex flex-col">
      <p className="text-sm font-medium text-[#71717A] mb-6">Can we reach out if we have questions?</p>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            setData((prev: Record<string, unknown>) => ({ ...prev, can_contact: true }))
            onNext()
          }}
          className="flex items-center gap-4 rounded-xl border border-zinc-200 px-5 py-4 text-left transition-all hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.99]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-[#18181B]">Sure, happy to chat</p>
            <p className="text-xs text-zinc-400">I&apos;m okay with being contacted</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setData((prev: Record<string, unknown>) => ({ ...prev, can_contact: false }))
            onNext()
          }}
          className="flex items-center gap-4 rounded-xl border border-zinc-200 px-5 py-4 text-left transition-all hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.99]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-[#18181B]">No thanks</p>
            <p className="text-xs text-zinc-400">Just taking the feedback</p>
          </div>
        </button>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-6 inline-flex items-center justify-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>
    </div>
  )
}

function StepCategory({ data, setData, onNext, onBack }: StepProps) {
  return (
    <div className="flex flex-col">
      <p className="text-sm font-medium text-[#71717A] mb-6">What best describes your feedback?</p>

      <div className="flex flex-col gap-2.5">
        {CATEGORIES.map((cat) => {
          const icons: Record<string, string> = {
            bug_report: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z",
            feature_request: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
            general: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
          }
          const colors: Record<string, string> = {
            bug_report: "bg-red-50 text-red-500 border-red-100 hover:border-red-200",
            feature_request: "bg-blue-50 text-blue-500 border-blue-100 hover:border-blue-200",
            general: "bg-zinc-50 text-zinc-500 border-zinc-100 hover:border-zinc-200",
          }
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setData((prev: Record<string, unknown>) => ({ ...prev, category: cat }))
                onNext()
              }}
              className={`flex items-center gap-4 rounded-xl border px-5 py-4 text-left transition-all active:scale-[0.99] ${colors[cat]}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d={icons[cat]} />
              </svg>
              <span className="text-sm font-medium text-[#18181B]">{CATEGORY_LABELS[cat]}</span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-6 inline-flex items-center justify-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>
    </div>
  )
}

function StepRating({ data, setData, onNext, onBack }: StepProps) {
  const [hoverRating, setHoverRating] = useState(0)

  const labels = ["", "Needs work", "Okay", "Good", "Great", "Excellent!"]

  return (
    <div className="flex flex-col">
      <p className="text-sm font-medium text-[#71717A] mb-6">How would you rate your experience?</p>

      <div className="flex items-center justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setData((prev: Record<string, unknown>) => ({ ...prev, rating: star }))}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="rounded-lg p-1 transition-all active:scale-90"
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill={star <= (hoverRating || data.rating) ? "#f59e0b" : "none"}
              stroke={star <= (hoverRating || data.rating) ? "#f59e0b" : "#d4d4d8"}
              strokeWidth="1.5"
              className="transition-colors"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
      </div>

      <p className="mt-3 text-center text-sm text-zinc-500 min-h-[20px]">
        {data.rating > 0 ? labels[data.rating] : "\u00a0"}
      </p>
      {data.fieldErrors?.rating && (
        <p className="mt-1 text-center text-xs text-red-500">{data.fieldErrors.rating}</p>
      )}

      <button
        type="button"
        disabled={!data.rating}
        onClick={() => data.rating && onNext()}
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-[#18181B] px-6 py-3 text-sm font-medium text-white transition-all hover:bg-[#27272A] disabled:opacity-40 active:scale-[0.97]"
      >
        Continue
        <ChevronRight className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={onBack}
        className="mt-4 inline-flex items-center justify-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>
    </div>
  )
}

function StepMessage({ data, setData, onNext, onBack, submitting, onDone }: StepProps & { onDone: () => void }) {
  const charCount = data.message?.length || 0

  return (
    <div className="flex flex-col">
      <p className="text-sm font-medium text-[#71717A] mb-6">Anything else you&apos;d like to share?</p>

      <textarea
        value={data.message || ""}
        onChange={(e) => setData((prev: Record<string, unknown>) => ({ ...prev, message: e.target.value }))}
        placeholder="Tell us what's on your mind..."
        rows={5}
        maxLength={5000}
        disabled={submitting}
        className={`w-full resize-none rounded-xl border px-4 py-3 text-sm text-[#18181B] placeholder:text-zinc-400 transition-colors focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-50 ${data.fieldErrors?.message ? "border-red-300" : "border-zinc-200"}`}
        autoFocus
      />
      <div className="mt-1.5 flex items-center justify-between">
        {data.fieldErrors?.message ? (
          <p className="text-xs text-red-500">{data.fieldErrors.message}</p>
        ) : <span />}
        <p className={`ml-auto text-xs ${charCount > 4500 ? "text-amber-500" : "text-zinc-400"}`}>
          {charCount} / 5000
        </p>
      </div>

      <button
        type="button"
        disabled={submitting || !data.message?.trim()}
        onClick={onDone}
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-[#18181B] px-6 py-3 text-sm font-medium text-white transition-all hover:bg-[#27272A] disabled:opacity-40 active:scale-[0.97]"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          "Send feedback"
        )}
      </button>

      <button
        type="button"
        onClick={onBack}
        disabled={submitting}
        className="mt-4 inline-flex items-center justify-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-600 disabled:opacity-40"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>
    </div>
  )
}

function StepSuccess({ remainingMs: initialMs, onReset }: { remainingMs: number; onReset: () => void }) {
  const [remainingMs, setRemainingMs] = useState(initialMs)

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs((prev) => {
        const next = prev - 1000
        if (next <= 0) {
          onReset()
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [onReset])

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-green-500 shadow-lg shadow-green-200">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-[#18181B]">Thank you!</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#71717A] max-w-xs">
        We review every submission and use it to make Moduvox better.
      </p>
      <div className="mt-6 rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-3">
        <p className="text-xs text-zinc-400">Next submission available in</p>
        <p className="mt-0.5 font-mono text-lg font-semibold text-[#18181B]">
          {remainingMs > 0 ? formatTime(remainingMs) : "0s"}
        </p>
      </div>
      <p className="mt-4 text-xs text-zinc-400">
        If you think of more, we&apos;d love to hear it.
      </p>
    </div>
  )
}

function StepRateLimited({ remainingMs }: { remainingMs: number }) {
  const [displayMs, setDisplayMs] = useState(remainingMs)

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayMs((prev) => Math.max(0, prev - 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg shadow-amber-200">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-[#18181B]">Already submitted</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#71717A]">
        You can make another submission in
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold text-[#18181B]">
        {displayMs > 0 ? formatTime(displayMs) : "0s"}
      </p>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────

export default function FeedbackPage() {
  const [pageState, setPageState] = useState<PageState>({ type: "form" })
  const [stepIdx, setStepIdx] = useState(0)
  const [direction, setDirection] = useState<"forward" | "back">("forward")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    anonymous: false,
    can_contact: false,
    category: "",
    rating: 0,
    message: "",
    fieldErrors: {} as Record<string, string>,
  })

  const currentStep = STEP_ORDER[stepIdx]

  const isStepVisible = useCallback((step: Step) => {
    if (step === "contact") return !formData.anonymous && !!formData.email
    return true
  }, [formData.anonymous, formData.email])

  const visibleSteps = STEP_ORDER.filter(isStepVisible)
  const currentVisibleIdx = visibleSteps.indexOf(currentStep)

  const progressPct = visibleSteps.length > 1
    ? Math.round((currentVisibleIdx / (visibleSteps.length - 1)) * 100)
    : 0

  const goNext = useCallback(() => {
    const nextIdx = visibleSteps.indexOf(currentStep)
    if (nextIdx < visibleSteps.length - 1) {
      const nextStep = visibleSteps[nextIdx + 1]
      const newIdx = STEP_ORDER.indexOf(nextStep)
      setDirection("forward")
      setStepIdx(newIdx)
    }
  }, [visibleSteps, currentStep])

  const goBack = useCallback(() => {
    const prevIdx = visibleSteps.indexOf(currentStep)
    if (prevIdx > 0) {
      const prevStep = visibleSteps[prevIdx - 1]
      const newIdx = STEP_ORDER.indexOf(prevStep)
      setDirection("back")
      setStepIdx(newIdx)
    }
  }, [visibleSteps, currentStep])

  const handleSubmit = useCallback(async () => {
    setPageState({ type: "submitting" })

    // Client-side validation
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = "Name is required"
    if (!formData.anonymous && !formData.email.trim()) errors.email = "Email is required"
    if (!formData.category) errors.category = "Please select a category"
    if (formData.rating === 0) errors.rating = "Please select a rating"
    if (!formData.message.trim()) errors.message = "Message is required"

    if (Object.keys(errors).length > 0) {
      setFormData((prev) => ({ ...prev, fieldErrors: errors }))
      setPageState({ type: "form" })
      return
    }

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.anonymous ? "Anonymous" : formData.name.trim(),
          email: formData.anonymous ? "" : formData.email.trim(),
          category: formData.category,
          rating: formData.rating,
          message: formData.message.trim(),
          can_contact: formData.can_contact,
        }),
      })

      let json: Record<string, unknown>
      try {
        json = await res.json()
      } catch {
        setPageState({ type: "form" })
        return
      }

      if (res.status === 429) {
        setPageState({ type: "rate_limited", remainingMs: (json.remainingMs as number) ?? 12 * 60 * 60 * 1000 })
        return
      }

      if (!res.ok) {
        if (json.details) {
          const fieldErrors: Record<string, string> = {}
          for (const [field, msgs] of Object.entries(json.details)) {
            fieldErrors[field] = (msgs as string[])[0]
          }
          setFormData((prev) => ({ ...prev, fieldErrors }))
        }
        setPageState({ type: "form" })
        return
      }

      setPageState({ type: "success" })
    } catch {
      setPageState({ type: "form" })
    }
  }, [formData])

  function renderStep() {
    const stepProps = {
      data: formData,
      setData: setFormData as StepProps["setData"],
      submitting: pageState.type === "submitting",
      onNext: goNext,
      onBack: stepIdx > 0 ? goBack : undefined,
    }

    switch (currentStep) {
      case "welcome":
        return <StepWelcome key="welcome" {...stepProps} />
      case "identity":
        return <StepIdentity key="identity" {...stepProps} />
      case "contact":
        return <StepContact key="contact" {...stepProps} />
      case "category":
        return <StepCategory key="category" {...stepProps} />
      case "rating":
        return <StepRating key="rating" {...stepProps} />
      case "message":
        return <StepMessage key="message" {...stepProps} onDone={handleSubmit} />
      default:
        return null
    }
  }

  // Rate limited state
  if (pageState.type === "rate_limited") {
    return (
      <main className="min-h-screen bg-[#F9FAFB] flex flex-col">
        <Navbar />
        <div className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-4">
          <StepRateLimited remainingMs={pageState.remainingMs} />
        </div>
        <Footer />
      </main>
    )
  }

  // Success state
  if (pageState.type === "success") {
    return (
      <main className="min-h-screen bg-[#F9FAFB] flex flex-col">
        <Navbar />
        <div className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-4">
          <StepSuccess remainingMs={12 * 60 * 60 * 1000} onReset={() => setPageState({ type: "form" })} />
        </div>
        <Footer />
      </main>
    )
  }

  // Form state
  return (
    <main className="min-h-screen bg-[#F9FAFB] flex flex-col">
      <Navbar />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-28 pb-24 sm:pt-32">
        {/* Progress bar */}
        <div className="mb-10 h-1 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-[#18181B] transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Step content */}
        <div
          key={stepIdx}
          className={
            direction === "forward"
              ? "animate-in fade-in slide-in-from-right-4 duration-300"
              : "animate-in fade-in slide-in-from-left-4 duration-300"
          }
        >
          {renderStep()}
        </div>
      </div>
      <Footer />
    </main>
  )
}
