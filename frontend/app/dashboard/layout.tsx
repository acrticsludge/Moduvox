"use client"

import { useState, createContext, useContext } from "react"
import { usePathname } from "next/navigation"
import { Navbar } from "@/components/ui/Navbar"
import { Footer } from "@/components/landing/footer"
import { LayoutGrid, Mic, Settings, Archive, Trash2, Menu } from "lucide-react"

const SIDEBAR_MAIN = [
  { label: "All Projects", icon: LayoutGrid, href: "/dashboard", match: /^\/dashboard(\/projects\/?.*)?$/ },
  { label: "My Voices", icon: Mic, href: "/dashboard/voices", match: /^\/dashboard\/voices/ },
  { label: "Settings", icon: Settings, href: "/dashboard/settings", match: /^\/dashboard\/settings/ },
]

const SIDEBAR_BOTTOM = [
  { label: "Archived", icon: Archive },
  { label: "Trash", icon: Trash2 },
]

type SidebarCtx = {
  open: () => void
  close: () => void
}

const SidebarContext = createContext<SidebarCtx>({
  open: () => {},
  close: () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const ctx: SidebarCtx = {
    open: () => setSidebarOpen(true),
    close: () => setSidebarOpen(false),
  }

  return (
    <SidebarContext.Provider value={ctx}>
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
              {SIDEBAR_MAIN.map((item) => {
                const active = item.match.test(pathname)
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150 ${
                      active
                        ? "bg-zinc-100 text-[#18181B]"
                        : "text-[#71717A] hover:bg-zinc-50 hover:text-[#18181B]"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </a>
                )
              })}

              <hr className="my-3 border-zinc-200" />

              {SIDEBAR_BOTTOM.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#71717A] transition-colors duration-150 hover:bg-zinc-50 hover:text-[#18181B]"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* ========== MAIN CONTENT ========== */}
          <main className="relative flex flex-1 flex-col min-w-0 pb-16">
            {/* Mobile hamburger — floats above content when sidebar is closed */}
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="fixed left-3 top-20 z-20 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white shadow-sm text-[#71717A] transition-colors hover:text-[#18181B] md:hidden"
                aria-label="Open sidebar"
              >
                <Menu className="h-4 w-4" />
              </button>
            )}
            {children}
          </main>
        </div>

        <Footer />
      </div>
    </SidebarContext.Provider>
  )
}
