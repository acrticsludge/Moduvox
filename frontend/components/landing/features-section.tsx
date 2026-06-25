"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Upload, FileText, Mic, Speaker, Edit3, Smile, Music, Play, Mail, BarChart3, Link, RotateCcw, Shield } from "lucide-react";

const featureGroups = [
  {
    title: "Upload & Generate",
    features: [
      {
        icon: Upload,
        name: "PPTX Upload & Parsing",
        desc: "Drop in any .pptx file. We extract every slide, speaker notes, and text — no formatting lost.",
      },
      {
        icon: FileText,
        name: "AI Narration Generation",
        desc: "Send slide notes to Gemini AI. It writes natural, conversational narration so you don't have to.",
      },
      {
        icon: Mic,
        name: "Voice Cloning",
        desc: "Record a 30-second voice sample. We clone it and synthesize the narration in your voice.",
      },
      {
        icon: Speaker,
        name: "Preset AI Voices",
        desc: "No microphone? Pick from built-in preset voices and still get a professional result.",
      },
    ],
  },
  {
    title: "Edit & Refine",
    features: [
      {
        icon: Edit3,
        name: "Slide-by-Slide Editor",
        desc: "Review each slide's narration one by one. Edit text, fix tone, and preview before finalizing.",
      },
      {
        icon: Smile,
        name: "Emotion Control",
        desc: "12 emotions — excited, calm, angry, whisper, and more. Change delivery per slide, not just words.",
      },
      {
        icon: Music,
        name: "Audio Assembly",
        desc: "Per-slide audio is stitched together seamlessly. No clicks, no dead air, no manual syncing.",
      },
    ],
  },
  {
    title: "Share & Track",
    features: [
      {
        icon: Play,
        name: "Hosted Player",
        desc: "A dedicated page for each presentation. Slides auto-advance in sync with your narration.",
      },
      {
        icon: Mail,
        name: "Email-Gated Tracking",
        desc: "Viewers enter their email before watching. You know exactly who watched and for how long.",
      },
      {
        icon: BarChart3,
        name: "Viewer Dashboard & CSV",
        desc: "See completion rates, time spent, and status per viewer. Export a CSV for compliance audits.",
      },
      {
        icon: Link,
        name: "Shareable Link + Password",
        desc: "Get a unique URL per presentation. Optionally protect it with a password — like a Google Doc.",
      },
    ],
  },
  {
    title: "Smarter Updates",
    features: [
      {
        icon: RotateCcw,
        name: "Smart Update",
        desc: "Upload a revised PPTX. Only the changed slides get re-narrated. Your existing link stays the same.",
      },
      {
        icon: Shield,
        name: "Free Tier Included",
        desc: "Up to 15 presentations, 3 per day, 1 voice clone. Email verification and reCAPTCHA keep things safe.",
      },
    ],
  },
];

export function FeaturesSection() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, [supabase]);

  return (
    <section className="bg-[#F9FAFB]">
      <div className="mx-auto max-w-[1400px] px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-semibold leading-[1.1] tracking-[-0.02em] text-[#18181B] [font-size:clamp(1.75rem,3.5vw,2.5rem)]">
            Everything you need to turn slides into training.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[#71717A]">
            No recording. No editing. No re-recording when something changes.
          </p>
        </div>

        {/* Feature groups */}
        <div className="mt-16 space-y-20">
          {featureGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-8 text-sm font-semibold uppercase tracking-widest text-[#71717A]">
                {group.title}
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {group.features.map((feature) => (
                  <div
                    key={feature.name}
                    className="rounded-xl border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md"
                  >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                      <feature.icon className="h-5 w-5 text-[#18181B]" />
                    </div>
                    <h4 className="text-sm font-semibold text-[#18181B]">{feature.name}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-[#71717A]">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA — only shown to logged-out users */}
        {!user && (
          <div className="mt-24 text-center">
            <p className="text-lg text-[#71717A]">
              All features included in the Free tier.
            </p>
            <a
              href="/signup"
              className="mt-4 inline-block rounded-lg border border-[#18181B]/70 bg-[#18181B] px-6 py-3 text-base font-medium text-white transition-transform duration-200 hover:scale-[1.02] hover:border-[#18181B] hover:bg-[#27272A] active:scale-[0.98]"
            >
              Get started free
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
