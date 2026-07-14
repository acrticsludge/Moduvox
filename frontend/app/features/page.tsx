import type { Metadata } from "next"
import { Navbar } from "@/components/ui/Navbar"
import { FeatureSection } from "@/components/landing/feature-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { Footer } from "@/components/landing/footer"
import { CompareMockup } from "@/components/landing/mockups/compare-mockup"

export const metadata: Metadata = {
  title: "Features — Moduvox",
  description: "Explore Moduvox features: AI narration, voice cloning, slide editing, viewer analytics, and team sharing.",
}

export default function FeaturesPage() {
  return (
    <main className="bg-[#F9FAFB] text-[#18181B]">
      <Navbar />
      <div className="pt-16" />
      <FeaturesSection />

      <FeatureSection
        heading="Change one slide. Update one slide."
        body="Updated a policy? Upload the revised deck. Only the changed slides get re-narrated. Your share link updates automatically. No re-recording the whole thing."
        visual={<CompareMockup />}
        visualRight
      />

      <Footer />
    </main>
  )
}
