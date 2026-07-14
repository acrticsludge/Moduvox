import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { theme } from '../styles/theme';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { fadeIn, easeOut } from '../lib/animations';
import { mockData } from '../lib/mockData';

export const ProjectDetail: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pageOpacity = fadeIn(frame, 10);

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
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: theme.colors.mutedSteel }}>
              <a href="/dashboard" style={{ textDecoration: 'none', color: theme.colors.mutedSteel }}>
                All Projects
              </a>
              <span>/</span>
              <span style={{ color: theme.colors.charcoal }}>{mockData.project.name}</span>
            </div>

            <button
              style={{
                background: theme.colors.charcoal,
                color: '#FFFFFF',
                padding: '8px 16px',
                borderRadius: theme.radius.md,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: `1px solid ${theme.colors.charcoal}B3`,
                fontFamily: theme.fonts.sans,
              }}
            >
              <span style={{ fontSize: 16 }}>+</span> New Presentation
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: 24 }}>
            {/* Project Info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: theme.radius.md,
                  background: `${mockData.project.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                }}
              >
                📊
              </div>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 600, color: theme.colors.charcoal, margin: '0 0 4px' }}>
                  {mockData.project.name}
                </h1>
                <p style={{ fontSize: 13, color: theme.colors.mutedSteel, margin: 0 }}>
                  {mockData.presentation.slideCount} slides • Created {mockData.project.createdAt}
                </p>
              </div>
            </div>

            {/* Presentations Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { title: 'Phishing Prevention', status: 'Ready', slides: 12 },
                { title: 'Data Security', status: 'Draft', slides: 8 },
                { title: 'Remote Work Policy', status: 'Ready', slides: 10 },
              ].map((pres, i) => (
                <div
                  key={i}
                  style={{
                    background: theme.colors.surface,
                    borderRadius: theme.radius.xl,
                    border: `1px solid ${theme.colors.zinc200}`,
                    padding: 20,
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: theme.radius.md,
                      background: theme.colors.zinc100,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      marginBottom: 12,
                    }}
                  >
                    📄
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.colors.charcoal, margin: '0 0 4px' }}>
                    {pres.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: theme.radius.sm,
                        background: pres.status === 'Ready' ? theme.colors.green50 : theme.colors.zinc100,
                        color: pres.status === 'Ready' ? theme.colors.green700 : theme.colors.mutedSteel,
                      }}
                    >
                      {pres.status}
                    </span>
                    <span style={{ color: theme.colors.mutedSteel }}>
                      {pres.slides} slides
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};