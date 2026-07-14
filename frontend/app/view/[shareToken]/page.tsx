"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"

import { EmailSentScreen } from "@/components/view/EmailSentScreen"
import { VerifyErrorScreen } from "@/components/view/VerifyErrorScreen"
import { ViewNavbar } from "@/components/view/ViewNavbar"
import { ViewFooter } from "@/components/view/ViewFooter"
import { ViewSidebar } from "@/components/view/ViewSidebar"
import type { SlideTiming, SeekToSlideFn } from "@/components/view/ViewAudioBar"

const ViewSlide = dynamic(() => import("@/components/view/ViewSlide").then((mod) => mod.ViewSlide), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center rounded-lg bg-zinc-100 p-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
    </div>
  ),
})

const CombinedGateDialog = dynamic(() => import("@/components/view/CombinedGateDialog").then(mod => mod.CombinedGateDialog), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
    </div>
  ),
})
const ViewAudioBar = dynamic(() => import("@/components/view/ViewAudioBar").then(mod => mod.ViewAudioBar), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse border-t border-zinc-200 px-6 py-4">
      <div className="h-16 w-full rounded-xl bg-zinc-100" />
    </div>
  ),
})

type PresentationMeta = {
  id: string
  title: string
  slide_count: number
  has_password: boolean
  email_gate_enabled: boolean
  created_at?: string
}

type PageState =
  | { type: "loading" }
  | { type: "expired" }
  | { type: "archived" }
  | { type: "not_found" }
  | { type: "gate"; meta: PresentationMeta }
  | { type: "email_sent"; viewerId: string; viewerName: string; email: string }
  | { type: "verify_error" }
  | { type: "verified"; viewerId: string; sessionToken?: string }

const GATE_KEY_PREFIX = "moduvox_gate_"
const SESSION_KEY_PREFIX = "moduvox_session_"

function storageKey(prefix: string, shareToken: string) {
  return `${prefix}${shareToken}`
}

