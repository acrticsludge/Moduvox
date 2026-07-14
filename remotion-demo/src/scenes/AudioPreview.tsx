import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { theme } from '../styles/theme';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { SlideViewer } from '../components/SlideViewer';
import { AudioPlayer } from '../components/AudioPlayer';
import { fadeIn, progressFill } from '../lib/animations';
import { mockData } from '../lib/mockData';

export const AudioPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pageOpacity = fadeIn(frame, 10);

  // Audio playing simulation
  const isPlaying = frame > 30 && frame < 130;
  const audioProgress = isPlaying ? progressFill(frame - 30, 0, 100, 65) : 0;
  const currentTime = isPlaying ? Math.floor((frame - 30) * 0.5) : 0;
  const minutes = Math.floor(currentTime / 60);
  const seconds = currentTime % 60;

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
            {/* Left Sidebar */}
            <div style={{ width: theme.spacing.editorSidebarWidth, background: theme.colors.surface, borderRight: `1px solid ${theme.colors.borderFaint}` }} />

            {/* Center */}
            <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '100%', maxWidth: 880 }}>
                <SlideViewer slideNumber={1} title={mockData.slides[0].title} bullets={mockData.slides[0].bullets} />
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button style={{ width: 32, height: 32, borderRadius: theme.radius.md, border: `1px solid ${theme.colors.zinc200}`, background: theme.colors.surface, cursor: 'pointer', fontSize: 14 }}>←</button>
                <div style={{ flex: 1, textAlign: 'center', fontSize: 13, color: theme.colors.charcoal }}>
                  Slide <strong>1</strong> of <strong>12</strong>
                </div>
                <button style={{ width: 32, height: 32, borderRadius: theme.radius.md, border: `1px solid ${theme.colors.zinc200}`, background: theme.colors.surface, cursor: 'pointer', fontSize: 14 }}>→</button>
              </div>

              {/* Audio Generated Banner */}
              <div
                style={{
                  background: theme.colors.green50,
                  border: `1px solid ${theme.colors.green500}40`,
                  color: theme.colors.green700,
                  padding: '10px 12px',
                  borderRadius: theme.radius.md,
                  fontSize: 13,
                }}
              >
                ✓ Audio generated for all 12 slides
              </div>

              {/* Audio Player */}
              <AudioPlayer
                currentTime={`${minutes}:${seconds.toString().padStart(2, '0')}`}
                duration="2:30"
                progress={audioProgress}
                isPlaying={isPlaying}
              />

              {/* Regenerate Button */}
              <button
                style={{
                  border: `1px solid ${theme.colors.zinc200}`,
                  color: theme.colors.charcoal,
                  padding: '10px 16px',
                  borderRadius: theme.radius.md,
                  fontSize: 13,
                  fontWeight: 500,
                  textAlign: 'center',
                  cursor: 'pointer',
                  fontFamily: theme.fonts.sans,
                }}
              >
                Regenerate Audio
              </button>

              {/* Share Button */}
              <button
                style={{
                  border: `1px solid ${theme.colors.zinc200}`,
                  color: theme.colors.charcoal,
                  padding: '12px 16px',
                  borderRadius: theme.radius.md,
                  fontSize: 14,
                  fontWeight: 500,
                  textAlign: 'center',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontFamily: theme.fonts.sans,
                }}
              >
                🔗 Share & Track Viewers
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};