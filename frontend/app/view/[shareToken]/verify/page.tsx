import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ shareToken: string }>
  searchParams: Promise<{ vt?: string }>
}) {
  const { shareToken } = await params
  const { vt } = await searchParams

  if (!vt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-2 text-lg font-semibold text-[#18181B]">Invalid link</h1>
          <p className="text-sm text-zinc-500">Missing verification token.</p>
        </div>
      </div>
    )
  }

  const supabase = await createClient()

  // Find the presentation by share_token
  const { data: presentation } = await supabase
    .from("presentations")
    .select("id, expires_at")
    .eq("share_token", shareToken)
    .single()

  if (!presentation) {
    return <VerifyError shareToken={shareToken} />
  }

  // Check presentation expiration
  if (presentation.expires_at && new Date(presentation.expires_at) < new Date()) {
    return <VerifyError shareToken={shareToken} />
  }

  // Find the viewer by session_token
  const { data: viewer } = await supabase
    .from("viewers")
    .select("id, email_verified, created_at")
    .eq("session_token", vt)
    .eq("presentation_id", presentation.id)
    .single()

  if (!viewer) {
    return <VerifyError shareToken={shareToken} />
  }

  // Enforce 15-minute magic link expiry
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000)
  if (viewer.created_at && new Date(viewer.created_at) < fifteenMinAgo) {
    return <VerifyError shareToken={shareToken} />
  }

  if (!viewer.email_verified) {
    // Mark as verified
    await supabase
      .from("viewers")
      .update({
        email_verified: true,
        viewed_at: new Date().toISOString(),
      })
      .eq("id", viewer.id)
  }

  // Redirect to the player with session token
  redirect(`/view/${shareToken}?session=${vt}`)
}

function VerifyError({ shareToken }: { shareToken: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-2 text-lg font-semibold text-[#18181B]">Link expired or invalid</h1>
        <p className="text-sm text-zinc-500">
          This verification link has expired or is no longer valid.
        </p>
        <a
          href={`/view/${shareToken}`}
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#18181B] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#27272A]"
        >
          Request New Link
        </a>
      </div>
    </div>
  )
}