function loadGateState(shareToken: string): { viewerId: string; viewerName: string; email: string } | null {
  try {
    const stored = localStorage.getItem(storageKey(GATE_KEY_PREFIX, shareToken))
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return null
}

function saveGateState(shareToken: string, data: { viewerId: string; viewerName: string; email: string }) {
  try {
    localStorage.setItem(storageKey(GATE_KEY_PREFIX, shareToken), JSON.stringify(data))
  } catch { console.warn("localStorage quota exceeded") }
}

function clearGateState(shareToken: string) {
  try {
    localStorage.removeItem(storageKey(GATE_KEY_PREFIX, shareToken))
  } catch { /* ignore */ }
}

function loadSession(shareToken: string): string | null {
  try {
    return localStorage.getItem(storageKey(SESSION_KEY_PREFIX, shareToken))
  } catch { /* ignore */ }
  return null
}

function saveSession(shareToken: string, token: string) {
  try {
    localStorage.setItem(storageKey(SESSION_KEY_PREFIX, shareToken), token)
  } catch { console.warn("localStorage quota exceeded") }
}

export default function ViewPresentationPage() {
  const params = useParams<{ shareToken: string }>()
  const searchParams = useSearchParams()
  const shareToken = params.shareToken

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [state, setState] = useState<PageState>({ type: "loading" })
  const stateTypeRef = useRef(state.type)
  stateTypeRef.current = state.type
  const [slides, setSlides] = useState<{ slideNumber: number; pdfUrl: string | null }[] | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slidesLoading, setSlidesLoading] = useState(false)
  const [slidesError, setSlidesError] = useState<string | null>(null)
  const slidesFetchingRef = useRef(false)
  const loadingRef = useRef(false)
  const [audioRefreshKey, setAudioRefreshKey] = useState(0)
  const [convertFailed, setConvertFailed] = useState(false)
  const [versionStatus, setVersionStatus] = useState<"synced" | "outdated" | null>(null)
  const [firstWatch, setFirstWatch] = useState(true)
  const [realDurationMs, setRealDurationMs] = useState<number | undefined>(undefined)
  const viewDataRef = useRef<{ title: string; created_at?: string; slide_count?: number; expires_at?: string | null; total_duration_ms?: number; audio_url?: string | null; audio_version?: number; slide_timings?: SlideTiming[]; viewer_created_at?: string | null; presentation_id?: string; viewer_id?: string | null; first_watch_done?: boolean } | null>(null)
  const audioVersionRef = useRef(0)
  const sessionRef = useRef("")
  const seekToSlideRef = useRef<SeekToSlideFn | null>(null)
  const preloadControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const sessionFromUrl = searchParams.get("session")
    if (sessionFromUrl) {
      saveSession(shareToken, sessionFromUrl)
      window.history.replaceState(null, "", `/view/${shareToken}`)
      validateAndLoad(sessionFromUrl, false)
    } else {
      const storedSession = loadSession(shareToken)
      if (storedSession) {
        validateAndLoad(storedSession, true)
        return
      }
      loadPresentation()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareToken, searchParams])

  // Re-fetch gate settings when tab regains focus — covers both gate and email_sent states
  useEffect(() => {
    if (state.type !== "gate" && state.type !== "email_sent") return

    async function recheckGate() {
      try {
        const res = await fetch(`/api/view/${shareToken}`)
        if (res.status === 410) {
          const json = await res.json().catch(() => ({}))
          clearGateState(shareToken)
          setState(json.error?.toLowerCase().includes("archived")
            ? { type: "archived" }
            : { type: "expired" })
          return
        }
        if (!res.ok) {
          clearGateState(shareToken)
          setState({ type: "not_found" })
          return
        }
        const json = await res.json()
        if (!json.data) return

        if (stateTypeRef.current === "email_sent" && !json.data.has_password && !json.data.email_gate_enabled) {
          // Gate was disabled while viewer was on email_sent — proceed automatically
          clearGateState(shareToken)
          setState({ type: "verified", viewerId: "" })
        } else if (stateTypeRef.current === "gate") {
          if (!json.data.has_password && !json.data.email_gate_enabled) {
            // Gate no longer required — go to verified
            clearGateState(shareToken)
            setState({ type: "verified", viewerId: "" })
          } else {
            // Gate still active — update meta
            setState({ type: "gate", meta: json.data })
          }
        }
      } catch { /* ignore */ }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") recheckGate()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.type, shareToken])

  async function loadPresentation() {
    if (loadingRef.current) return
    loadingRef.current = true
    setState({ type: "loading" })

    try {
      const res = await fetch(`/api/view/${shareToken}`)
      const json = await res.json()

      if (res.status === 410) {
        clearGateState(shareToken)
        if (json.error?.toLowerCase().includes("archived")) {
          setState({ type: "archived" })
        } else {
          setState({ type: "expired" })
        }
        return
      }

      if (!res.ok) {
        clearGateState(shareToken)
        setState({ type: "not_found" })
        return
      }

      const data = json.data
      viewDataRef.current = data
      audioVersionRef.current = data.audio_version ?? 0
      setVersionStatus("synced")
      // Invert: first_watch_done means "was completed", firstWatch means "is this the first"
      if (data.first_watch_done !== undefined) setFirstWatch(!data.first_watch_done)

      if (data.has_password || data.email_gate_enabled) {
        // Gate still required — check localStorage as cache hint
        const gateState = loadGateState(shareToken)
        if (gateState) {
          // Only show email_sent if email gate is actually enabled
          if (data.email_gate_enabled) {
            setState({
              type: "email_sent",
              viewerId: gateState.viewerId,
              viewerName: gateState.viewerName,
              email: gateState.email,
            })
            return
          }
          // Email gate is disabled — clear stale state and show gate dialog
          clearGateState(shareToken)
        }
        setState({ type: "gate", meta: data })
        return
      }

      // No gate — still show dialog for viewer tracking
      const gateState = loadGateState(shareToken)
      if (gateState) {
        // Already submitted tracking info — go to verified
        setState({ type: "verified", viewerId: gateState.viewerId })
      } else if (loadSession(shareToken)) {
        // Session exists but no gate state — must have been verified already
        setState({ type: "verified", viewerId: "" })
      } else {
        clearGateState(shareToken)
        setState({ type: "gate", meta: data })
      }
    } catch (err) {
      // Network errors (TypeError) should not be conflated with "not found"
      if (err instanceof TypeError) {
        setState({ type: "loading" }) // keeps loading state — retry on visibilitychange
        return
      }
      clearGateState(shareToken)
      setState({ type: "not_found" })
    } finally {
      loadingRef.current = false
    }
  }

  async function validateAndLoad(sessionToken: string, fromStorage = false) {
    if (loadingRef.current) return
    loadingRef.current = true
    setState({ type: "loading" })

    try {
      const verifyRes = await fetch(`/api/view/${shareToken}/verify?vt=${sessionToken}`)
      const verifyJson = await verifyRes.json()

      if (!verifyRes.ok) {
        // Stored session is invalid — clear it and fall back to gate
        if (fromStorage) {
          try { localStorage.removeItem(storageKey(SESSION_KEY_PREFIX, shareToken)) } catch { /* ignore */ }
          loadPresentation()
          return
        }
        setState({ type: "verify_error" })
        return
      }

      // Clear gate state and persist session — verification succeeded
      clearGateState(shareToken)
      saveSession(shareToken, sessionToken)

      // Fetch presentation metadata for the sidebar (viewDataRef)
      // Retry a few times — the presentation may not be queryable yet
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const viewRes = await fetch(`/api/view/${shareToken}?session=${sessionToken}`)
          if (viewRes.ok) {
            const viewJson = await viewRes.json()
            if (viewJson.data) {
              // If gate was enabled since this viewer was verified, redirect to gate
              if (viewJson.data.has_password || viewJson.data.email_gate_enabled) {
                clearGateState(shareToken)
                try { localStorage.removeItem(storageKey(SESSION_KEY_PREFIX, shareToken)) } catch { /* ignore */ }
                setState({ type: "gate", meta: viewJson.data })
                return
              }

              viewDataRef.current = viewJson.data
              audioVersionRef.current = viewJson.data.audio_version ?? 0
              setVersionStatus("synced")
              // Invert: first_watch_done means "was completed", firstWatch means "is this the first"
              if (viewJson.data.first_watch_done !== undefined) setFirstWatch(!viewJson.data.first_watch_done)
              break
            }
          }
        } catch { /* retry */ }
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1000))
      }

      setState({
        type: "verified",
        viewerId: verifyJson.data?.viewer_id || sessionToken,
        sessionToken: sessionToken,
      })
    } catch (err) {
      if (err instanceof TypeError) {
        // Network error — retry without clearing storage
        loadingRef.current = false
        loadPresentation()
        return
      }
      if (fromStorage) {
        try { localStorage.removeItem(storageKey(SESSION_KEY_PREFIX, shareToken)) } catch { /* ignore */ }
        loadingRef.current = false
        loadPresentation()
        return
      }
      setState({ type: "verify_error" })
    } finally {
      loadingRef.current = false
    }
  }

  async function fetchSlides(sessionToken: string, token: string) {
    if (slidesFetchingRef.current) return // prevent concurrent fetches
    slidesFetchingRef.current = true
    setSlidesLoading(true)
    setSlidesError(null)
    try {
      const res = await fetch(`/api/view/${token}/slides?session=${sessionToken}`)
      const json = await res.json()
      if (json.data) {
        setSlides(json.data.slides)
        if (json.data.slides.length === 0 || json.data.slides.every((s: { pdfUrl: unknown }) => !s.pdfUrl)) {
          setSlidesError("Slides are being generated. Check back soon.")
        }
      } else {
        setSlidesError(json.error || "Failed to load slides")
      }
    } catch {
      setSlidesError("Could not load slides.")
    } finally {
      setSlidesLoading(false)
      slidesFetchingRef.current = false
    }
  }

  // Fetch slides when entering verified state
  useEffect(() => {
    if (state.type === "verified" && state.sessionToken) {
      fetchSlides(state.sessionToken, shareToken)
      setCurrentSlide(0)
    }
  }, [state.type]) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for changes every 30s — show a banner if audio_version changed
  useEffect(() => {
    if (state.type !== "verified") return

    const interval = setInterval(async () => {
      const tok = sessionRef.current
      if (!tok) return
      try {
        const res = await fetch(`/api/view/${shareToken}?session=${tok}`)
        if (!res.ok) return
        const json = await res.json()
        if (!json.data) return

        const newVersion = json.data.audio_version ?? 0
        if (newVersion !== audioVersionRef.current) {
          audioVersionRef.current = newVersion
          viewDataRef.current = json.data
          setVersionStatus("outdated")
        }
      } catch {
        // silent — polling errors should not disrupt the viewer
      }
    }, 30_000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.type, shareToken])

  // Abort slide preloads on unmount
  useEffect(() => {
    return () => { preloadControllerRef.current?.abort() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply pending changes: re-fetch view data + slides + force audio remount
  async function applyChanges() {
    const tok = sessionRef.current
    if (!tok) return

    // Re-fetch view data to get fresh slide_timings, audio_url, total_duration_ms
    // This ensures the AudioBar remounts with correct timing data
    try {
      const res = await fetch(`/api/view/${shareToken}?session=${tok}`)
      if (res.ok) {
        const json = await res.json()
        if (json.data) {
          viewDataRef.current = json.data
          audioVersionRef.current = json.data.audio_version ?? 0
          if (json.data.total_duration_ms) setRealDurationMs(json.data.total_duration_ms)
          // Invert: first_watch_done means "was completed", firstWatch means "is this the first"
          if (json.data.first_watch_done !== undefined) setFirstWatch(!json.data.first_watch_done)
        }
      }
    } catch { /* use stale data */ }

    fetchSlides(tok, shareToken)
    setAudioRefreshKey(k => k + 1)
    setVersionStatus("synced")
  }

  function clampSlide(sn: number) {
    return Math.max(1, Math.min(sn, viewDataRef.current?.slide_count || 1))
  }

  // Navigate to a slide — seeks audio to the slide's start time
  function goToSlide(slideNumber: number) {
    const sn = clampSlide(slideNumber)
    seekToSlideRef.current?.(sn, true)
    // Also update currentSlide immediately for instant visual feedback
    setCurrentSlide(sn - 1)
    preloadSlides(sn, slides)
  }

  // Preload PDFs for slides around the current one (next 2, previous)
  // Fetches into browser cache so react-pdf loads instantly when user navigates
  function preloadSlides(currentSn: number, allSlides: { slideNumber: number; pdfUrl: string | null }[] | null) {
    if (!allSlides) return
    preloadControllerRef.current?.abort()
    const controller = new AbortController()
    preloadControllerRef.current = controller
    const preloadSn = new Set<number>()
    for (let i = -1; i <= 2; i++) {
      const sn = currentSn + i
      if (sn >= 1 && sn <= allSlides.length) preloadSn.add(sn)
    }
    for (const s of allSlides) {
      if (preloadSn.has(s.slideNumber) && s.pdfUrl && s.slideNumber !== currentSn) {
        fetch(s.pdfUrl, { cache: "force-cache", signal: controller.signal }).catch(() => {})
      }
    }
  }

  function handleGateSuccess(data: { viewer_id: string; viewer_name: string; email: string; session_token?: string; email_sent?: boolean; already_verified?: boolean }) {
    saveGateState(shareToken, {
      viewerId: data.viewer_id,
      viewerName: data.viewer_name,
      email: data.email,
    })

    // Gate API already confirmed verification — skip redundant verify API call
    if (data.already_verified && data.session_token) {
      saveSession(shareToken, data.session_token)
      clearGateState(shareToken)
      setState({ type: "verified", viewerId: data.viewer_id, sessionToken: data.session_token })
      return
    }

    // If no email was sent but viewer needs verification, call verify API
    if (data.email_sent === false && data.session_token) {
      saveSession(shareToken, data.session_token)
      validateAndLoad(data.session_token)
      return
    }

    setState({ type: "email_sent", viewerId: data.viewer_id, viewerName: data.viewer_name, email: data.email })
  }

  switch (state.type) {
    case "loading":
      return (
        <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
          <div className="animate-pulse border-b border-zinc-200 px-6 py-3">
            <div className="h-8 w-32 rounded bg-zinc-100" />
          </div>
          <div className="flex flex-1">
            <div className="hidden w-64 animate-pulse border-r border-zinc-200 p-6 lg:block">
              <div className="space-y-4">
                <div className="h-5 w-40 rounded bg-zinc-100" />
                <div className="h-4 w-32 rounded bg-zinc-100" />
                <div className="h-4 w-24 rounded bg-zinc-100" />
              </div>
            </div>
            <main className="flex min-h-[60vh] flex-1 items-start p-6">
              <div className="w-full space-y-6">
                <div className="h-6 w-48 animate-pulse rounded bg-zinc-100" />
                <div className="h-[400px] w-full animate-pulse rounded-xl bg-zinc-100" />
              </div>
            </main>
          </div>
          <div className="animate-pulse border-t border-zinc-200 px-6 py-4">
            <div className="h-16 w-full rounded-xl bg-zinc-100" />
          </div>
        </div>
      )

    case "archived":
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
          <div className="w-full max-w-sm text-center">
            <h1 className="mb-2 text-lg font-semibold text-[#18181B]">Presentation Archived</h1>
            <p className="text-sm text-zinc-500">This presentation has been archived by its owner and is no longer available.</p>
          </div>
        </div>
      )

    case "expired":
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
          <div className="w-full max-w-sm text-center">
            <h1 className="mb-2 text-lg font-semibold text-[#18181B]">This link has expired</h1>
            <p className="text-sm text-zinc-500">The presentation link has expired. Contact the owner for a new link.</p>
          </div>
        </div>
      )

    case "not_found":
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
          <div className="w-full max-w-sm text-center">
            <h1 className="mb-2 text-lg font-semibold text-[#18181B]">Presentation not found</h1>
            <p className="text-sm text-zinc-500">This presentation doesn't exist or has been removed.</p>
          </div>
        </div>
      )

    case "gate":
      return (
        <CombinedGateDialog
          shareToken={shareToken}
          title={state.meta.title}
          hasPassword={state.meta.has_password}
          emailGateEnabled={state.meta.email_gate_enabled}
          onSuccess={handleGateSuccess}
        />
      )

    case "email_sent":
      return <EmailSentScreen email={state.email} viewerName={state.viewerName} shareToken={shareToken} />

    case "verify_error":
      return <VerifyErrorScreen />

    case "verified":
      const sessionToken = state.sessionToken || ""
      sessionRef.current = sessionToken
      return (
        <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
          <ViewNavbar />

          <div className="flex flex-1">
            {/* Mobile sidebar toggle */}
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="fixed left-3 top-4 z-20 inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg border border-zinc-200 bg-white shadow-sm text-zinc-500 transition-colors hover:text-zinc-800 md:hidden"
                aria-label="Show info"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              </button>
            )}
            <ViewSidebar
              title={viewDataRef.current?.title || "Untitled"}
              createdAt={viewDataRef.current?.created_at}
              slideCount={viewDataRef.current?.slide_count || 0}
              expiresAt={viewDataRef.current?.expires_at || null}
              totalDurationMs={realDurationMs ?? viewDataRef.current?.total_duration_ms}
              viewerFirstViewed={viewDataRef.current?.viewer_created_at || undefined}
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              currentSlide={currentSlide}
              onSlideClick={(sn) => goToSlide(sn)}
            />
            <main id="viewer-main-content" className="flex flex-1 flex-col items-center p-4 md:p-8">
              {slidesError && (
                <div className="mb-4 w-full max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {slidesError}
                </div>
              )}
              {convertFailed && (
                <div className="mb-4 w-full max-w-2xl rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
                  Slide conversion request failed. Try again.
                </div>
              )}
              {slidesLoading ? (
                <div className="flex min-h-[60vh] flex-1 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                </div>
              ) : slides && slides.length > 0 ? (
                <>
                  <ViewSlide
                    pdfUrl={slides[currentSlide]?.pdfUrl ?? null}
                    slideNumber={currentSlide + 1}
                    totalSlides={slides.length}
                  />
                  <div className="mt-4 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => goToSlide(currentSlide)}
                      disabled={currentSlide === 0}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Previous slide"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <span className="min-w-[60px] text-center text-sm tabular-nums text-zinc-500">
                      {currentSlide + 1} / {slides.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => goToSlide(currentSlide + 2)}
                      disabled={currentSlide >= slides.length - 1}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Next slide"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-4">
                  <p className="text-sm text-zinc-500">No slides available</p>
                  <p className="text-xs text-zinc-400">Slides may still be generating. Click below to retry.</p>
                  <button
                    type="button"
                    disabled={slidesLoading}
                    onClick={async () => {
                      if (state.type !== "verified" || !state.sessionToken) return
                      setConvertFailed(false)
                      try {
                        const res = await fetch(`/api/view/${shareToken}/convert`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ sessionToken: state.sessionToken }),
                        })
                        if (!res.ok) setConvertFailed(true)
                      } catch { setConvertFailed(true) }
                      if (state.sessionToken) await fetchSlides(state.sessionToken, shareToken)
                    }}
                    className="min-h-[44px] rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
                  >
                    {slidesLoading ? "Generating..." : "Generate slides"}
                  </button>
                </div>
              )}
            </main>
          </div>
        <ViewAudioBar key={audioRefreshKey} seekToSlideRef={seekToSlideRef}
          shareToken={shareToken}
          sessionToken={sessionToken}
          viewerId={state.viewerId}
          presentationId={viewDataRef.current?.presentation_id || ""}
          totalDurationMs={viewDataRef.current?.total_duration_ms}
          audioUrl={viewDataRef.current?.audio_url || undefined}
          versionStatus={versionStatus}
          onRefresh={applyChanges}
          slideTimings={viewDataRef.current?.slide_timings}
          onSlideChange={(sn) => {
            setCurrentSlide(sn - 1)
            // Preload slides around the new one
            preloadSlides(sn, slides)
          }}
          firstWatch={firstWatch}
          onDurationReady={(sec) => setRealDurationMs(sec * 1000)}
        />
          <ViewFooter />
        </div>
      )

    default:
      return null
  }
}
