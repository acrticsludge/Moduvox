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
          fontFamily: "Geist, system-ui, sans-serif",
        }}
      >
        {/* Play icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 16,
            background: "#18181B",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
            <polygon points="8,5 19,12 8,19" />
          </svg>
        </div>

        {/* Title */}
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

        {/* Tagline */}
        <div
          style={{
            fontSize: 24,
            color: "#71717A",
            textAlign: "center",
            maxWidth: 600,
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
