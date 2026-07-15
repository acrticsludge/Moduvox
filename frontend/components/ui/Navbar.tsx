"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const NAV_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Feedback", href: "/feedback" },
];

// Spring physics curve from DESIGN.md — weighty, not floaty
const SPRING = "cubic-bezier(0.34,1.56,0.64,1)";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Navbar is transparent + absolute over the Canvas; gains a Surface backdrop
  // once scrolled so Charcoal text stays legible over content below.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Close drawer on Escape key
  useEffect(() => {
    if (!drawerOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [drawerOpen])

  // Close drawer when window crosses md breakpoint (768px)
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) setDrawerOpen(false)
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "bg-[#FFFFFF]/90 backdrop-blur-sm border-b border-[rgba(226,232,240,0.6)]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: logo */}
        <a
          href="/"
          className="flex items-center"
          aria-label="Moduvox home"
        >
          <img src="/logo-wordmark.svg" alt="Moduvox" className="h-7" />
        </a>

          {/* Right: desktop links + CTA */}
          <div className="hidden items-center gap-2 md:flex">
            <ul className="flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-[#71717A] no-underline transition-colors duration-200 hover:bg-[rgba(0,0,0,0.04)] hover:text-[#18181B] active:bg-[rgba(0,0,0,0.08)]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            {user ? (
              <a
                href="/dashboard"
                className="ml-2 rounded-lg border border-[#18181B]/70 bg-[#18181B] px-4 py-2 text-sm font-medium text-white transition-transform duration-200 hover:scale-[1.02] hover:border-[#18181B] hover:bg-[#27272A] active:scale-[0.98]"
              >
                Dashboard
              </a>
            ) : (
              <>
                <a
                  href="/login"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-[#71717A] no-underline transition-colors duration-200 hover:text-[#18181B]"
                >
                  Log in
                </a>
                <a
                  href="/signup"
                  style={{ transitionTimingFunction: SPRING }}
                  className="ml-2 rounded-lg border border-zinc-300 bg-transparent px-4 py-2 text-sm font-medium text-[#18181B] transition-all duration-200 hover:bg-[#F9FAFB] hover:scale-[1.02] active:scale-[0.98]"
                >
                  Start free
                </a>
              </>
            )}
          </div>

        {/* Mobile: hamburger */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex h-11 w-11 min-h-[48px] min-w-[48px] items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-[rgba(0,0,0,0.04)] hover:text-[#18181B] md:hidden"
          aria-label="Open menu"
          aria-expanded={drawerOpen}
        >
          <Menu className="h-6 w-6" />
        </button>
      </nav>

      {/* Mobile drawer overlay */}
      <div
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-[#18181B]/40 transition-opacity duration-300 md:hidden ${
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      {/* Mobile drawer panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-72 max-w-[80%] flex-col bg-[#FFFFFF] px-6 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out overflow-y-auto md:hidden ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!drawerOpen}
      >
        <div className="flex items-center justify-between">
          <img src="/logo-wordmark.svg" alt="Moduvox" className="h-7" />
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="inline-flex h-11 w-11 min-h-[48px] min-w-[48px] items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-[rgba(0,0,0,0.04)] hover:text-[#18181B]"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <ul className="mt-8 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setDrawerOpen(false)}
                className="touch-target rounded-lg px-3 py-2.5 text-base font-medium text-[#71717A] no-underline transition-colors duration-200 hover:bg-[rgba(0,0,0,0.04)] hover:text-[#18181B]"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-auto space-y-2">
          {user ? (
            <a
              href="/dashboard"
              onClick={() => setDrawerOpen(false)}
              className="touch-target rounded-lg border border-[#18181B]/70 bg-[#18181B] px-4 py-2.5 text-center text-sm font-medium text-white transition-transform duration-200 hover:scale-[1.02] hover:border-[#18181B] hover:bg-[#27272A] active:scale-[0.98]"
            >
              Dashboard
            </a>
          ) : (
            <>
              <a
                href="/login"
                onClick={() => setDrawerOpen(false)}
                className="touch-target rounded-lg px-3 py-2.5 text-base font-medium text-[#71717A] no-underline transition-colors duration-200 hover:bg-[rgba(0,0,0,0.04)] hover:text-[#18181B]"
              >
                Log in
              </a>
              <a
                href="/signup"
                onClick={() => setDrawerOpen(false)}
                style={{ transitionTimingFunction: SPRING }}
                className="touch-target rounded-lg border border-zinc-300 bg-transparent px-4 py-2.5 text-center text-sm font-medium text-[#18181B] transition-all duration-200 hover:bg-[#F9FAFB] hover:scale-[1.02] active:scale-[0.98]"
              >
                Start free
              </a>
            </>
          )}
        </div>
      </aside>
    </header>
  );
}
