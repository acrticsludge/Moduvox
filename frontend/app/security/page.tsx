import type { Metadata } from "next"
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Security — Moduvox",
  description: "How Moduvox protects your data: encryption, storage, retention, and third-party processing.",
  robots: "noindex",
}

export default function SecurityPage() {
  return (
    <main className="bg-[#F9FAFB]">
      <Navbar />
      <div className="mx-auto max-w-[720px] px-4 pt-32 pb-24 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[#18181B]">
          Security & Trust
        </h1>
        <p className="mt-2 text-sm text-[#71717A]">
          Last updated: July 13, 2026
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-[#52525B]">

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">Overview</h2>
            <p className="mb-2">
              Moduvox processes sensitive data: uploaded PowerPoint files, voice samples for AI
              cloning, generated narration text and audio, and viewer engagement data. This page
              describes how each type of data is stored, encrypted, retained, and deleted.
            </p>
            <p>
              We believe in being transparent about what we actually do today, not what we plan
              to do. Where we identify gaps in our current implementation, we note them below.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">1. Data Storage</h2>

            <h3 className="mb-1.5 text-sm font-semibold text-[#18181B]">Voice Samples</h3>
            <p className="mb-2">
              Voice samples are uploaded directly from your browser to Cloudflare R2 object
              storage using time-limited presigned URLs (1-hour expiry). The audio file never
              passes through our application server. File paths are structured as
              <code className="mx-1 rounded bg-zinc-100 px-1 py-0.5 text-[#18181B]">{`{userId}/{uuid}.{ext}`}</code>
              in the <code className="mx-1 rounded bg-zinc-100 px-1 py-0.5 text-[#18181B]">moduvox-audio</code> R2 bucket.
            </p>
            <p className="mb-2">
              When you generate a voice clone, the sample is sent to our TTS provider
              (HuggingFace or a self-hosted inference server) for processing. The generated
              narration audio is returned and stored in R2. The TTS provider does not retain
              the voice sample after processing.
            </p>
            <p className="mb-2">
              <strong>Consent tracking:</strong> When you clone a voice, we record your consent
              (timestamp, IP address, and user agent) alongside the voice record. This data is
              stored in the database and used to demonstrate that informed consent was obtained.
            </p>

            <h3 className="mb-1.5 mt-4 text-sm font-semibold text-[#18181B]">Uploaded Presentations</h3>
            <p className="mb-2">
              PowerPoint files are uploaded directly to R2 at
              <code className="mx-1 rounded bg-zinc-100 px-1 py-0.5 text-[#18181B]">{`{userId}/{presentationId}.pptx`}</code>.
              After upload, a stateless worker converts the PPTX to per-slide PDFs stored at
              <code className="mx-1 rounded bg-zinc-100 px-1 py-0.5 text-[#18181B]">{`{userId}/pdf/{presId}/slide-{N}.pdf`}</code>.
              The worker runs in an isolated Docker container and cleans up all temporary files
              after each conversion.
            </p>
            <p className="mb-2">
              Generated narration audio is stored as per-slide WAV files and a combined WAV
              at <code className="mx-1 rounded bg-zinc-100 px-1 py-0.5 text-[#18181B]">{`{userId}/audio/{presId}/`}</code>.
            </p>

            <h3 className="mb-1.5 mt-4 text-sm font-semibold text-[#18181B]">Viewer Data</h3>
            <p>
              When viewers access a shared presentation with email gating, we collect their
              name, email address, IP address, and user agent. Tracking events (opens, progress
              updates, completions, closes) are stored with timestamps and associated with the
              viewer record. Presentation owners can see aggregated viewer data (names, emails,
              progress, time spent) in their dashboard.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">2. Encryption</h2>

            <h3 className="mb-1.5 text-sm font-semibold text-[#18181B]">In Transit</h3>
            <p className="mb-2">
              All data transmitted between your browser and Moduvox is encrypted via HTTPS/TLS.
              Vercel (our hosting provider) terminates TLS at the edge. All communication with
              Cloudflare R2, Supabase, and third-party APIs uses HTTPS. The PPTX conversion
              worker on Railway is accessible only via HTTPS.
            </p>

            <h3 className="mb-1.5 mt-4 text-sm font-semibold text-[#18181B]">At Rest</h3>
            <p className="mb-2">
              Cloudflare R2 provides default AES-256 server-side encryption for all stored objects
              (voice samples, audio files, PDFs). Your Gemini API key (if provided) is encrypted
              at rest in the database using AES-256-GCM with a server-side key. Share link
              passwords are hashed using bcrypt with 12 salt rounds.
            </p>
            <p className="mb-2">
              <strong>What is not encrypted at rest:</strong> User email addresses, viewer email
              addresses, IP addresses, presentation content, narration text, and other application
              data are stored as plaintext in the database. Row-Level Security (RLS) policies
              restrict access to this data at the database level — only authenticated users can
              access their own data, and RLS is enabled on every table.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">3. Data Retention & Deletion</h2>

            <h3 className="mb-1.5 text-sm font-semibold text-[#18181B]">Voice Samples</h3>
            <p className="mb-2">
              When you delete a voice clone from your dashboard, the voice sample file is
              immediately removed from R2 and the database record is deleted. Preview audio
              files are cleaned up when you delete your account but not when you delete an
              individual voice (we track this as a known gap).
            </p>

            <h3 className="mb-1.5 mt-4 text-sm font-semibold text-[#18181B]">Presentations & Audio</h3>
            <p className="mb-2">
              Deleting a presentation removes the PowerPoint file from R2 and cascade-deletes
              associated database records (viewers, events, narration versions, audit log) via
              foreign key constraints. Per-slide PDFs and audio files remain in R2 after
              presentation deletion — we are actively working on adding cleanup for these.
            </p>

            <h3 className="mb-1.5 mt-4 text-sm font-semibold text-[#18181B]">Account Deletion</h3>
            <p className="mb-2">
              You can delete your account from Settings. This removes your user record,
              all projects, presentations, voices, viewer data, and waitlist entries from the
              database via cascade deletes. Voice sample files are cleaned up from R2. Voice
              clone consent records are deleted with the voice records.
            </p>
            <p className="mb-2">
              <strong>Known gap:</strong> Account deletion does not currently clean up
              presentation-related R2 files (PPTX files, per-slide PDFs, and audio files).
              These remain in storage as orphaned objects. We are working on adding full R2
              cleanup to the account deletion flow.
            </p>

            <h3 className="mb-1.5 mt-4 text-sm font-semibold text-[#18181B]">Viewer Data</h3>
            <p>
              Viewer tracking data is retained as long as the associated presentation exists.
              When a presentation is deleted, viewer records and events are cascade-deleted
              from the database. There is currently no self-service mechanism for viewers
              to request deletion of their own data — please contact
              <a href="mailto:anubhavrai100@gmail.com" className="mx-1 text-[#18181B] underline">anubhavrai100@gmail.com</a>
              for manual processing.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">4. Third-Party Data Processing</h2>
            <p className="mb-2">Moduvox shares data with the following service providers:</p>

            <div className="space-y-3">
              <div className="rounded-lg border border-zinc-200 bg-white p-3.5">
                <p className="font-medium text-[#18181B]">Cloudflare R2</p>
                <p className="mt-0.5 text-xs">
                  All file storage (voice samples, audio files, PDFs). AES-256 encryption at rest.
                  Data distributed globally via Cloudflare's edge network.
                </p>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-3.5">
                <p className="font-medium text-[#18181B]">HuggingFace / Self-Hosted Inference</p>
                <p className="mt-0.5 text-xs">
                  Voice cloning and audio generation. Receives voice sample audio and narration
                  text during processing. Samples are not retained after processing.
                </p>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-3.5">
                <p className="font-medium text-[#18181B]">Google Gemini</p>
                <p className="mt-0.5 text-xs">
                  Narration text generation. Receives slide titles and bullet points when
                  generating narration scripts. You can provide your own API key in Settings
                  to use your own Gemini quota.
                </p>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-3.5">
                <p className="font-medium text-[#18181B]">Supabase</p>
                <p className="mt-0.5 text-xs">
                  Database, authentication, Row-Level Security. All structured data resides in
                  Supabase Postgres on AWS US-East. Encrypted at rest and in transit.
                </p>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-3.5">
                <p className="font-medium text-[#18181B]">Resend</p>
                <p className="mt-0.5 text-xs">
                  Transactional email delivery (welcome emails, magic links, feedback
                  notifications). Receives recipient name and email address.
                </p>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-3.5">
                <p className="font-medium text-[#18181B]">Sentry (Germany)</p>
                <p className="mt-0.5 text-xs">
                  Error monitoring. May receive error context including request payloads.
                  Data processed in Sentry's German region (GDPR-compliant).
                </p>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-3.5">
                <p className="font-medium text-[#18181B]">Vercel + Railway</p>
                <p className="mt-0.5 text-xs">
                  Application hosting (Vercel) and PPTX conversion worker (Railway).
                  All data passes through these providers' networks in transit.
                </p>
              </div>
            </div>

            <p className="mt-3">
              Each provider is bound by data processing agreements. Your data is processed
              only for the purposes described on this page and in our
              <a href="/privacy" className="mx-1 text-[#18181B] underline">Privacy Policy</a>.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">5. User Controls</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Delete a voice clone:</strong> Go to My Voices, click the delete icon.
                Voice sample and database record are removed immediately.
              </li>
              <li>
                <strong>Delete a presentation:</strong> Open the presentation menu and select
                Delete. The PPTX file and all associated database records are removed.
              </li>
              <li>
                <strong>Delete your account:</strong> Go to Settings &gt; Delete Account.
                Your user data, projects, presentations, voices, and viewer data are removed.
              </li>
              <li>
                <strong>Use your own Gemini key:</strong> Go to Settings to provide your own
                API key. Narration generation will use your quota instead of the shared key.
              </li>
              <li>
                <strong>Expire a shared link:</strong> Set an expiration date in Share Settings.
                Viewers will see a 410 error after the expiration date.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">6. Access Controls</h2>
            <p className="mb-2">
              Row-Level Security (RLS) is enabled on all database tables. Users can only access
              their own data through RLS policies enforced at the database level. Shared
              presentations are protected by:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mb-3">
              <li>A unique, unguessable share token (UUID v4)</li>
              <li>Optional bcrypt-hashed password protection</li>
              <li>Optional email gating with 15-minute magic link expiry</li>
              <li>Optional presentation expiration date</li>
            </ul>
            <p>
              Viewer tracking is rate-limited (100 events/minute/presentation) and gated by
              session tokens validated server-side before any event is recorded.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">7. What We Are Working On</h2>
            <p className="mb-2">
              We track our security posture openly. These are the known gaps we are actively
              addressing:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Automatic cleanup of orphaned R2 files (PDFs, audio) on presentation and account deletion</li>
              <li>Security headers (HSTS, CSP, X-Frame-Options) on all responses</li>
              <li>Preview audio cleanup on individual voice deletion</li>
              <li>Audit log viewer for account owners</li>
              <li>Viewer self-service data export and deletion</li>
              <li>Data retention limits on tracking events and email logs</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[#18181B]">8. Reporting a Vulnerability</h2>
            <p>
              If you discover a security issue, please email
              <a href="mailto:anubhavrai100@gmail.com" className="mx-1 text-[#18181B] underline">anubhavrai100@gmail.com</a>.
              We will acknowledge receipt within 48 hours and work to address the issue promptly.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  )
}
