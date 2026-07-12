import { ImageResponse } from "next/og"

export const runtime = "edge"

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F9FAFB",
          fontFamily: "Geist, Inter, system-ui, sans-serif",
        }}
      >
        {/* Play icon — 80x80 charcoal rounded square, rx=15 */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 15,
            background: "#18181B",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <svg width="36" height="36" viewBox="0 0 32 32" fill="white">
            <path d="M12 10L22 16L12 22V10Z" />
          </svg>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 600,
            color: "#18181B",
            letterSpacing: "-0.02em",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: 16,
            maxWidth: 800,
          }}
        >
          Your slides. Your voice. No recording.
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            fontWeight: 400,
            color: "#71717A",
            textAlign: "center",
            maxWidth: 600,
            lineHeight: 1.4,
          }}
        >
          Upload a PPTX. Clone your voice. Get a complete narrated presentation with viewer tracking.
        </div>

        {/* Brand */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 18,
            fontWeight: 600,
            color: "#A1A1AA",
            letterSpacing: "0.01em",
          }}
        >
          Moduvox
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
