import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/landing/footer";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col bg-[#F9FAFB]">
      <Navbar />
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <span className="text-[64px] font-bold leading-none tracking-tighter text-[#18181B]">
          404
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#18181B]">
          Page not found
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#71717A]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-8 rounded-lg border border-[#18181B]/70 bg-[#18181B] px-5 py-2.5 text-sm font-medium text-white transition-all hover:border-[#18181B] hover:bg-[#27272A] active:scale-[0.98]"
        >
          Go home
        </Link>
      </div>
      <Footer />
    </main>
  );
}
