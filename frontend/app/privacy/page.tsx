import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/landing/footer";

export default function PrivacyPage() {
  return (
    <main className="bg-[#F9FAFB]">
      <Navbar />
      <div className="mx-auto max-w-[720px] px-4 pt-32 pb-24 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[#18181B]">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-[#71717A]">Last updated: June 24, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-[#52525B]">
          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">1. What We Collect</h2>
            <p className="mb-2">We collect the following information when you use Moduvox:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Account information:</strong> Name, email address, and password
                (stored securely via Supabase Auth). If you sign in with Google, we receive
                your name and email from your Google account.
              </li>
              <li>
                <strong>Uploaded content:</strong> PowerPoint files, voice samples, and any
                narration text you provide or generate. These are processed to create your
                narrated presentations and are stored temporarily to enable features like
                Smart Update.
              </li>
              <li>
                <strong>Viewer data:</strong> When you enable email-gated viewing, we collect
                viewer names, email addresses, watch progress (including per-slide completion),
                and time spent per presentation.
              </li>
              <li>
                <strong>Usage data:</strong> Presentation count, feature usage, and basic
                analytics to improve the service.
              </li>
              <li>
                <strong>Technical data:</strong> IP address, browser type, device information,
                and pages visited (via Vercel Analytics).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">2. How We Use Your Data</h2>
            <p className="mb-2">We use your data to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Generate narrated presentations from your uploaded slides and voice samples</li>
              <li>Display viewer analytics and reports in your dashboard</li>
              <li>Authenticate your account and provide customer support</li>
              <li>Improve the service through aggregated usage analysis</li>
              <li>Send transactional emails (password reset, account verification)</li>
              <li>Detect and prevent abuse of the service</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">3. Voice Samples &amp; Cloning</h2>
            <p>
              Voice samples you upload are used exclusively to generate the narrated presentation
              you request. Samples are sent to our TTS provider (VoxCPM2 via HuggingFace) for
              processing and are not stored permanently on Moduvox servers after generation is
              complete. We record the timestamp and IP address of your consent confirmation.
              We do not share your voice samples with third parties for any purpose other than
              providing the service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">4. AI Processing</h2>
            <p>
              Your slide notes and content are sent to Google Gemini for narration text generation
              and to HuggingFace for voice synthesis. These third-party AI services process your
              content solely for the purpose of generating your requested output. We do not use
              your content to train AI models. Review the privacy policies of Google Gemini and
              HuggingFace for their data handling practices.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">5. Data Sharing</h2>
            <p className="mb-2">We do not sell your personal data. We may share data with:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Service providers:</strong> Supabase (database &amp; auth), Resend
                (email), Vercel (hosting), Google Gemini (AI), HuggingFace (AI) — each bound
                by data processing agreements.
              </li>
              <li>
                <strong>Legal compliance:</strong> If required by law or to protect our
                rights, we may disclose information to regulatory authorities.
              </li>
              <li>
                <strong>Presentation viewers:</strong> If you enable email-gated tracking,
                viewer data (name, email, watch progress) is shared with the presentation
                owner through their dashboard.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">6. Data Retention</h2>
            <p>
              We retain your account information for as long as your account is active. Uploaded
              content (PPTX files, generated audio) is retained to enable Smart Update
              functionality. Viewer tracking data is retained as long as the associated
              presentation exists. You may delete your account at any time, which will trigger
              deletion of your stored content within 30 days. Voice samples are deleted shortly
              after processing.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">7. Cookies &amp; Tracking</h2>
            <p>
              We use essential cookies for authentication (session management via Supabase)
              and analytics (Vercel Analytics, which uses anonymized data). We do not use
              tracking cookies for advertising. You can control cookies through your browser
              settings, but disabling essential cookies may prevent the service from functioning
              correctly.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">8. Security</h2>
            <p>
              We implement industry-standard security measures including HTTPS encryption,
              database-level access controls (Row Level Security), and AES-256 encryption for
              stored secrets. However, no service is 100% secure, and we cannot guarantee
              absolute security.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">9. Your Rights</h2>
            <p className="mb-2">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Access the personal data we hold about you</li>
              <li>Request correction or deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent for processing (where consent is the legal basis)</li>
              <li>Lodge a complaint with your local data protection authority</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, contact us at{" "}
              <a href="mailto:anubhavrai100@gmail.com" className="text-[#18181B] underline underline-offset-2">
                here
              </a>.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">10. Third-Party Links</h2>
            <p>
              The service may contain links to third-party websites (e.g., HuggingFace, Google).
              We are not responsible for the privacy practices of these third parties.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes will be
              notified via email or through the service. Continued use after changes take
              effect constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">12. Contact</h2>
            <p>
              For privacy-related inquiries:{" "}
              <a href="mailto:anubhavrai100@gmail.com" className="text-[#18181B] underline underline-offset-2">
                here
              </a>
            </p>
            <p className="mt-1">
              General inquiries:{" "}
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
