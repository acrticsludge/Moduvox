import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { theme } from '../styles/theme';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { SlideViewer } from '../components/SlideViewer';
import { fadeIn, progressFill } from '../lib/animations';
import { mockData } from '../lib/mockData';

export const AudioGeneration: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pageOpacity = fadeIn(frame, 10);

  // Modal opens after 20 frames
  const showModal = frame > 20;
  const modalOpacity = showModal ? fadeIn(frame - 20, 10) : 0;

  // Step 1: Review (0-40 frames of modal)
  const inReviewStep = showModal && frame < 60;
  // Step 2: Generating (40-140 frames of modal)
  const inGeneratingStep = frame >= 60 && frame < 160;
  // Step 3: Complete (160+ frames)
  const inCompleteStep = frame >= 160;

  // Generating progress
  const genProgress = inGeneratingStep ? progressFill(frame, 60, 100, 100) : 0;
  const currentSlide = Math.min(Math.floor(genProgress / 8.33) + 1, 12);

  const renderReviewStep = () => (
    <div>
      <header style={{ padding: '20px 24px', borderBottom: `1px solid ${theme.colors.borderFaint}` }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.colors.charcoal, margin: 0 }}>
          Review changes
        </h2>
      </header>
      <div style={{ padding: '24px' }}>
        <div
          style={{
            background: theme.colors.blue50,
            border: `1px solid ${theme.colors.blue500}40`,
            borderRadius: theme.radius.md,
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 13,
            color: theme.colors.charcoal,
          }}
        >
          Voice settings changed. All slides will be regenerated with the new voice.
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: theme.colors.charcoal, marginBottom: 8 }}>
            Affected slides (12)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflow: 'auto' }}>
            {mockData.slides.map((slide, i) => (
              <div
                key={i}
                style={{
                  border: `1px solid ${theme.colors.zinc200}`,
                  borderRadius: theme.radius.md,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '10px 12px',
                    background: theme.colors.zinc50,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <span style={{ fontSize: 13, color: theme.colors.charcoal, fontWeight: 500 }}>
                    Slide {slide.number}: {slide.title}
                  </span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      padding: '2px 6px',
                      background: theme.colors.amber100,
                      color: theme.colors.amber700,
                      borderRadius: theme.radius.sm,
                      fontSize: 10,
                      fontWeight: 500,
                    }}
                  >
                    Modified
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            style={{
              width: '100%',
              background: theme.colors.charcoal,
              color: '#FFFFFF',
              padding: '12px 16px',
              borderRadius: theme.radius.md,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              border: `1px solid ${theme.colors.charcoal}B3`,
              fontFamily: theme.fonts.sans,
            }}
          >
            Regenerate Audio for 12 slides
          </button>
        </div>
      </div>
    </div>
  );

  const renderGeneratingStep = () => (
    <div>
      <header style={{ padding: '20px 24px', borderBottom: `1px solid ${theme.colors.borderFaint}` }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.colors.charcoal, margin: 0 }}>
          Generating audio...
        </h2>
      </header>
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 24,
              height: 24,
              border: `2px solid ${theme.colors.zinc200}`,
              borderTopColor: theme.colors.charcoal,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span style={{ fontSize: 14, color: theme.colors.charcoal }}>
            Slide {currentSlide} of 12
          </span>
        </div>

        <div
          style={{
            height: 6,
            background: theme.colors.zinc200,
            borderRadius: 3,
            overflow: 'hidden',
            marginBottom: 8,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${genProgress}%`,
              background: theme.colors.charcoal,
              borderRadius: 3,
              transition: 'width 100ms linear',
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: theme.colors.mutedSteel, textAlign: 'right' }}>
          {Math.round(genProgress)}%
        </div>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div>
      <header style={{ padding: '20px 24px', borderBottom: `1px solid ${theme.colors.borderFaint}` }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.colors.charcoal, margin: 0 }}>
          Generation Complete
        </h2>
      </header>
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: theme.colors.green100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 28,
          }}
        >
          ✓
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: theme.colors.charcoal, margin: '0 0 8px' }}>
          Audio generated for all 12 slides
        </h3>
        <p style={{ fontSize: 13, color: theme.colors.mutedSteel, margin: '0 0 24px' }}>
          All slides have been successfully narrated with the selected voice.
        </p>
        <button
          style={{
            background: theme.colors.charcoal,
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: theme.radius.md,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            border: `1px solid ${theme.colors.charcoal}B3`,
            fontFamily: theme.fonts.sans,
          }}
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div
      style={{
        background: theme.colors.canvas,
        minHeight: '100vh',
        fontFamily: theme.fonts.sans,
        opacity: pageOpacity,
      }}
    >
      <Navbar isLoggedIn={true} />

      <div style={{ display: 'flex', paddingTop: theme.spacing.navbarHeight, minHeight: '100vh' }}>
        <Sidebar activeItem="All Projects" />

        <main style={{ flex: 1 }}>
          {/* Header */}
          <header
            style={{
              background: theme.colors.surface,
              borderBottom: `1px solid ${theme.colors.borderFaint}`,
              padding: '12px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: theme.colors.mutedSteel }}>
              <a href="/dashboard" style={{ textDecoration: 'none', color: theme.colors.mutedSteel }}>All Projects</a>
              <span>/</span>
              <a href={`/dashboard/projects/${mockData.project.id}`} style={{ textDecoration: 'none', color: theme.colors.mutedSteel }}>
                {mockData.project.name}
              </a>
              <span>/</span>
              <span style={{ color: theme.colors.charcoal }}>{mockData.presentation.title}</span>
            </div>
          </header>

          {/* Three Panel Layout */}
          <div style={{ display: 'flex', height: 'calc(100vh - 112px)' }}>
            <div style={{ width: theme.spacing.editorSidebarWidth, background: theme.colors.surface, borderRight: `1px solid ${theme.colors.borderFaint}` }} />
            <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '100%', maxWidth: 880 }}>
                <SlideViewer slideNumber={1} title={mockData.slides[0].title} bullets={mockData.slides[0].bullets} />
              </div>
            </div>
            <div style={{ width: theme.spacing.editorRightPanelWidth, background: theme.colors.surface, borderLeft: `1px solid ${theme.colors.borderFaint}` }} />
          </div>
        </main>
      </div>

      {/* Regenerate Modal - 3 Steps */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: `${theme.colors.charcoal}66`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            opacity: modalOpacity,
          }}
        >
          <div
            style={{
              background: theme.colors.surface,
              borderRadius: theme.radius.xl,
              width: 520,
              maxWidth: 'calc(100% - 40px)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            {inReviewStep && renderReviewStep()}
            {inGeneratingStep && renderGeneratingStep()}
            {inCompleteStep && renderCompleteStep()}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};