import type { Metadata } from "next"
import { Navbar } from "@/components/ui/Navbar"
import { PricingSection } from "@/components/landing/pricing-section"
import { Footer } from "@/components/landing/footer"

export const metadata: Metadata = {
  title: "Pricing — Moduvox",
  description: "Simple pricing for narrated presentations. Free to start, affordable to scale.",
}

export default function PricingPage() {
  return (
    <main className="bg-[#F9FAFB] text-[#18181B]">
      <Navbar />
      <div className="pt-16" />
      <PricingSection />
      <Footer />
    </main>
  )
}
