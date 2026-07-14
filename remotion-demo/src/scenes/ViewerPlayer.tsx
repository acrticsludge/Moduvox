import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { theme } from '../styles/theme';
import { AudioPlayer } from '../components/AudioPlayer';
import { fadeIn, progressFill } from '../lib/animations';
import { mockData } from '../lib/mockData';

export const ViewerPlayer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pageOpacity = fadeIn(frame, 10);

  // Auto-advance slides every 50 frames (~1.67s at 30fps)
  const currentSlide = Math.min(Math.floor(frame / 50) + 1, 4);
  const slideIndex = currentSlide - 1;

  // Audio progress - plays throughout
  const audioProgress = progressFill(frame, 0, 200, 100);
  const currentTime = Math.floor(frame * 0.5);
  const minutes = Math.floor(currentTime / 60);
  const seconds = currentTime % 60;

  return (
    <div
      style={{
        background: theme.colors.canvas,
        minHeight: '100vh',
        fontFamily: theme.fonts.sans,
        opacity: pageOpacity,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ViewNavbar */}
      <header
        style={{
          height: theme.spacing.navbarHeight,
          background: theme.colors.surface,
          borderBottom: `1px solid ${theme.colors.borderFaint}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 32px',
        }}
      >
        <svg
          width="112"
          height="22.4"
          viewBox="0 0 160 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ height: 28, width: 'auto' }}
        >
          <rect width="32" height="32" rx="6" fill="#18181B" />
          <path d="M12 10L22 16L12 22V10Z" fill="white" />
          <text
            x="42"
            y="23"
            fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
            fontSize="20"
            fontWeight="600"
            fill="#18181B"
            letterSpacing="-0.02em"
          >
            Moduvox
          </text>
        </svg>
      </header>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', paddingTop: 0 }}>
        {/* ViewSidebar */}
        <aside
          style={{
            width: 264,
            background: theme.colors.surface,
            borderRight: `1px solid ${theme.colors.borderFaint}`,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Presentation Info */}
          <div>
            <div style={{ fontSize: 12, color: theme.colors.mutedSteel, marginBottom: 4 }}>Presentation</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: theme.colors.charcoal }}>Phishing Prevention</div>
            <div style={{ fontSize: 12, color: theme.colors.mutedSteel, marginTop: 4 }}>
              Created Jul 10, 2026 • 2:30 duration
            </div>
          </div>

          {/* Slides List */}
          <div>
            <div style={{ fontSize: 12, color: theme.colors.mutedSteel, marginBottom: 8 }}>Slides</div>
            <div style={{ maxHeight: 200, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {mockData.slides.map((slide, i) => (
                <button
                  key={slide.number}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    borderRadius: theme.radius.sm,
                    background: currentSlide === slide.number ? theme.colors.zinc100 : 'transparent',
                    fontSize: 13,
                    color: currentSlide === slide.number ? theme.colors.charcoal : theme.colors.mutedSteel,
                    fontWeight: currentSlide === slide.number ? 500 : 400,
                    cursor: 'pointer',
                    border: 'none',
                    fontFamily: theme.fonts.sans,
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <span style={{ width: 16, textAlign: 'center', fontSize: 11 }}>{slide.number}</span>
                  <span>Slide {slide.number}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Link Info */}
          <div>
            <div style={{ fontSize: 12, color: theme.colors.mutedSteel, marginBottom: 4 }}>Link</div>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                border: `1px solid ${theme.colors.zinc200}`,
                borderRadius: theme.radius.md,
                fontSize: 12,
                color: theme.colors.charcoal,
                cursor: 'pointer',
                background: theme.colors.surface,
                fontFamily: theme.fonts.sans,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy Link
            </button>
          </div>

          {/* Session Info */}
          <div>
            <div style={{ fontSize: 12, color: theme.colors.mutedSteel, marginBottom: 4 }}>Session</div>
            <div style={{ fontSize: 12, color: theme.colors.green600 }}>✓ Saved across sessions</div>
          </div>

          {/* CTA */}
          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: `1px solid ${theme.colors.borderFaint}` }}>
            <div style={{ fontSize: 12, color: theme.colors.mutedSteel }}>
              Made with <span style={{ color: theme.colors.charcoal, fontWeight: 500 }}>Moduvox</span>
            </div>
          </div>
        </aside>

        {/* Slide Viewer */}
        <main style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              width: '100%',
              maxWidth: 880,
              aspectRatio: '4/3',
              background: theme.colors.surface,
              borderRadius: theme.radius.lg,
              border: `1px solid ${theme.colors.zinc200}`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Slide Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 40px 24px' }}>
              <h2 style={{ fontSize: 28, fontWeight: 600, color: theme.colors.charcoal, margin: '0 0 20px', letterSpacing: '-0.02em' }}>
                {mockData.slides[slideIndex].title}
              </h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mockData.slides[slideIndex].bullets.map((bullet, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 16, color: theme.colors.zinc600 }}>
                    <span style={{ color: theme.colors.charcoal, fontWeight: 500 }}>•</span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>

            {/* Slide Footer */}
            <div style={{ padding: '10px 20px', borderTop: `1px solid ${theme.colors.zinc100}`, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: theme.colors.mutedSteel }}>
              <span>Phishing Prevention Training</span>
              <span>Slide {currentSlide} of 12</span>
            </div>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
            <button style={{ width: 44, height: 44, borderRadius: theme.radius.md, border: `1px solid ${theme.colors.zinc200}`, background: theme.colors.surface, cursor: 'pointer', fontSize: 16, opacity: currentSlide === 1 ? 0.5 : 1 }}>←</button>
            <span style={{ fontSize: 14, color: theme.colors.charcoal }}>{currentSlide} / 12</span>
            <button style={{ width: 44, height: 44, borderRadius: theme.radius.md, border: `1px solid ${theme.colors.zinc200}`, background: theme.colors.surface, cursor: 'pointer', fontSize: 16 }}>→</button>
          </div>
        </main>
      </div>

      {/* Audio Bar */}
      <footer
        style={{
          background: theme.colors.surface,
          borderTop: `1px solid ${theme.colors.borderFaint}`,
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Skip Back */}
        <button style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${theme.colors.zinc200}`, background: theme.colors.surface, cursor: 'pointer', fontSize: 12 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="19 20 9 12 19 4 19 20" />
            <line x1="5" y1="19" x2="5" y2="5" />
          </svg>
        </button>

        {/* Play/Pause */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: theme.colors.charcoal,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        </div>

        {/* Skip Forward */}
        <button style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${theme.colors.zinc200}`, background: theme.colors.surface, cursor: 'pointer', fontSize: 12 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>

        {/* Time */}
        <span style={{ fontSize: 11, color: theme.colors.mutedSteel, fontFamily: theme.fonts.mono, fontVariantNumeric: 'tabular-nums', minWidth: 40 }}>
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>

        {/* Progress */}
        <div style={{ flex: 1, height: 4, background: theme.colors.zinc200, borderRadius: 2, position: 'relative', cursor: 'pointer' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${audioProgress}%`, background: theme.colors.charcoal, borderRadius: 2 }} />
        </div>

        {/* Duration */}
        <span style={{ fontSize: 11, color: theme.colors.mutedSteel, fontFamily: theme.fonts.mono, fontVariantNumeric: 'tabular-nums', minWidth: 40, textAlign: 'right' }}>
          2:30
        </span>

        {/* Speed */}
        <div style={{ padding: '4px 8px', borderRadius: theme.radius.sm, border: `1px solid ${theme.colors.zinc200}`, fontSize: 12, color: theme.colors.charcoal, cursor: 'pointer' }}>
          1x
        </div>

        {/* Volume */}
        <button style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${theme.colors.zinc200}`, background: theme.colors.surface, cursor: 'pointer', fontSize: 14 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        </button>

        {/* Version Badge */}
        <div
          style={{
            padding: '4px 10px',
            borderRadius: theme.radius.sm,
            background: theme.colors.green50,
            border: `1px solid ${theme.colors.green500}40`,
            fontSize: 11,
            color: theme.colors.green700,
            fontWeight: 500,
          }}
        >
          ✓ Up to date
        </div>
      </footer>

      {/* ViewFooter */}
      <div
        style={{
          background: theme.colors.charcoal,
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 12, color: theme.colors.mutedSteel }}>© 2026 Moduvox. All rights reserved.</span>
        <span style={{ fontSize: 12, color: theme.colors.mutedSteel }}>Powered by Gemini AI and VoxCPM</span>
      </div>
    </div>
  );
};