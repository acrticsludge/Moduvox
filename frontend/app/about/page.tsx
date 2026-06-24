import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/landing/footer";

export default function AboutPage() {
  return (
    <main className="bg-[#F9FAFB]">
      <Navbar />
      <div className="mx-auto max-w-[640px] px-4 pt-32 pb-24 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[#18181B]">
          About Moduvox
        </h1>

        <section className="mt-10 space-y-6 text-sm leading-relaxed text-[#52525B]">
          <p>
            Moduvox turns PowerPoint decks into narrated training videos. Upload a slide
            deck, record a short voice sample, and get a complete narrated presentation
            in your own voice — with a shareable link and proof of who watched it.
          </p>

          <p>
            The idea came from a friend&apos;s suggestion: turn slides into narrated
            presentations automatically. After validating it on Reddit, the focus
            narrowed to IT and HR teams — the people who create the most training
            content and feel the pain of manual narration most acutely.
          </p>

          <p>
            The core insight was simple: IT and HR teams spend hours creating slide
            decks for training, but the step from &quot;deck is done&quot; to &quot;deck is
            narrated and shared&quot; is still painfully manual. You either record yourself
            slide by slide (mistakes, retakes, background noise), or you send a PDF and
            hope people read it. Neither works well.
          </p>

          <p>
            Moduvox solves three specific problems:
          </p>

          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Narration takes too long.</strong> AI generates natural narration
              from your existing slide notes. You review and edit before audio is made.
            </li>
            <li>
              <strong>Updating one slide means redoing everything.</strong> Smart Update
              detects changes and only re-narrates what changed. Your link stays the same.
            </li>
            <li>
              <strong>No way to know who actually watched.</strong> Email-gated tracking
              shows completion rates, time spent, and exports CSV reports for compliance.
            </li>
          </ul>

          <p>
            Built by a solo developer. No VC funding. Just a tool that should exist.
          </p>
        </section>

        <div className="mt-10 border-t border-zinc-200 pt-8">
          <p className="text-sm text-[#71717A]">
            Questions?{" "}
            <a href="mailto:anubhavrai100@gmail.com" className="text-[#18181B] underline underline-offset-2">
              anubhavrai100@gmail.com
            </a>
          </p>
        </div>

      </div>
      <Footer />
    </main>
  );
}
