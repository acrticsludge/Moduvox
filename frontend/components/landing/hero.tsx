"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { SlideThumbnail } from "./mockups/slide-thumbnail";
import { EditorMockup } from "./mockups/editor-mockup";

const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

export function Hero() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, [supabase]);

  return (
    <section className="mx-auto max-w-[1400px] px-4 pb-20 pt-36 sm:px-6 lg:px-8 lg:pt-44">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[50%_50%]">
        {/* Text block */}
        <div>
          <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-balance font-semibold leading-[1.05] tracking-[-0.03em] text-[#18181B] [font-size:clamp(2.5rem,5vw,4rem)]">
            <span>Your slides.</span>
            <span>Your voice. No recording.</span>
          </h1>
          <p className="mt-6 max-w-[58ch] text-pretty text-lg leading-relaxed text-[#71717A]">
            Upload a PPTX, clone your voice in 30 seconds, and get a complete
            narrated presentation with proof of who watched it.
          </p>
          <div className="mt-8">
            {user ? (
              <a
                href="/dashboard"
                className="inline-block rounded-lg border border-[#18181B]/70 bg-[#18181B] px-6 py-3 text-base font-medium text-white transition-transform duration-200 hover:scale-[1.02] hover:border-[#18181B] hover:bg-[#27272A] active:scale-[0.98]"
              >
                Dashboard
              </a>
            ) : (
              <a
                href="/signup"
                style={{ transitionTimingFunction: SPRING }}
                className="inline-block rounded-lg border border-[#18181B]/70 bg-[#18181B] px-6 py-3 text-base font-medium text-white transition-transform duration-200 hover:scale-[1.02] hover:border-[#18181B] hover:bg-[#27272A] active:scale-[0.98]"
              >
                Start free
              </a>
            )}
          </div>
        </div>

        {/* Product visual */}
        <div className="lg:justify-self-end">
          <EditorMockup />
        </div>
      </div>
    </section>
  );
}
