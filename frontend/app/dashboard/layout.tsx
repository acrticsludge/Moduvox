"use client"

import { useState, useEffect, createContext, useContext } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Navbar } from "@/components/ui/Navbar"
import { Footer } from "@/components/landing/footer"
import { LayoutGrid, Mic, Settings, Archive } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import { ErrorBoundary } from "react-error-boundary"

const SIDEBAR_MAIN = [
  { label: "All Projects", icon: LayoutGrid, href: "/dashboard", match: /^\/dashboard(\/projects\/?.*|\/presentations\/?.*)?$/ },
  { label: "My Voices", icon: Mic, href: "/dashboard/voices", match: /^\/dashboard\/voices/ },
  { label: "Archived", icon: Archive, href: "/dashboard/archived", match: /^\/dashboard\/archived/ },
  { label: "Settings", icon: Settings, href: "/dashboard/settings", match: /^\/dashboard\/settings/ },
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
  const [checkingAuth, setCheckingAuth] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const isPresentationEditor =
    pathname.includes("/dashboard/projects/") && pathname.includes("/presentations/")

  // Defense-in-depth: verify auth client-side even if middleware was bypassed
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login")
      } else {
        setCheckingAuth(false)
      }
    })
  }, [router, supabase])

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen bg-[#F9FAFB]">
        {/* Sidebar */}
        <aside className="hidden w-64 border-r border-zinc-200 bg-white p-4 md:block">
          <Skeleton className="mb-8 h-6 w-24" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </aside>
        {/* Main content */}
        <div className="flex flex-1 flex-col">
          {/* Top bar */}
          <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6">
            <Skeleton className="h-5 w-32" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </header>
          {/* Content area */}
          <main className="flex-1 p-6">
            <Skeleton className="mb-6 h-8 w-40" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4">
                  <Skeleton className="mb-3 h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    )
  }

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
            className="fixed inset-0 z-40 bg-[#18181B]/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div
          className={`flex flex-1 pt-16 ${
            isPresentationEditor
              ? "h-[calc(100dvh-4rem)] min-h-[calc(100dvh-4rem)] flex-none"
              : ""
          }`}
        >
          {/* ========== SIDEBAR ========== */}
          <ErrorBoundary
            fallback={
              <aside className="fixed bottom-0 left-0 top-16 z-40 flex w-56 flex-col border-r border-[var(--color-border-faint)] bg-white p-4 md:static">
                <p className="text-sm text-[#71717A]">Sidebar unavailable</p>
              </aside>
            }
          >
          <aside
            className={`fixed bottom-0 left-0 top-16 z-40 flex w-56 flex-col border-r border-[var(--color-border-faint)] bg-white transition-transform duration-300 md:static md:translate-x-0 ${
              sidebarOpen ? "translate-x-0" : "pointer-events-none -translate-x-full"
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
className={`touch-target-row gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150 ${
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


            </nav>
          </aside>
          </ErrorBoundary>

          {/* ========== MAIN CONTENT ========== */}
          <main
            className={`relative flex min-w-0 flex-1 flex-col ${
              isPresentationEditor ? "" : "pb-16"
            }`}
          >
            <ErrorBoundary
              fallback={
                <main className="flex flex-1 flex-col items-center justify-center p-8 min-w-0">
                  <p className="text-sm text-[#71717A]">This section encountered an error.</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-3 min-h-[48px] min-w-[48px] rounded-lg bg-[#18181B] px-4 py-2 text-sm font-medium text-white"
                  >
                    Reload
                  </button>
                </main>
              }
            >
              {children}
            </ErrorBoundary>
          </main>
        </div>

        <Footer />
      </div>
    </SidebarContext.Provider>
  )
}
