"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { PasswordGateDialog } from "@/components/view/PasswordGateDialog"
import { EmailGateDialog } from "@/components/view/EmailGateDialog"
import { EmailSentScreen } from "@/components/view/EmailSentScreen"
import { VerifyErrorScreen } from "@/components/view/VerifyErrorScreen"
import { ViewPlayer } from "@/components/view/ViewPlayer"

type PageState =
  | { type: "loading" }
  | { type: "expired" }
  | { type: "not_found" }
  | { type: "password_gate" }
  | { type: "email_gate" }
  | { type: "email_sent"; viewerId: string; email: string }
  | { type: "verify_error" }
  | { type: "verify_redirect"; redirectUrl: string }
  | {
      type: "player"
      data: {
        id: string
        title: string
        slide_count: number
        slides: { number: number; title: string; bullets: string[]; narration: string }[]
        timings: { slideNumber: number; durationMs: number }[]
        total_duration_ms: number
        combined_audio_url: string
      }
      viewerId: string
      sessionToken: string
    }

export default function ViewPresentationPage() {
  const params = useParams<{ shareToken: string }>()
  const searchParams = useSearchParams()
  const shareToken = params.shareToken

  const [state, setState] = useState<PageState>({ type: "loading" })

  // Check for session token in URL (from magic link redirect)
  useEffect(() => {
    const sessionFromUrl = searchParams.get("session")
    if (sessionFromUrl) {
      // Validate the session and load player
      validateAndLoad(sessionFromUrl)
    } else {
      // Initial load — fetch presentation metadata
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

      // Password gate needed?
      if (data.has_password) {
        setState({ type: "password_gate" })
        return
      }

      // Email gate needed? (no password, but email gate enabled)
      if (data.email_gate_enabled) {
        setState({ type: "email_gate" })
        return
      }

      // No gate — load directly into player
      // But we need a viewer session. If no email gate, auto-create a viewer session
      loadPlayerFromFullData(data)
    } catch {
      setState({ type: "not_found" })
    }
  }

  async function validateAndLoad(sessionToken: string) {
    setState({ type: "loading" })

    try {
      const res = await fetch(`/api/view/${shareToken}?session=${sessionToken}`)
      const json = await res.json()

      if (!res.ok) {
        setState({ type: "verify_error" })
        return
      }

      // Verify the viewer session is valid
      const verifyRes = await fetch(`/api/view/${shareToken}/verify?vt=${sessionToken}`)
      const verifyJson = await verifyRes.json()

      if (!verifyRes.ok || verifyJson.error) {
        setState({ type: "verify_error" })
        return
      }

      // Session is valid, load player
      if (json.data) {
        setState({
          type: "player",
          data: json.data,
          viewerId: verifyJson.data.viewer_id,
          sessionToken: sessionToken,
        })
      }
    } catch {
      setState({ type: "verify_error" })
    }
  }

  function loadPlayerFromFullData(data: Record<string, unknown>) {
    // For no-gate mode, generate a viewer session client-side
    const tempSession = crypto.randomUUID()
    setState({
      type: "player",
      data: data as PageState & { type: "player" } extends never ? never : PageState extends { type: "player" } ? PageState["data"] : never,
      viewerId: tempSession,
      sessionToken: tempSession,
    })
  }

  function handlePasswordVerified() {
    // After password is verified, check if email gate is needed
    // Re-fetch to determine next step
    loadPresentation()
  }

  function handleEmailSent(data: { viewer_id: string; email: string }) {
    setState({ type: "email_sent", viewerId: data.viewer_id, email: data.email })
  }

  function handleVerifyRetry() {
    setState({ type: "email_gate" })
  }

  // No-gate: auto-create viewer
  function handleDirectPlay() {
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

    case "password_gate":
      return <PasswordGateDialog shareToken={shareToken} onVerified={handlePasswordVerified} />

    case "email_gate":
      return <EmailGateDialog shareToken={shareToken} onEmailSent={handleEmailSent} />

    case "email_sent":
      return <EmailSentScreen email={state.email} shareToken={shareToken} />

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
