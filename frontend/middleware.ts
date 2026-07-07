import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/presentations") ||
    pathname.startsWith("/api/projects") ||
    pathname.startsWith("/api/voices") ||
    pathname.startsWith("/api/generate") ||
    pathname.startsWith("/api/user");

  // Run session update (handles cookie refresh) for all matched routes
  const { response, user } = await updateSession(request);

  if (isProtectedRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/presentations/:path*",
    "/api/projects/:path*",
    "/api/voices/:path*",
    "/api/generate/:path*",
    "/api/user/:path*",
  ],
};
