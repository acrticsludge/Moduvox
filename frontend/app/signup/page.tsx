"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { FieldError } from "@/components/ui/ErrorBanner"
import { toastError } from "@/components/ui/CustomToast"

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void
      execute: (siteKey: string, opts: { action: string }) => Promise<string>
    }
  }
}

export default function SignupPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [googleLoading, setGoogleLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const recaptchaLoaded = useRef(false)
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    document.title = "Create an account — Moduvox";
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [success, router])

  // Load reCAPTCHA v3 script
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) return
    if (recaptchaLoaded.current) return
    if (document.querySelector('script[src*="recaptcha/api.js"]')) return
    recaptchaLoaded.current = true
    const script = document.createElement("script")
    script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  }, [])

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
    if (!acceptedTerms) errors.terms = "You must agree to the Terms of Service"
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setLoading(false)
      return
    }

    // Verify reCAPTCHA
    if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && window.grecaptcha) {
      try {
        const token = await new Promise<string>((resolve, reject) => {
          window.grecaptcha!.ready(async () => {
            try {
              const t = await window.grecaptcha!.execute(
                process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!,
                { action: "signup" },
              )
              resolve(t)
            } catch (e) { reject(e) }
          })
        })
        const verifyRes = await fetch("/api/auth/verify-captcha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })
        if (!verifyRes.ok) {
          toastError("Security check failed. Please try again.")
          setLoading(false)
          return
        }
      } catch {
        toastError("Security check failed. Please try again.")
        setLoading(false)
        return
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      toastError(error.message);
      setLoading(false);
      return;
    }

    // If no new identity was created, the user already exists
    if (!data?.user?.identities?.length) {
      toastError("An account with this email already exists. Please log in instead.");
      setLoading(false);
      return;
    }

    // Record ToS acceptance
    if (data.session?.access_token) {
      fetch("/api/auth/accept-terms", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      }).catch(() => {})
    }

    // Send welcome email (fire-and-forget)
    fetch("/api/auth/send-welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: data.user!.id }),
    }).catch(() => {})

    // Success! Show green glow then redirect
    setSuccess(true);
    setLoading(false);
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback` },
    });

    if (error) {
      toastError(error.message);
      setGoogleLoading(false);
    }
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
      <div className={`w-full max-w-sm rounded-xl border bg-white p-8 shadow-lg transition-all duration-300 ${
          success
            ? "border-green-500 shadow-[0_0_0_2px_#22c55e]"
            : error
              ? "border-red-300 shadow-[0_0_0_1px_#fca5a5]"
              : "border-zinc-200"
        }`}>
        {success ? (
          <div className="flex flex-col items-center py-16">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm text-[#71717A]">Account created. Redirecting to your dashboard...</p>
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-2xl font-semibold tracking-tight text-[#18181B]">
              Create your account
            </h1>
            <p className="mb-8 text-sm text-[#71717A]">
              Start turning slides into narrated training.
            </p>
            <form onSubmit={handleEmailSignup} className="space-y-4">
              <div>
                <label htmlFor="name" className="text-sm font-medium text-[#18181B]">Name</label>
                <input id="name" type="text" value={name}
                  onChange={(e) => { setName(e.target.value); setFieldErrors((prev) => ({ ...prev, name: "" })) }}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-800/20"
                  placeholder="Your name" />
                <FieldError message={fieldErrors.name} />
              </div>
              <div>
                <label htmlFor="email" className="text-sm font-medium text-[#18181B]">Email</label>
                <input id="email" type="email" required value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: "" })) }}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-800/20"
                  placeholder="you@company.com" />
                <FieldError message={fieldErrors.email} />
              </div>
              <div>
                <label htmlFor="password" className="text-sm font-medium text-[#18181B]">Password</label>
                <input id="password" type="password" required minLength={6} value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: "" })) }}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-[#18181B] placeholder:text-zinc-400 focus:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-800/20"
                  placeholder="At least 6 characters" />
                <FieldError message={fieldErrors.password} />
              </div>
              {/* ToS / Privacy agreement */}
              <div className="space-y-1">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => { setAcceptedTerms(e.target.checked); setFieldErrors((prev) => ({ ...prev, terms: "" })) }}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-[#18181B] focus:ring-zinc-500"
                  />
                  <span className="text-sm leading-relaxed text-zinc-600">
                    I agree to the{" "}
                    <Link href="/terms" target="_blank" className="font-medium text-[#18181B] underline underline-offset-2 hover:text-zinc-900">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" target="_blank" className="font-medium text-[#18181B] underline underline-offset-2 hover:text-zinc-900">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                <FieldError message={fieldErrors.terms} />
              </div>

              <button type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#18181B]/70 bg-[#18181B] px-4 py-2.5 text-sm font-medium text-white transition-all hover:border-[#18181B] hover:bg-[#27272A] active:scale-[0.98] disabled:opacity-50">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</> : "Create account"}
              </button>
            </form>
            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-zinc-200" />
              <span className="text-xs text-zinc-400">or</span>
              <span className="h-px flex-1 bg-zinc-200" />
            </div>
            <button onClick={handleGoogleLogin} disabled={googleLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-[#18181B] transition-all hover:bg-[#F9FAFB] active:scale-[0.98] disabled:opacity-50">
              {googleLoading ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Redirecting...</span>
              ) : (
                <span className="flex items-center gap-2"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
              </span>
              )}
            </button>
            <p className="mt-6 text-center text-sm text-[#71717A]">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-[#18181B] hover:underline">Log in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
