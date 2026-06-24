import { Navbar } from "@/components/ui/Navbar"
import { Hero } from "@/components/landing/hero"
import { FeatureSection } from "@/components/landing/feature-section"
import { Footer } from "@/components/landing/footer"
import { UploadMockup } from "@/components/landing/mockups/upload-mockup"
import { CompareMockup } from "@/components/landing/mockups/compare-mockup"
import { AnalyticsMockup } from "@/components/landing/mockups/analytics-mockup"

export default function Home() {
  return (
    <main className="bg-[#F9FAFB] text-[#18181B]">
      <Navbar />
      <Hero />

      <FeatureSection
        heading="Upload, generate, share."
        body="Drop in your PowerPoint file and a 30-second voice sample. Our AI extracts speaker notes, writes natural narration, and clones your voice. Edit anything before it's final."
        visual={<UploadMockup />}
      />

      <FeatureSection
        heading="Change one slide. Update one slide."
        body="Updated a policy? Upload the revised deck. Only the changed slides get re-narrated. Your share link updates automatically. No re-recording the whole thing."
        visual={<CompareMockup />}
        visualRight
        darker
      />

      <FeatureSection
        heading="Know who actually watched."
        body="Require viewers to enter their email before watching. See completion rates, time spent, and who skipped. Export CSV reports for compliance audits."
        visual={<AnalyticsMockup />}
      />

      <Footer />
    </main>
  )
}
