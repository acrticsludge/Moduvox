import { Navbar } from "@/components/ui/Navbar"
import { FeaturesSection } from "@/components/landing/features-section"
import { Footer } from "@/components/landing/footer"

export default function FeaturesPage() {
  return (
    <main className="bg-[#F9FAFB] text-[#18181B]">
      <Navbar />
      <div className="pt-16" />
      <FeaturesSection />
      <Footer />
    </main>
  )
}
