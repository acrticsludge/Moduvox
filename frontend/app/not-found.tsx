import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#18181B]">404</h1>
        <p className="mt-3 text-base text-[#71717A]">
          Page not found. The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="min-h-[48px] min-w-[48px] rounded-lg bg-[#18181B] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#27272A]"
          >
            Go home
          </Link>
          <Link
            href="/dashboard"
            className="min-h-[48px] min-w-[48px] rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-[#18181B] transition hover:bg-zinc-50"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
