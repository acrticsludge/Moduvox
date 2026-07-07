import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Verify access — Moduvox",
  robots: "noindex",
}

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
    return <VerifyError />
  }

  // Check presentation expiration
  if (presentation.expires_at && new Date(presentation.expires_at) < new Date()) {
    return <VerifyError />
  }

  // Find the viewer by session_token
  const { data: viewer } = await supabase
    .from("viewers")
    .select("id, email_verified, verification_sent_at")
    .eq("session_token", vt)
    .eq("presentation_id", presentation.id)
    .single()

  if (!viewer) {
    return <VerifyError />
  }

  // If already verified, skip magic link expiry — viewer was verified through
  // another path (e.g. gate API when email gate is disabled)
  if (viewer.email_verified) {
    // Mark as viewed
    await supabase
      .from("viewers")
      .update({ viewed_at: new Date().toISOString() })
      .eq("id", viewer.id)

    // Redirect to the player with session token
    redirect(`/view/${shareToken}?session=${vt}`)
  }

  // Enforce 15-minute magic link expiry (only for unverified viewers)
  // Use verification_sent_at (updated on every upsert) instead of created_at
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000)
  if (viewer.verification_sent_at && new Date(viewer.verification_sent_at) < fifteenMinAgo) {
    return <VerifyError />
  }

  // Mark as verified
  await supabase
    .from("viewers")
    .update({
      email_verified: true,
      viewed_at: new Date().toISOString(),
    })
    .eq("id", viewer.id)

  // Redirect to the player with session token
  redirect(`/view/${shareToken}?session=${vt}`)
}

function VerifyError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-2 text-lg font-semibold text-[#18181B]">Link expired or invalid</h1>
        <p className="text-sm text-zinc-500">
          This verification link has expired or is no longer valid.
        </p>
        <p className="mt-4 text-sm text-zinc-500">
          Please contact the presentation owner to extend the link expiry or share a new one.
        </p>
      </div>
    </div>
  )
}
