"use client"

import { useState } from "react"
import { Calendar, Clock, Layers, Link, ExternalLink, Check, Sparkles } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

type ViewSidebarProps = {
  title: string
  createdAt?: string
  slideCount: number
  expiresAt: string | null
  totalDurationMs?: number
  viewerFirstViewed?: string
  isOpen?: boolean
  onClose?: () => void
  currentSlide?: number
  onSlideClick?: (slideNumber: number) => void
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-zinc-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-zinc-500">{label}</p>
        <p className="truncate text-sm text-zinc-800">{value}</p>
      </div>
    </div>
  )
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export function ViewSidebar({ title, createdAt, slideCount, expiresAt, viewerFirstViewed, totalDurationMs, isOpen, onClose, currentSlide, onSlideClick }: ViewSidebarProps) {
  const [copied, setCopied] = useState(false)

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const sidebarContent = (
    <>
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
        {/* Presentation Info */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Presentation</h4>
          <InfoRow
            icon={<Calendar className="h-4 w-4" />}
            label="Created"
            value={createdAt ? new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
          />
          <InfoRow icon={<Clock className="h-4 w-4" />} label="Duration" value={totalDurationMs !== undefined ? formatDuration(totalDurationMs) : "—"} />
        </div>

        {/* Slide list — clickable */}
        {slideCount > 0 && (
          <>
            <hr className="my-3 border-zinc-100" />
            <div className="space-y-1">
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Slides</h4>
              <div className="max-h-[200px] space-y-0.5 overflow-y-auto">
                {Array.from({ length: slideCount }, (_, i) => i + 1).map((sn) => (
                  <button
                    key={sn}
                    type="button"
                    onClick={() => onSlideClick?.(sn)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 ${
                      (currentSlide ?? 0) + 1 === sn
                        ? "bg-zinc-100 font-medium text-[#18181B]"
                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
                    }`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-medium text-zinc-500">
                      {sn}
                    </span>
                    <span>Slide {sn}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <hr className="my-3 border-zinc-100" />

        {/* Link Info */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Link</h4>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex w-full items-center gap-2.5 rounded-md px-0 py-1 text-sm text-zinc-600 transition-colors hover:text-[#18181B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Link className="h-4 w-4 text-zinc-400" />}
            <span>{copied ? "Copied!" : "Copy Link"}</span>
          </button>
          <InfoRow
            icon={<Clock className="h-4 w-4" />}
            label="Expires"
            value={expiresAt ? new Date(expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never"}
          />
        </div>

        <hr className="my-3 border-zinc-100" />

        {/* Session Info */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Session</h4>
          <InfoRow icon={<Check className="h-4 w-4 text-green-500" />} label="Progress" value="Saved across sessions" />
          {viewerFirstViewed && (
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label="First viewed"
              value={new Date(viewerFirstViewed).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            />
          )}
        </div>

        <hr className="my-3 border-zinc-100" />

        {/* CTA */}
        <a
          href="/"
          className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
        >
          <Sparkles className="h-4 w-4 text-zinc-400" />
          Made with Moduvox
          <ExternalLink className="ml-auto h-3.5 w-3.5 text-zinc-400" />
        </a>
      </div>

      {/* Legal links at bottom */}
      <div className="border-t border-zinc-100 px-4 py-3">
        <div className="flex items-center justify-center gap-3 text-[11px] text-zinc-400">
          <a href="/security" className="transition-colors hover:text-zinc-600">Security</a>
          <span className="text-zinc-300">·</span>
          <a href="/privacy" className="transition-colors hover:text-zinc-600">Privacy</a>
          <span className="text-zinc-300">·</span>
          <a href="/terms" className="transition-colors hover:text-zinc-600">Terms</a>
        </div>
      </div>
    </>
  )

  return (
    <TooltipProvider delayDuration={300}>
      {/* Desktop sidebar — always visible */}
      <aside className="hidden w-64 flex-col border-r border-zinc-200 bg-white md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile drawer — overlay + slide-in panel */}
      {onClose && (
        <>
          {isOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={onClose}
            />
          )}
          <aside
            className={`fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-zinc-200 bg-white shadow-xl transition-transform duration-300 md:hidden ${
              isOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <span className="text-sm font-medium text-zinc-500">Info</span>
              <button
                type="button"
                onClick={onClose}
                className="touch-target-sm rounded-lg text-zinc-400 hover:text-zinc-600"
                aria-label="Close sidebar"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sidebarContent}
            </div>
          </aside>
        </>
      )}
    </TooltipProvider>
  )
}
