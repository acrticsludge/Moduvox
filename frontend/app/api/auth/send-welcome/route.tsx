import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"
import { WelcomeEmail } from "@/emails/welcome"

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: user, error } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", userId)
      .single()

    if (error || !user) {
      console.error("[send-welcome] User not found:", userId)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://pulsemonitor.dev"}/dashboard`

    const result = await sendEmail({
      to: user.email,
      subject: `Welcome to Moduvox, ${user.name}!`,
      template: <WelcomeEmail userName={user.name} dashboardUrl={dashboardUrl} />,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ data: { sent: true } })
  } catch (err) {
    console.error("[send-welcome] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
