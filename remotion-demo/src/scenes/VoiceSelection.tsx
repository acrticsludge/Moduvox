import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { theme } from '../styles/theme';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { SlideViewer } from '../components/SlideViewer';
import { fadeIn, easeOut } from '../lib/animations';
import { mockData } from '../lib/mockData';

export const VoiceSelection: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pageOpacity = fadeIn(frame, 10);

  // Voice dropdown opens
  const showDropdown = frame > 30 && frame < 90;
  const dropdownOpacity = showDropdown ? fadeIn(frame - 30, 10) : 0;

  // Voice selected
  const voiceSelected = frame >= 90;
  const selectedOpacity = voiceSelected ? fadeIn(frame - 90, 10) : 0;

  const presetVoices = [
    { name: 'Calm Female', description: 'Soft and warm narration', controlInstruction: 'Gentle, empathetic, and soothing' },
    { name: 'Energetic Male', description: 'Upbeat and engaging delivery', controlInstruction: 'Energetic, enthusiastic, and dynamic' },
    { name: 'Soft Narrator', description: 'Quiet and intimate storytelling', controlInstruction: 'Soft, intimate, and close' },
    { name: 'Professional Tone', description: 'Clear, authoritative, and professional narration voice', controlInstruction: 'Clear, authoritative, and professional. Speak with confidence and maintain a steady pace.' },
    { name: 'Warm Friendly', description: 'Friendly and approachable tone', controlInstruction: 'Warm, friendly, and conversational' },
  ];

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
                position: 'relative',
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
                    color: voiceSelected ? theme.colors.charcoal : theme.colors.mutedSteel,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <span>{voiceSelected ? 'Professional Tone' : 'Select a voice...'}</span>
                  <span style={{ color: theme.colors.mutedSteel }}>▾</span>
                </div>

                {/* Dropdown */}
                {showDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 70,
                      left: 20,
                      right: 20,
                      background: theme.colors.surface,
                      border: `1px solid ${theme.colors.zinc200}`,
                      borderRadius: theme.radius.md,
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      zIndex: 10,
                      opacity: dropdownOpacity,
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ padding: '8px 0' }}>
                      <div style={{ padding: '4px 12px', fontSize: 11, color: theme.colors.mutedSteel, fontWeight: 500 }}>
                        Preset Voices
                      </div>
                      {presetVoices.map((voice, i) => (
                        <button
                          key={voice.name}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            fontSize: 13,
                            color: theme.colors.charcoal,
                            cursor: 'pointer',
                            background: voice.name === 'Professional Tone' ? theme.colors.zinc100 : 'transparent',
                            textAlign: 'left',
                            border: 'none',
                            fontFamily: theme.fonts.sans,
                          }}
                        >
                          {voice.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Control Instructions */}
              {voiceSelected && (
                <div style={{ opacity: selectedOpacity }}>
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
              )}

              {/* Preview Button */}
              {voiceSelected && (
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    border: `1px solid ${theme.colors.zinc200}`,
                    borderRadius: theme.radius.md,
                    cursor: 'pointer',
                    opacity: selectedOpacity,
                    background: theme.colors.surface,
                    fontFamily: theme.fonts.sans,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: theme.colors.charcoal,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 13, color: theme.colors.charcoal }}>Preview voice</span>
                </button>
              )}
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
                  slideNumber={1}
                  title={mockData.slides[0].title}
                  bullets={mockData.slides[0].bullets}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button style={{ width: 32, height: 32, borderRadius: theme.radius.md, border: `1px solid ${theme.colors.zinc200}`, background: theme.colors.surface, cursor: 'pointer', fontSize: 14 }}>←</button>
                <div style={{ flex: 1, textAlign: 'center', fontSize: 13, color: theme.colors.charcoal }}>
                  Slide <strong>1</strong> of <strong>12</strong>
                </div>
                <button style={{ width: 32, height: 32, borderRadius: theme.radius.md, border: `1px solid ${theme.colors.zinc200}`, background: theme.colors.surface, cursor: 'pointer', fontSize: 14 }}>→</button>
              </div>

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
                  {mockData.narrations[0]}
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
                }}
              >
                ▶ Generate Audio
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};