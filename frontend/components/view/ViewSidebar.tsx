"use client"

import { useState } from "react"
import { Calendar, Clock, Layers, Link, ExternalLink, Check, Sparkles } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

type ViewSidebarProps = {
  title: string
  createdAt: string
  slideCount: number
  expiresAt: string | null
  viewerFirstViewed?: string
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

export function ViewSidebar({ title, createdAt, slideCount, expiresAt, viewerFirstViewed }: ViewSidebarProps) {
  const [copied, setCopied] = useState(false)

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="hidden w-64 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          {/* Presentation Info */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Presentation</h4>
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label="Created"
              value={new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            />
            <InfoRow icon={<Clock className="h-4 w-4" />} label="Duration" value="9:45" />
            <InfoRow icon={<Layers className="h-4 w-4" />} label="Slides" value={String(slideCount)} />
          </div>

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
            <a href="/privacy" className="transition-colors hover:text-zinc-600">Privacy</a>
            <span className="text-zinc-300">·</span>
            <a href="/terms" className="transition-colors hover:text-zinc-600">Terms</a>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
