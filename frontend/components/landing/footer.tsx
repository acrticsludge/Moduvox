const linkGroups = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Smart Update", href: "#smart-update" },
      { label: "Viewer Tracking", href: "#viewer-tracking" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
  {
    heading: "Connect",
    links: [
      { label: "Email", href: "mailto:anubhavrai100@gmail.com" },
      { label: "Twitter / X", href: "https://x.com" },
      { label: "LinkedIn", href: "https://linkedin.com" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-[#18181B] text-white">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4 md:gap-8">
          <div className="md:pr-8">
            <span className="text-lg font-semibold tracking-tight text-white">Moduvox</span>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#71717A]">
              Turn slides into narrated training, in your voice.
            </p>
          </div>

          {linkGroups.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <h2 className="text-sm font-semibold text-white">{group.heading}</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-[#71717A] transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-1 sm:flex-row sm:justify-between">
            <p className="text-sm text-[#71717A]">
              2026 Moduvox. All rights reserved.
            </p>
            <p className="text-[11px] text-zinc-500">
              Powered by Gemini AI and VoxCPM
            </p>
            <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
              MVP v1.0.0
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
