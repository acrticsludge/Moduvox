"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Mic, Sparkles, Mail, BarChart3 } from "lucide-react";
import { BentoPlayer } from "./bento/BentoPlayer";
import { BentoDashboard } from "./bento/BentoDashboard";
import { BentoUpload } from "./bento/BentoUpload";
import { BentoEditor } from "./bento/BentoEditor";

const highlights = [
  {
    icon: Mic,
    name: "Voice Cloning",
    desc: "30-second sample creates a realistic clone of your voice.",
  },
  {
    icon: Sparkles,
    name: "AI Narration",
    desc: "Gemini generates natural narration from your slide notes.",
  },
  {
    icon: Mail,
    name: "Email Gate",
    desc: "Viewers verify before watching. You know who watched.",
  },
  {
    icon: BarChart3,
    name: "Viewer Dashboard",
    desc: "Completion rates, time spent, and CSV export for audits.",
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

        {/* Bento grid */}
        <div className="mt-16 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Player — hero cell */}
          <div className="lg:col-span-2">
            <BentoPlayer />
          </div>

          {/* Dashboard — top right */}
          <div className="lg:col-span-1">
            <BentoDashboard />
          </div>

          {/* Upload — bottom left */}
          <div className="lg:col-span-1">
            <BentoUpload />
          </div>

          {/* Editor — bottom right, wider */}
          <div className="lg:col-span-2">
            <BentoEditor />
          </div>
        </div>

        {/* Feature highlights row */}
        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {highlights.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.name}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100">
                    <Icon className="h-3.5 w-3.5 text-[#18181B]" />
                  </div>
                  <p className="text-sm font-semibold text-[#18181B]">
                    {feature.name}
                  </p>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#71717A]">
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA — only for logged-out users */}
        {!user && (
          <div className="mt-16 text-center">
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
