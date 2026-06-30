"use client"

import { useState } from "react"
import { Loader2, CheckCircle, AlertCircle, Star } from "lucide-react"
import { Navbar } from "@/components/ui/Navbar"
import { Footer } from "@/components/landing/footer"
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/validations/feedback"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type PageState =
  | { type: "form" }
  | { type: "submitting" }
  | { type: "success" }
  | { type: "rate_limited" }

export default function FeedbackPage() {
  const [state, setState] = useState<PageState>({ type: "form" })
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [category, setCategory] = useState("")
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [message, setMessage] = useState("")
  const [anonymous, setAnonymous] = useState(false)
  const [canContact, setCanContact] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const charCount = message.length

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setFieldErrors({})

    // Client-side validation
    const errors: Record<string, string> = {}
    if (!name.trim()) errors.name = "Name is required"
    if (!anonymous && !email.trim()) errors.email = "Email is required"
    if (!category) errors.category = "Please select a category"
    if (rating === 0) errors.rating = "Please select a rating"
    if (!message.trim()) errors.message = "Message is required"

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setState({ type: "submitting" })

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: anonymous ? "Anonymous" : name.trim(),
          email: anonymous ? "" : email.trim(),
          category,
          rating,
          message: message.trim(),
          can_contact: canContact,
        }),
      })

      const json = await res.json()

      if (res.status === 429) {
        setState({ type: "rate_limited" })
        return
      }

      if (!res.ok) {
        if (json.details) {
          const fieldErrors: Record<string, string> = {}
          for (const [field, msgs] of Object.entries(json.details)) {
            fieldErrors[field] = (msgs as string[])[0]
          }
          setFieldErrors(fieldErrors)
        }
        setError(json.error || "Something went wrong")
        setState({ type: "form" })
        return
      }

      setState({ type: "success" })
    } catch {
      setError("Network error. Please try again.")
      setState({ type: "form" })
    }
  }

  function handleReset() {
    setName("")
    setEmail("")
    setCategory("")
    setRating(0)
    setMessage("")
    setAnonymous(false)
    setCanContact(false)
    setError("")
    setFieldErrors({})
    setState({ type: "form" })
  }

  return (
    <main className="bg-[#F9FAFB] min-h-screen flex flex-col">
      <Navbar />
      <div className="mx-auto w-full max-w-lg px-4 pt-32 pb-24 sm:px-6 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[#18181B]">
          Send Feedback
        </h1>
        <p className="mt-1.5 text-sm text-[#71717A]">
          Help us improve Moduvox. What's on your mind?
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          Limit: 1 submission per 12 hours
        </p>

        {state.type === "success" && (
          <div className="mt-8 space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-[#18181B]">Thanks for your feedback!</h2>
            <p className="text-sm text-[#71717A]">
              We review every submission and use it to improve Moduvox.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-[#18181B] transition-colors hover:bg-zinc-50"
            >
              Submit another
            </button>
          </div>
        )}

        {state.type === "rate_limited" && (
          <div className="mt-8 space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <AlertCircle className="h-7 w-7 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-[#18181B]">Already submitted</h2>
            <p className="text-sm text-[#71717A]">
              You've already submitted feedback recently. You can submit again later.
            </p>
          </div>
        )}

        {(state.type === "form" || state.type === "submitting") && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                disabled={state.type === "submitting"}
                autoFocus
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>}
            </div>

            {/* Email */}
            {!anonymous && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={state.type === "submitting"}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
                />
                {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
              </div>
            )}

            {/* Category */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
                Category <span className="text-red-500">*</span>
              </label>
              <Select
                value={category}
                onValueChange={setCategory}
                disabled={state.type === "submitting"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.category && <p className="mt-1 text-xs text-red-500">{fieldErrors.category}</p>}
            </div>

            {/* Anonymous toggle */}
            <label className="flex items-start gap-3 rounded-lg bg-zinc-50 px-3 py-2.5">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => {
                  setAnonymous(e.target.checked)
                  if (e.target.checked) setCanContact(false)
                }}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-[#18181B] focus:ring-zinc-500"
              />
              <span className="text-sm leading-relaxed text-zinc-600">
                Submit anonymously
              </span>
            </label>

            {/* Contact consent */}
            {!anonymous && (
              <label className="flex items-start gap-3 rounded-lg bg-zinc-50 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={canContact}
                  onChange={(e) => setCanContact(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-[#18181B] focus:ring-zinc-500"
                />
                <span className="text-sm leading-relaxed text-zinc-600">
                  I'm okay with being contacted about my feedback
                </span>
              </label>
            )}

            {/* Rating */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
                Rating <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    disabled={state.type === "submitting"}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-0.5 transition-colors disabled:opacity-50"
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={`h-7 w-7 ${
                        star <= (hoverRating || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "fill-none text-zinc-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              {fieldErrors.rating && <p className="mt-1 text-xs text-red-500">{fieldErrors.rating}</p>}
            </div>

            {/* Message */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#18181B]">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what you think..."
                rows={5}
                maxLength={5000}
                disabled={state.type === "submitting"}
                className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
              />
              <div className="mt-1 flex items-center justify-between">
                {fieldErrors.message && <p className="text-xs text-red-500">{fieldErrors.message}</p>}
                <p className={`ml-auto text-xs ${charCount > 4500 ? "text-amber-500" : "text-zinc-400"}`}>
                  {charCount} / 5000
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={state.type === "submitting"}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#18181B] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#27272A] disabled:opacity-50"
            >
              {state.type === "submitting" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Submit Feedback"
              )}
            </button>
          </form>
        )}
      </div>
      <Footer />
    </main>
  )
}
