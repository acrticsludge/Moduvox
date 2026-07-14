import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { theme } from '../styles/theme';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { SlideViewer } from '../components/SlideViewer';
import { fadeIn, easeOut } from '../lib/animations';
import { mockData } from '../lib/mockData';

export const ShareSettings: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pageOpacity = fadeIn(frame, 10);

  // Modal appears at frame 15
  const showModal = frame > 15;
  const modalOpacity = showModal ? fadeIn(frame - 15, 10) : 0;

  // Email gate toggled at frame 60
  const emailGateToggled = frame > 60;
  const toggleOpacity = emailGateToggled ? fadeIn(frame - 60, 10) : 0;

  // Link copied at frame 90
  const linkCopied = frame > 90;
  const copyOpacity = linkCopied ? fadeIn(frame - 90, 10) : 0;

  const shareUrl = `https://moduvox.app/view/${mockData.presentation.shareToken}`;

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

      {/* Share Modal */}
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
              width: 640,
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Header */}
            <header style={{ padding: '20px 24px', borderBottom: `1px solid ${theme.colors.borderFaint}` }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.colors.charcoal, margin: 0 }}>
                Share & Track Viewers
              </h2>
            </header>

            <div style={{ padding: '20px 24px' }}>
              {/* Share Link */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: theme.colors.charcoal, marginBottom: 8, display: 'block' }}>
                  Share Link
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: `1px solid ${theme.colors.zinc200}`,
                      borderRadius: theme.radius.md,
                      fontSize: 13,
                      color: theme.colors.charcoal,
                      fontFamily: theme.fonts.mono,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {shareUrl}
                  </div>
                  <button
                    style={{
                      padding: '10px 16px',
                      borderRadius: theme.radius.md,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      background: linkCopied ? theme.colors.green50 : theme.colors.charcoal,
                      color: linkCopied ? theme.colors.green700 : '#FFFFFF',
                      border: linkCopied ? `1px solid ${theme.colors.green500}40` : 'none',
                      fontFamily: theme.fonts.sans,
                    }}
                  >
                    {linkCopied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <button
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: theme.colors.mutedSteel,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: theme.fonts.sans,
                  }}
                >
                  Copy invite message
                </button>
              </div>

              {/* Email Gate Toggle */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: theme.colors.charcoal }}>Email Verification</div>
                    <div style={{ fontSize: 12, color: theme.colors.mutedSteel }}>Require viewers to verify email before watching</div>
                  </div>
                  <div
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      background: emailGateToggled ? theme.colors.charcoal : theme.colors.zinc200,
                      padding: 2,
                      cursor: 'pointer',
                      transition: `background ${theme.animation.fast}ms`,
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        transform: `translateX(${emailGateToggled ? 20 : 0}px)`,
                        transition: `transform ${theme.animation.fast}ms`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Password Protection */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: theme.colors.charcoal }}>Password Protection</div>
                    <div style={{ fontSize: 12, color: theme.colors.mutedSteel }}>Add a password to restrict access</div>
                  </div>
                  <button
                    style={{
                      fontSize: 13,
                      color: theme.colors.blue500,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: theme.fonts.sans,
                    }}
                  >
                    Set password
                  </button>
                </div>
              </div>

              {/* Expiration */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: theme.colors.charcoal }}>Link Expiration</div>
                    <div style={{ fontSize: 12, color: theme.colors.mutedSteel }}>Set when this link stops working</div>
                  </div>
                  <button
                    style={{
                      fontSize: 13,
                      color: theme.colors.blue500,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: theme.fonts.sans,
                    }}
                  >
                    Set expiration
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};