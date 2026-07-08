import type { Metadata } from "next"
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Terms of Service — Moduvox",
  robots: "noindex",
}

export default function TermsPage() {
  return (
    <main className="bg-[#F9FAFB]">
      <Navbar />
      <div className="mx-auto max-w-[720px] px-4 pt-32 pb-24 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[#18181B]">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-[#71717A]">Last updated: June 24, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-[#52525B]">
          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Moduvox, you agree to be bound by these Terms of Service. If you do
              not agree, do not use the service. Moduvox is provided by Moduvox Inc. (&quot;we,&quot; &quot;us,&quot; or
              &quot;our&quot;).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">2. Description of Service</h2>
            <p>
              Moduvox allows users to upload PowerPoint presentations and voice samples, and generates
              narrated presentations using AI-powered text-to-speech and voice cloning technology.
              The service includes hosted presentation playback, viewer tracking, and optional access
              controls such as email gating and password protection.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and
              for all activity that occurs under your account. You must provide accurate information
              when creating an account. You may not create accounts through unauthorized or automated
              means.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li>Upload content that violates any law or infringes third-party rights</li>
              <li>Clone a voice without the explicit consent of the person whose voice is being cloned</li>
              <li>Upload malicious files, attempt to breach security, or disrupt the service</li>
              <li>Create multiple accounts to circumvent usage limits or abuse the free tier</li>
              <li>Use the service to generate misleading, fraudulent, or harmful content</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">5. Voice Cloning Consent</h2>
            <p>
              You represent and warrant that any voice sample you upload is your own voice, or that you
              have obtained explicit written consent from the person whose voice is being cloned.
              Moduvox records the timestamp and IP address of your consent confirmation for compliance
              purposes. We reserve the right to suspend accounts that violate this policy.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">6. User Content &amp; Data</h2>
            <p>
              You retain ownership of all content you upload, including presentations, voice samples,
              and generated narration text. Moduvox does not claim ownership over your content. Your
              uploaded content is processed to generate the narrated presentation and may be stored
              temporarily to enable features such as Smart Update (comparing revised presentations).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">7. Viewer Data</h2>
            <p>
              When you enable email-gated tracking on a presentation, viewer information (name, email
              address, watch progress, and timestamps) is collected and made available to you through
              your dashboard. You are responsible for complying with applicable privacy laws regarding
              the collection and use of this data. Viewers should refer to our Privacy Policy for
              information about how their data is handled.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">8. Third-Party Services</h2>
            <p>
              Moduvox uses third-party AI services (including Google Gemini for text generation and
              Hugging Face for voice synthesis) to process your content. These services may have their
              own terms and data handling practices. By using Moduvox, you consent to your content
              being processed by these third-party services.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">9. Limitation of Liability</h2>
            <p>
              Moduvox is provided &quot;as is&quot; without warranties of any kind. To the maximum extent
              permitted by law, Moduvox shall not be liable for any indirect, incidental, or
              consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">10. Termination</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms, engage
              in abusive behavior, or pose a legal risk to the service. You may delete your account
              at any time. Upon termination, your content will be deleted within a reasonable period.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">11. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. Material changes will be notified via email
              or through the service. Continued use after changes take effect constitutes acceptance
              of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">12. Contact</h2>
            <p>
              For questions about these terms, contact us at{" "}
              <a href="mailto:anubhavrai100@gmail.com" className="text-[#18181B] underline underline-offset-2">
                here
              </a>
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
