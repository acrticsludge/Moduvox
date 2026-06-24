import { Navbar } from "@/components/ui/Navbar"
import { PricingSection } from "@/components/landing/pricing-section"
import { Footer } from "@/components/landing/footer"

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
