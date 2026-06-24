import { cn } from "@/lib/utils";

type FeatureSectionProps = {
  heading: string;
  body: string;
  imageSrc: string;
  imageAlt: string;
  visualRight?: boolean;
  darker?: boolean;
};

export function FeatureSection({
  heading,
  body,
  imageSrc,
  imageAlt,
  visualRight = false,
  darker = false,
}: FeatureSectionProps) {
  return (
    <section className={cn(darker ? "bg-[#F3F4F6]" : "bg-[#F9FAFB]")}>
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Visual */}
          <div className={cn("lg:order-1", visualRight && "lg:order-2")}>
            <img
              src={imageSrc}
              alt={imageAlt}
              className="w-full rounded-xl border border-black/5 shadow-lg"
            />
          </div>

          {/* Text */}
          <div className={cn("lg:order-2", visualRight && "lg:order-1")}>
            <h2 className="text-balance font-semibold leading-[1.1] tracking-[-0.02em] text-[#18181B] [font-size:clamp(1.75rem,3vw,2.5rem)]">
              {heading}
            </h2>
            <p className="mt-5 max-w-[52ch] text-pretty text-lg leading-relaxed text-[#71717A]">
              {body}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
