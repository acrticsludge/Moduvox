import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { theme } from '../styles/theme';
import { fadeIn } from '../lib/animations';
import { mockData } from '../lib/mockData';

export const ViewerVerification: React.FC = () => {
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
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <div
          style={{
            width: 420,
            background: theme.colors.surface,
            borderRadius: theme.radius.xl,
            padding: 32,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
          }}
        >
          {/* Green Checkmark */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: theme.colors.green100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 32,
            }}
          >
            ✓
          </div>

          <h1 style={{ fontSize: 20, fontWeight: 600, color: theme.colors.charcoal, margin: '0 0 8px' }}>
            Check your inbox
          </h1>
          <p style={{ fontSize: 14, color: theme.colors.mutedSteel, margin: '0 0 16px' }}>
            We sent a verification link to
          </p>
          <p style={{ fontSize: 14, fontWeight: 500, color: theme.colors.charcoal, margin: '0 0 24px' }}>
            {mockData.viewer.email}
          </p>

          {/* Expiry Notice */}
          <div
            style={{
              background: theme.colors.zinc100,
              borderRadius: theme.radius.md,
              padding: '12px 16px',
              fontSize: 13,
              color: theme.colors.mutedSteel,
              marginBottom: 20,
            }}
          >
            This link expires in 15 minutes.
          </div>

          {/* Resend */}
          <div style={{ fontSize: 13, color: theme.colors.mutedSteel }}>
            Didn't receive it?{' '}
            <span style={{ color: theme.colors.charcoal, fontWeight: 500, cursor: 'pointer' }}>
              Resend
            </span>
          </div>

          {/* Spam Hint */}
          <div style={{ fontSize: 12, color: theme.colors.zinc400, marginTop: 16 }}>
            Check your spam folder if you do not see the email.
          </div>
        </div>
      </main>
    </div>
  );
};