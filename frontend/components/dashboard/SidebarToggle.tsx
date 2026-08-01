"use client"

import { Menu } from "lucide-react"
import { useSidebar } from "@/app/dashboard/layout"

export function SidebarToggle({ className = "" }: { className?: string }) {
  const { open } = useSidebar()
  return (
    <button
      type="button"
      onClick={open}
      className={`inline-flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-[#71717A] transition-colors hover:text-[#18181B] md:hidden ${className}`}
      aria-label="Open sidebar"
    >
      <Menu className="h-4 w-4" />
    </button>
  )
}
