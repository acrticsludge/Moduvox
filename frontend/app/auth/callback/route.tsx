import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { WelcomeEmail } from "@/emails/welcome";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Detect new user: check if the user has zero identities, meaning they
      // were just created by this OAuth flow (first sign-in).
      // Using identities.length is more reliable than comparing timestamps
      // because exchangeCodeForSession may update last_sign_in_at.
      const isNewUser =
        user &&
        (user.identities?.length ?? 0) === 0;

      if (isNewUser && user?.email) {
        const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || origin}/dashboard`;
        sendEmail({
          to: user.email,
          subject: `Welcome to Moduvox, ${user.user_metadata?.full_name || "there"}!`,
          template: (
            <WelcomeEmail
              userName={user.user_metadata?.full_name || "there"}
              dashboardUrl={dashboardUrl}
            />
          ),
        }).catch((err) => console.error("[callback] Welcome email failed:", err));
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
