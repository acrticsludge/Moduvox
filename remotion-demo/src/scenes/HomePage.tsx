import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { theme } from '../styles/theme';
import { Navbar } from '../components/Navbar';
import { fadeIn, slideUp, easeOut } from '../lib/animations';
import { mockData } from '../lib/mockData';
import { EditorMockup } from './components/EditorMockup';
import { UploadMockup } from './components/UploadMockup';
import { CompareMockup } from './components/CompareMockup';
import { AnalyticsMockup } from './components/AnalyticsMockup';
import { Footer } from '../components/Footer';

export const HomePage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const heroOpacity = fadeIn(frame, 15);
  const heroY = interpolate(easeOut(frame, fps), [0, 1], [30, 0]);

  // Scroll through feature sections
  const scrollProgress = interpolate(frame, [60, 180], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scrollY = interpolate(scrollProgress, [0, 1], [0, -600]);

  return (
    <div style={{ background: theme.colors.canvas, minHeight: '100vh', fontFamily: theme.fonts.sans }}>
      <Navbar isLoggedIn={false} />

      {/* Hero Section */}
      <section
        style={{
          opacity: heroOpacity,
          transform: `translateY(${heroY}px)`,
          paddingTop: theme.spacing.navbarHeight + 144, // pt-36 = 144px
          paddingBottom: 80, // pb-20 = 80px
          maxWidth: 1400,
          margin: '0 auto',
          paddingLeft: 32,
          paddingRight: 32,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 48, // gap-12 = 48px
          alignItems: 'center',
        }}
      >
        {/* Left - Text Content */}
        <div style={{ zIndex: 10 }}>
          <h1
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 600,
              color: theme.colors.charcoal,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              margin: '0 0 24px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '12px 12px', // gap-x-3 gap-y-1
              textBalance: 'balance',
            }}
          >
            <span>Your slides.</span>
            <span>Your voice. No recording.</span>
          </h1>
          <p
            style={{
              fontSize: '1.125rem', // text-lg = 18px
              color: theme.colors.mutedSteel,
              lineHeight: 1.625, // leading-relaxed
              margin: '0 0 32px', // mt-6 = 24px, mb-8 = 32px
              maxWidth: '58ch', // max-w-[58ch]
              textWrap: 'pretty', // text-pretty
            }}
          >
            Upload a PPTX, clone your voice in 30 seconds, and get a complete narrated presentation with proof of who watched it.
          </p>
          <a
            href="/signup"
            style={{
              display: 'inline-block',
              background: theme.colors.charcoal,
              color: '#FFFFFF',
              padding: '12px 24px', // px-6 py-3 = 24px horizontal, 12px vertical
              borderRadius: theme.radius.lg,
              fontSize: '1rem', // text-base
              fontWeight: 500,
              textDecoration: 'none',
              fontFamily: theme.fonts.sans,
              border: `1px solid ${theme.colors.charcoal}B3`, // 70% opacity
              transition: `transform ${theme.animation.fast}ms ${theme.animation.spring}, background ${theme.animation.fast}ms, border-color ${theme.animation.fast}ms`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.background = theme.colors.charcoalHover;
              e.currentTarget.style.borderColor = theme.colors.charcoal;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = theme.colors.charcoal;
              e.currentTarget.style.borderColor = `${theme.colors.charcoal}B3`;
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
          >
            Start free
          </a>
        </div>

        {/* Right - Editor Mockup */}
        <div style={{ justifySelf: 'end', width: '100%', maxWidth: 600 }}>
          <EditorMockup />
        </div>
      </section>

      {/* Feature Section 1: Upload, generate, share */}
      <section
        style={{
          background: theme.colors.sectionAlt, // darker
          padding: '96px 32px',
          transform: `translateY(${scrollY}px)`,
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 64,
            alignItems: 'center',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                fontWeight: 600,
                color: theme.colors.charcoal,
                margin: '0 0 20px', // mt-5 = 20px
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                textWrap: 'balance', // text-balance
              }}
            >
              Upload, generate, share.
            </h2>
            <p
              style={{
                fontSize: '1.125rem', // text-lg
                color: theme.colors.mutedSteel,
                lineHeight: 1.625, // leading-relaxed
                margin: 0,
                maxWidth: '52ch', // max-w-[52ch]
                textWrap: 'pretty', // text-pretty
              }}
            >
              Drop in your PowerPoint file and a 30-second voice sample. Our AI extracts speaker notes, writes natural narration, and clones your voice. Edit anything before it&apos;s final.
            </p>
          </div>
          <div>
            <UploadMockup />
          </div>
        </div>
      </section>

      {/* Feature Section 2: Change one slide. Update one slide. */}
      <section
        style={{
          background: theme.colors.canvas, // lighter
          padding: '96px 32px',
          transform: `translateY(${scrollY}px)`,
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 64,
            alignItems: 'center',
          }}
        >
          <div style={{ order: 2 }}> {/* visualRight */}
            <CompareMockup />
          </div>
          <div style={{ order: 1 }}>
            <h2
              style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                fontWeight: 600,
                color: theme.colors.charcoal,
                margin: '0 0 20px',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                textWrap: 'balance',
              }}
            >
              Change one slide. Update one slide.
            </h2>
            <p
              style={{
                fontSize: '1.125rem',
                color: theme.colors.mutedSteel,
                lineHeight: 1.625,
                margin: 0,
                maxWidth: '52ch',
                textWrap: 'pretty',
              }}
            >
              Updated a policy? Upload the revised deck. Only the changed slides get re-narrated. Your share link updates automatically. No re-recording the whole thing.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Section 3: Know who actually watched */}
      <section
        style={{
          background: theme.colors.sectionAlt, // darker
          padding: '96px 32px',
          transform: `translateY(${scrollY}px)`,
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 64,
            alignItems: 'center',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                fontWeight: 600,
                color: theme.colors.charcoal,
                margin: '0 0 20px',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                textWrap: 'balance',
              }}
            >
              Know who actually watched.
            </h2>
            <p
              style={{
                fontSize: '1.125rem',
                color: theme.colors.mutedSteel,
                lineHeight: 1.625,
                margin: 0,
                maxWidth: '52ch',
                textWrap: 'pretty',
              }}
            >
              Require viewers to enter their email before watching. See completion rates, time spent, and who skipped. Export CSV reports for compliance audits.
            </p>
          </div>
          <div>
            <AnalyticsMockup />
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};