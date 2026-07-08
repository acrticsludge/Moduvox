"use client"

import { useState, useEffect, createContext, useContext } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Toaster } from "react-hot-toast"
import { Navbar } from "@/components/ui/Navbar"
import { Footer } from "@/components/landing/footer"
import { LayoutGrid, Mic, Settings, Archive, Menu, Loader2 } from "lucide-react"
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
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB]">
        <Loader2 className="h-6 w-6 animate-spin text-[#71717A]" />
      </div>
    )
  }

  const ctx: SidebarCtx = {
    open: () => setSidebarOpen(true),
    close: () => setSidebarOpen(false),
  }

  return (
    <SidebarContext.Provider value={ctx}>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 2000,
          style: { fontSize: "13px", background: "#18181B", color: "#FAFAFA", borderRadius: "8px" },
        }}
      />
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
          <ErrorBoundary
            fallback={
              <aside className="fixed bottom-0 left-0 top-16 z-30 flex w-56 flex-col border-r border-[var(--color-border-faint)] bg-white p-4 md:static">
                <p className="text-sm text-[#71717A]">Sidebar unavailable</p>
              </aside>
            }
          >
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
className={`touch-target gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150 ${
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
          <main className="relative flex flex-1 flex-col min-w-0 pb-16">
            {/* Mobile hamburger — floats above content when sidebar is closed */}
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="fixed left-3 top-20 z-20 inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg border border-zinc-200 bg-white shadow-sm text-[#71717A] transition-colors hover:text-[#18181B] md:hidden"
                aria-label="Open sidebar"
              >
                <Menu className="h-4 w-4" />
              </button>
            )}
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
