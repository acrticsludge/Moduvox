"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    document.title = "Create an account — Moduvox";
  }, []);

  // If already logged in, go to dashboard
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.push("/dashboard");
      } else {
        setCheckingAuth(false);
      }
    });
  }, [router, supabase]);

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    const errors: Record<string, string> = {}
    if (!name.trim()) errors.name = "Name is required"
    if (!email.trim()) errors.email = "Email is required"
    if (!password) errors.password = "Password is required"
    else if (password.length < 6) errors.password = "Password must be at least 6 characters"
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleGoogleLogin() {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback` },
    });

    if (error) setError(error.message);
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
        <div className="w-full max-w-sm animate-pulse rounded-xl border border-zinc-200 bg-white p-8 shadow-lg">
          <div className="mb-1 h-7 w-40 rounded bg-zinc-100" />
          <div className="mb-8 h-4 w-56 rounded bg-zinc-100" />
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 h-4 w-10 rounded bg-zinc-100" />
              <div className="h-10 w-full rounded-lg bg-zinc-100" />
            </div>
            <div>
              <div className="mb-1.5 h-4 w-10 rounded bg-zinc-100" />
              <div className="h-10 w-full rounded-lg bg-zinc-100" />
            </div>
            <div>
              <div className="mb-1.5 h-4 w-16 rounded bg-zinc-100" />
              <div className="h-10 w-full rounded-lg bg-zinc-100" />
            </div>
            <div className="h-10 w-full rounded-lg bg-zinc-100" />
          </div>
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-zinc-100" />
            <span className="h-3 w-4 rounded bg-zinc-100" />
            <span className="h-px flex-1 bg-zinc-100" />
          </div>
          <div className="h-10 w-full rounded-lg bg-zinc-100" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-lg">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-[#18181B]">
          Create your account
        </h1>
        <p className="mb-8 text-sm text-[#71717A]">
          Start turning slides into narrated training.
        </p>

        <form onSubmit={handleEmailSignup} className="space-y-4">
          <div>
            <label htmlFor="name" className="text-sm font-medium text-[#18181B]">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setFieldErrors((prev) => ({ ...prev, name: "" }))
              }}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-800/20"
              placeholder="Your name"
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="text-sm font-medium text-[#18181B]">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setFieldErrors((prev) => ({ ...prev, email: "" }))
              }}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-800/20"
              placeholder="you@company.com"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-medium text-[#18181B]">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setFieldErrors((prev) => ({ ...prev, password: "" }))
              }}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-800/20"
              placeholder="At least 6 characters"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border border-[#18181B]/70 bg-[#18181B] px-4 py-2.5 text-sm font-medium text-white transition-all hover:border-[#18181B] hover:bg-[#27272A] active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-zinc-200" />
          <span className="text-xs text-zinc-400">or</span>
          <span className="h-px flex-1 bg-zinc-200" />
        </div>

        <button
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-[#18181B] transition-all hover:bg-[#F9FAFB] active:scale-[0.98]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-[#71717A]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#18181B] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
