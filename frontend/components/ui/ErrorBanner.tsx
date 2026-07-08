"use client"

import { AlertCircle } from "lucide-react"

interface ErrorBannerProps {
  message: string | null
  className?: string
}

export function ErrorBanner({ message, className = "" }: ErrorBannerProps) {
  if (!message) return <div className={`min-h-[48px] ${className}`} aria-live="polite" />

  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg bg-red-50 px-4 py-3 text-sm ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" aria-hidden="true" />
      <p className="text-red-600">{message}</p>
    </div>
  )
}

interface FieldErrorProps {
  message: string | undefined | null
}

export function FieldError({ message }: FieldErrorProps) {
  if (!message) return <div className="min-h-[20px]" aria-live="polite" />

  return (
    <p className="mt-1 text-xs text-red-500" role="alert">
      {message}
    </p>
  )
}
