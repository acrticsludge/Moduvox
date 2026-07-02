"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { CombinedGateDialog } from "@/components/view/CombinedGateDialog"
import { EmailSentScreen } from "@/components/view/EmailSentScreen"
import { VerifyErrorScreen } from "@/components/view/VerifyErrorScreen"
import { ViewNavbar } from "@/components/view/ViewNavbar"
import { ViewFooter } from "@/components/view/ViewFooter"
import { ViewAudioBar } from "@/components/view/ViewAudioBar"

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
  | { type: "verified"; viewerId: string }

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
  } catch { /* ignore */ }
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
  } catch { /* ignore */ }
}

export default function ViewPresentationPage() {
  const params = useParams<{ shareToken: string }>()
  const searchParams = useSearchParams()
  const shareToken = params.shareToken

  const [state, setState] = useState<PageState>({ type: "loading" })

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

  // Re-fetch gate settings when tab regains focus
  useEffect(() => {
    if (state.type !== "gate") return

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        fetch(`/api/view/${shareToken}`)
          .then(async (res) => {
            if (res.status === 410) {
              const json = await res.json().catch(() => ({}))
              clearGateState(shareToken)
              if (json.error?.toLowerCase().includes("archived")) {
                setState({ type: "archived" })
              } else {
                setState({ type: "expired" })
              }
              return null
            }
            if (!res.ok) {
              clearGateState(shareToken)
              setState({ type: "not_found" })
              return null
            }
            return res.json()
          })
          .then((json) => {
            if (!json) return
            if (!json.data.has_password && !json.data.email_gate_enabled) {
              // Gate no longer required — go to verified
              clearGateState(shareToken)
              setState({ type: "verified", viewerId: "" })
            } else {
              // Gate still active — update meta (settings may have changed)
              setState({ type: "gate", meta: json.data })
            }
          })
          .catch(() => {})
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [state.type, shareToken]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPresentation() {
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
      } else {
        clearGateState(shareToken)
        setState({ type: "gate", meta: data })
      }
    } catch {
      setState({ type: "not_found" })
    }
  }

  async function validateAndLoad(sessionToken: string, fromStorage = false) {
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
      setState({
        type: "verified",
        viewerId: verifyJson.data?.viewer_id || sessionToken,
      })
    } catch {
      if (fromStorage) {
        try { localStorage.removeItem(storageKey(SESSION_KEY_PREFIX, shareToken)) } catch { /* ignore */ }
        loadPresentation()
        return
      }
      setState({ type: "verify_error" })
    }
  }

  function handleGateSuccess(data: { viewer_id: string; viewer_name: string; email: string; session_token?: string; email_sent?: boolean }) {
    saveGateState(shareToken, {
      viewerId: data.viewer_id,
      viewerName: data.viewer_name,
      email: data.email,
    })

    // If no email was sent (gate disabled or already verified), go straight to verified
    if (data.email_sent === false && data.session_token) {
      validateAndLoad(data.session_token)
      return
    }

    setState({ type: "email_sent", viewerId: data.viewer_id, viewerName: data.viewer_name, email: data.email })
  }

  switch (state.type) {
    case "loading":
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            <p className="text-sm text-zinc-500">Loading presentation...</p>
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
      return (
        <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
          <ViewNavbar />
          <div className="flex flex-1">
            <aside className="hidden w-64 border-r border-zinc-200 bg-white md:block" />
            <main className="flex-1" />
          </div>
          <ViewAudioBar />
          <ViewFooter />
        </div>
      )

    default:
      return null
  }
}
