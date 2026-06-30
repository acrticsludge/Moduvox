"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { CombinedGateDialog } from "@/components/view/CombinedGateDialog"
import { EmailSentScreen } from "@/components/view/EmailSentScreen"
import { VerifyErrorScreen } from "@/components/view/VerifyErrorScreen"
import { ViewPlayer } from "@/components/view/ViewPlayer"

type SlideData = { number: number; title: string; bullets: string[]; narration: string }
type TimingData = { slideNumber: number; durationMs: number }

type PresentationMeta = {
  id: string
  title: string
  slide_count: number
  has_password: boolean
  email_gate_enabled: boolean
  slides?: SlideData[]
  timings?: TimingData[]
  total_duration_ms?: number
  combined_audio_url?: string
  created_at?: string
}

type PlayerData = {
  id: string
  title: string
  slide_count: number
  slides: SlideData[]
  timings: TimingData[]
  total_duration_ms: number
  combined_audio_url: string
}

type PageState =
  | { type: "loading" }
  | { type: "expired" }
  | { type: "not_found" }
  | { type: "gate"; meta: PresentationMeta }
  | { type: "email_sent"; viewerId: string; viewerName: string; email: string }
  | { type: "verify_error" }
  | {
      type: "player"
      data: PlayerData
      viewerId: string
      sessionToken: string
    }

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
      // Store in localStorage and strip from URL to prevent leakage
      saveSession(shareToken, sessionFromUrl)
      window.history.replaceState(null, "", `/view/${shareToken}`)
      validateAndLoad(sessionFromUrl, false)
    } else {
      // Check localStorage for existing session (survives tab close)
      const storedSession = loadSession(shareToken)
      if (storedSession) {
        validateAndLoad(storedSession, true)
        return
      }

      // Check if gate was already passed (survives tab close)
      const gateState = loadGateState(shareToken)
      if (gateState) {
        setState({
          type: "email_sent",
          viewerId: gateState.viewerId,
          viewerName: gateState.viewerName,
          email: gateState.email,
        })
        return
      }

      // No stored state — load presentation to show gate or player
      loadPresentation()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareToken, searchParams])

  async function loadPresentation() {
    setState({ type: "loading" })

    try {
      const res = await fetch(`/api/view/${shareToken}`)
      const json = await res.json()

      if (res.status === 410) {
        setState({ type: "expired" })
        return
      }

      if (!res.ok) {
        setState({ type: "not_found" })
        return
      }

      const data = json.data

      if (data.has_password || data.email_gate_enabled) {
        setState({ type: "gate", meta: data })
        return
      }

      loadPlayerFromFullData(data)
    } catch {
      setState({ type: "not_found" })
    }
  }

  async function validateAndLoad(sessionToken: string, fromStorage = false) {
    setState({ type: "loading" })

    try {
      // First verify the session
      const verifyRes = await fetch(`/api/view/${shareToken}/verify?vt=${sessionToken}`)
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
      const verifyJson = await verifyRes.json()

      // Then fetch full presentation data with session token (bypasses gate)
      const res = await fetch(`/api/view/${shareToken}?session=${sessionToken}`)
      const json = await res.json()

      if (!res.ok || !json.data?.slides) {
        if (fromStorage) {
          try { localStorage.removeItem(storageKey(SESSION_KEY_PREFIX, shareToken)) } catch { /* ignore */ }
          loadPresentation()
          return
        }
        setState({ type: "verify_error" })
        return
      }

      // Clear gate state — verification succeeded
      clearGateState(shareToken)
      setState({
        type: "player",
        data: json.data as PlayerData,
        viewerId: verifyJson.data?.viewer_id || sessionToken,
        sessionToken: sessionToken,
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

  function loadPlayerFromFullData(data: PresentationMeta) {
    const tempSession = crypto.randomUUID()
    setState({
      type: "player",
      data: data as PlayerData,
      viewerId: tempSession,
      sessionToken: tempSession,
    })
  }

  function handleGateSuccess(data: { viewer_id: string; viewer_name: string; email: string }) {
    // Store gate state in sessionStorage so it survives refresh
    saveGateState(shareToken, {
      viewerId: data.viewer_id,
      viewerName: data.viewer_name,
      email: data.email,
    })
    setState({ type: "email_sent", viewerId: data.viewer_id, viewerName: data.viewer_name, email: data.email })
  }

  function handleVerifyRetry() {
    clearGateState(shareToken)
    loadPresentation()
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
      return <VerifyErrorScreen shareToken={shareToken} onRetry={handleVerifyRetry} />

    case "player":
      return (
        <ViewPlayer
          slides={state.data.slides}
          combinedAudioUrl={state.data.combined_audio_url}
          timings={state.data.timings}
          totalDurationMs={state.data.total_duration_ms}
          presentationId={state.data.id}
          viewerId={state.viewerId}
          sessionToken={state.sessionToken}
          shareToken={shareToken}
        />
      )

    default:
      return null
  }
}
