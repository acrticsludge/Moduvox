import { Navbar } from "@/components/ui/Navbar"
import { Footer } from "@/components/landing/footer"

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#F9FAFB]">
      <Navbar />
      <section className="flex flex-1 items-center justify-center">
        <p className="text-sm text-[#71717A]">Dashboard coming soon.</p>
      </section>
      <Footer />
    </main>
  )
}
