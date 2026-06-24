"use client"

import { useState } from "react"
import { Navbar } from "@/components/ui/Navbar"
import { Footer } from "@/components/landing/footer"
import { Plus, FileText, Mic, Settings, LayoutGrid, Archive, Trash2 } from "lucide-react"

const SIDEBAR_ITEMS = [
  { label: "Presentations", icon: LayoutGrid, active: true },
  { label: "My Voices", icon: Mic, active: false },
  { label: "Settings", icon: Settings, active: false },
]

const SIDEBAR_BOTTOM = [
  { label: "Archived", icon: Archive },
  { label: "Trash", icon: Trash2 },
]

// Ghost placeholder cards for the empty-state grid backdrop
function GhostCard({ index }: { index: number }) {
  return (
    <div
      className="rounded-xl border border-dashed border-zinc-200 bg-white/50 p-5"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="mb-3 aspect-[16/9] rounded-lg bg-zinc-100" />
      <div className="mb-2 h-4 w-3/4 rounded bg-zinc-100" />
      <div className="h-3 w-1/2 rounded bg-zinc-100" />
    </div>
  )
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
      <Navbar />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#18181B]/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 pt-16">
        {/* ========== SIDEBAR ========== */}
        <aside
          className={`fixed bottom-0 left-0 top-16 z-30 flex w-56 flex-col border-r border-[var(--color-border-faint)] bg-white transition-transform duration-300 md:static md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
            {SIDEBAR_ITEMS.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150 ${
                  item.active
                    ? "bg-zinc-100 text-[#18181B]"
                    : "text-[#71717A] hover:bg-zinc-50 hover:text-[#18181B]"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}

            <hr className="my-3 border-zinc-200" />

            {SIDEBAR_BOTTOM.map((item) => (
              <button
                key={item.label}
                type="button"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#71717A] transition-colors duration-150 hover:bg-zinc-100 hover:text-[#18181B]"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ========== MAIN CONTENT ========== */}
        <main className="flex flex-1 flex-col min-w-0">
          {/* Top bar */}
          <div className="flex items-center justify-between border-b border-[var(--color-border-faint)] bg-white px-6 py-4">
            <div className="flex items-center gap-3">
              {/* Mobile sidebar toggle */}
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#71717A] hover:bg-zinc-100 hover:text-[#18181B] md:hidden"
                aria-label="Open sidebar"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <h1 className="text-lg font-semibold text-[#18181B]">
                My Presentations
              </h1>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#71717A] transition-colors duration-150 hover:text-[#18181B]"
            >
              <Plus className="h-4 w-4" />
              New Presentation
            </button>
          </div>

          {/* Content area */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-12">
            {/* Ghost cards grid — visible on larger screens */}
            <div className="pointer-events-none absolute inset-0 grid grid-cols-1 gap-5 px-6 py-12 opacity-30 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <GhostCard key={i} index={i} />
              ))}
            </div>

            {/* Centered empty state */}
            <div className="relative z-10 mx-auto max-w-sm text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100">
                <FileText className="h-7 w-7 text-[#71717A]" />
              </div>
              <h2 className="text-xl font-semibold text-[#18181B]">
                No presentations yet
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#71717A]">
                Upload a PowerPoint file and a voice sample to create your first
                narrated training presentation.
              </p>
              <button
                type="button"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#71717A] transition-colors duration-150 hover:text-[#18181B]"
              >
                <Plus className="h-4 w-4" />
                Create your first presentation
              </button>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  )
}
