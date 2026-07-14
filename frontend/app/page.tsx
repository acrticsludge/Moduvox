import { Navbar } from "@/components/ui/Navbar"
import { Hero } from "@/components/landing/hero"
import { FeatureSection } from "@/components/landing/feature-section"
import { Footer } from "@/components/landing/footer"
import { UploadMockup } from "@/components/landing/mockups/upload-mockup"
import { AnalyticsMockup } from "@/components/landing/mockups/analytics-mockup"

export default function Home() {
  return (
    <main className="bg-[#F9FAFB] text-[#18181B]">
      <Navbar />
      <Hero />

      <FeatureSection
        heading="See who's actually watching."
        body="See who opened your deck, how far they got, and how long they spent. Export a report to send a client or track engagement on your own."
        visual={<AnalyticsMockup />}
        darker
      />

      <FeatureSection
        heading="Upload, generate, share."
        body="Drop in your PowerPoint file and a 30-second voice sample. Our AI extracts speaker notes, writes natural narration, and clones your voice. Edit anything before it's final."
        visual={<UploadMockup />}
        darker
      />

      <Footer />
    </main>
  )
}
