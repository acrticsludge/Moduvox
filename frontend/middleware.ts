import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    const isProtectedRoute =
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/api/presentations") ||
      pathname.startsWith("/api/projects") ||
      pathname.startsWith("/api/voices") ||
      pathname.startsWith("/api/generate") ||
      pathname.startsWith("/api/user") ||
      pathname.startsWith("/api/waitlist");

    // Run session update (handles cookie refresh) for all matched routes
    const { response, user } = await updateSession(request);

    if (isProtectedRoute && !user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Add security headers
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
    response.headers.set(
      "X-Content-Type-Options",
      "nosniff"
    );
    response.headers.set(
      "X-Frame-Options",
      "DENY"
    );
    response.headers.set(
      "Referrer-Policy",
      "strict-origin-when-cross-origin"
    );

    return response;
  } catch {
    // If middleware throws (e.g. missing env vars, Supabase down),
    // fail closed — redirect to login instead of letting the request through
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/presentations/:path*",
    "/api/projects/:path*",
    "/api/voices/:path*",
    "/api/generate/:path*",
    "/api/user/:path*",
    "/api/waitlist/:path*",
  ],
};
