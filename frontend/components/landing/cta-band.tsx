const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

export function CtaBand() {
  return (
    <section className="bg-[#F9FAFB]">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center px-4 py-28 text-center sm:px-6 lg:px-8 lg:py-36">
        <h2 className="max-w-[20ch] text-balance font-semibold leading-[1.1] tracking-[-0.02em] text-[#18181B] [font-size:clamp(2rem,4vw,3rem)]">
          Turn your next deck into a narrated training video.
        </h2>
        <div className="mt-8">
          <a
            href="#start"
            style={{ transitionTimingFunction: SPRING }}
            className="inline-block rounded-lg bg-[#18181B] px-6 py-3 text-base font-medium text-white transition-transform duration-200 hover:scale-[1.02] hover:bg-[#27272A] active:scale-[0.98]"
          >
            Start free
          </a>
        </div>
      </div>
    </section>
  );
}
