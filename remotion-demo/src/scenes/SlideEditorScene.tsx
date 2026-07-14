import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { theme } from '../styles/theme';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { SlideViewer } from '../components/SlideViewer';
import { fadeIn, progressFill, typingEffect } from '../lib/animations';
import { mockData } from '../lib/mockData';

export const SlideEditorScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pageOpacity = fadeIn(frame, 10);

  // Current slide changes
  const currentSlide = Math.min(Math.floor(frame / 45) + 1, 4);
  const slideIndex = currentSlide - 1;

  // Narration typing effect
  const narrationText = frame > 30
    ? mockData.narrations[slideIndex].slice(0, Math.floor((frame - 30) * 2))
    : '';

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: theme.colors.mutedSteel }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.colors.green500 }} />
              Saved
            </div>
          </header>

          {/* Three Panel Layout */}
          <div style={{ display: 'flex', height: 'calc(100vh - 112px)' }}>
            {/* Left Sidebar */}
            <div
              style={{
                width: theme.spacing.editorSidebarWidth,
                background: theme.colors.surface,
                borderRight: `1px solid ${theme.colors.borderFaint}`,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}
            >
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: theme.colors.charcoal, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                  Voice
                </label>
                <div
                  style={{
                    padding: '10px 12px',
                    border: `1px solid ${theme.colors.zinc200}`,
                    borderRadius: theme.radius.md,
                    fontSize: 14,
                    color: theme.colors.charcoal,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Professional Tone</span>
                  <span style={{ color: theme.colors.mutedSteel }}>▾</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: theme.colors.charcoal, marginBottom: 8, display: 'block' }}>
                  Control Instructions
                </label>
                <div
                  style={{
                    padding: '10px 12px',
                    border: `1px solid ${theme.colors.zinc200}`,
                    borderRadius: theme.radius.md,
                    fontSize: 13,
                    color: theme.colors.mutedSteel,
                    minHeight: 80,
                    lineHeight: 1.5,
                  }}
                >
                  Clear, authoritative, and professional narration voice. Speak with confidence and maintain a steady pace.
                </div>
              </div>
            </div>

            {/* Center - Slide Viewer */}
            <div
              style={{
                flex: 1,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div style={{ width: '100%', maxWidth: 880 }}>
                <SlideViewer
                  slideNumber={currentSlide}
                  title={mockData.slides[slideIndex].title}
                  bullets={mockData.slides[slideIndex].bullets}
                />
              </div>
            </div>

            {/* Right Panel */}
            <div
              style={{
                width: theme.spacing.editorRightPanelWidth,
                background: theme.colors.surface,
                borderLeft: `1px solid ${theme.colors.borderFaint}`,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {/* Slide Navigator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button style={{ width: 32, height: 32, borderRadius: theme.radius.md, border: `1px solid ${theme.colors.zinc200}`, background: theme.colors.surface, cursor: 'pointer', fontSize: 14 }}>←</button>
                <div style={{ flex: 1, textAlign: 'center', fontSize: 13, color: theme.colors.charcoal }}>
                  Slide <strong>{currentSlide}</strong> of <strong>12</strong>
                </div>
                <button style={{ width: 32, height: 32, borderRadius: theme.radius.md, border: `1px solid ${theme.colors.zinc200}`, background: theme.colors.surface, cursor: 'pointer', fontSize: 14 }}>→</button>
              </div>

              {/* Narration Script */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: theme.colors.charcoal, marginBottom: 8, display: 'block' }}>
                  Narration Script
                </label>
                <div
                  style={{
                    padding: '12px',
                    border: `1px solid ${theme.colors.zinc200}`,
                    borderRadius: theme.radius.md,
                    fontSize: 13,
                    color: theme.colors.charcoal,
                    lineHeight: 1.6,
                    minHeight: 120,
                  }}
                >
                  {narrationText}
                  <span style={{ borderRight: `2px solid ${theme.colors.charcoal}`, marginLeft: 1, animation: 'blink 1s infinite' }} />
                </div>
                <div style={{ fontSize: 11, color: theme.colors.mutedSteel, marginTop: 6 }}>
                  {narrationText.split(' ').filter(Boolean).length} words • {narrationText.length} characters
                </div>
              </div>

              <button
                style={{
                  background: theme.colors.charcoal,
                  color: '#FFFFFF',
                  padding: '12px 16px',
                  borderRadius: theme.radius.md,
                  fontSize: 14,
                  fontWeight: 500,
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: `1px solid ${theme.colors.charcoal}B3`,
                  fontFamily: theme.fonts.sans,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                ▶ Generate Audio
              </button>
            </div>
          </div>
        </main>
      </div>

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};