import { Navbar } from "@/components/ui/Navbar"
import { Hero } from "@/components/landing/hero"
import { FeatureSection } from "@/components/landing/feature-section"
import { CtaBand } from "@/components/landing/cta-band"
import { Footer } from "@/components/landing/footer"

export default function Home() {
  return (
    <main className="bg-[#F9FAFB] text-[#18181B]">
      <Navbar />
      <Hero />

      <FeatureSection
        heading="Upload, generate, share."
        body="Drop in your PowerPoint file and a 30-second voice sample. Our AI extracts speaker notes, writes natural narration, and clones your voice. Edit anything before it's final."
        imageSrc="/landing/moduvox-upload.png"
        imageAlt="Moduvox upload screen with a drop zone for a PPTX file and a voice sample recorder"
      />

      <FeatureSection
        heading="Change one slide. Update one slide."
        body="Updated a policy? Upload the revised deck. Only the changed slides get re-narrated. Your share link updates automatically. No re-recording the whole thing."
        imageSrc="/landing/moduvox-compare.png"
        imageAlt="Before and after comparison of presentation slides with the changed slide highlighted"
        visualRight
        darker
      />

      <FeatureSection
        heading="Know who actually watched."
        body="Require viewers to enter their email before watching. See completion rates, time spent, and who skipped. Export CSV reports for compliance audits."
        imageSrc="/landing/moduvox-analytics.png"
        imageAlt="Moduvox analytics dashboard showing a viewer report table with completion rates"
      />

      <CtaBand />
      <Footer />
    </main>
  )
}
