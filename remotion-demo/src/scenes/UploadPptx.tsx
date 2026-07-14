import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { theme } from '../styles/theme';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { SlideViewer } from '../components/SlideViewer';
import { fadeIn, progressFill, typingEffect } from '../lib/animations';
import { mockData } from '../lib/mockData';

export const UploadPptx: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pageOpacity = fadeIn(frame, 10);

  const uploadProgress = progressFill(frame, 30, 60, 100);
  const showUploadZone = frame < 90;
  const showProcessing = frame >= 90 && frame < 150;
  const showSlides = frame >= 150;

  const slideOpacity = showSlides ? fadeIn(frame - 150, 20) : 0;

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
          <div
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
          </div>

          {/* Three Panel Layout */}
          <div style={{ display: 'flex', height: 'calc(100vh - 112px)' }}>
            {/* Left Sidebar - Voice Settings */}
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
              {/* Voice Selector */}
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
                    color: theme.colors.mutedSteel,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Select a voice...</span>
                  <span style={{ color: theme.colors.mutedSteel }}>▾</span>
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
              {showUploadZone && (
                /* Upload Zone */
                <div
                  style={{
                    width: '100%',
                    maxWidth: 880,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '4/3',
                      border: `2px dashed ${theme.colors.zinc300}`,
                      borderRadius: theme.radius.xl,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 16,
                    }}
                  >
                    <div style={{ fontSize: 48, color: theme.colors.zinc400 }}>📄</div>
                    <div style={{ fontSize: 16, color: theme.colors.charcoal, fontWeight: 500 }}>
                      Drop your PowerPoint file here
                    </div>
                    <div style={{ fontSize: 13, color: theme.colors.mutedSteel }}>
                      or click to browse • .pptx files up to 50MB
                    </div>

                    {/* Progress Bar */}
                    {uploadProgress > 0 && (
                      <div style={{ width: 200, marginTop: 16 }}>
                        <div
                          style={{
                            height: 4,
                            background: theme.colors.zinc200,
                            borderRadius: 2,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${uploadProgress}%`,
                              background: theme.colors.charcoal,
                              borderRadius: 2,
                            }}
                          />
                        </div>
                        <div style={{ fontSize: 11, color: theme.colors.mutedSteel, marginTop: 8, textAlign: 'center' }}>
                          Uploading... {Math.round(uploadProgress)}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {showProcessing && (
                /* Processing State */
                <div
                  style={{
                    width: '100%',
                    maxWidth: 880,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      border: `3px solid ${theme.colors.zinc200}`,
                      borderTopColor: theme.colors.charcoal,
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <div style={{ fontSize: 16, color: theme.colors.charcoal, fontWeight: 500 }}>
                    Converting slides...
                  </div>
                  <div style={{ fontSize: 13, color: theme.colors.mutedSteel }}>
                    Processing slide {Math.min(Math.floor((frame - 90) / 10) + 1, 12)} of 12
                  </div>
                </div>
              )}

              {showSlides && (
                /* Slide Viewer */
                <div style={{ width: '100%', maxWidth: 880, opacity: slideOpacity }}>
                  <SlideViewer
                    slideNumber={1}
                    title={mockData.slides[0].title}
                    bullets={mockData.slides[0].bullets}
                  />
                </div>
              )}
            </div>

            {/* Right Panel - Narration & Audio */}
            {showSlides && (
              <div
                style={{
                  width: theme.spacing.editorRightPanelWidth,
                  background: theme.colors.surface,
                  borderLeft: `1px solid ${theme.colors.borderFaint}`,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  opacity: slideOpacity,
                }}
              >
                {/* Slide Navigator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: theme.radius.md,
                      border: `1px solid ${theme.colors.zinc200}`,
                      background: theme.colors.surface,
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    ←
                  </button>
                  <div
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: 13,
                      color: theme.colors.charcoal,
                    }}
                  >
                    Slide <strong>1</strong> of <strong>12</strong>
                  </div>
                  <button
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: theme.radius.md,
                      border: `1px solid ${theme.colors.zinc200}`,
                      background: theme.colors.surface,
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    →
                  </button>
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
                    {typingEffect(mockData.narrations[0], frame - 160, 1)}
                  </div>
                  <div style={{ fontSize: 11, color: theme.colors.mutedSteel, marginTop: 6 }}>
                    {mockData.narrations[0].split(' ').length} words • {mockData.narrations[0].length} characters
                  </div>
                </div>

                {/* Generate Audio Button */}
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    border: `1px solid ${theme.colors.charcoal}B3`,
                    fontFamily: theme.fonts.sans,
                  }}
                >
                  ▶ Generate Audio
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
                    fontFamily: theme.fonts.sans,
                  }}
                >
                  Share & Track Viewers
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};