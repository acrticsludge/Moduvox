import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { theme } from '../styles/theme';
import { fadeIn, typingEffect } from '../lib/animations';
import { mockData } from '../lib/mockData';

export const ViewerGate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pageOpacity = fadeIn(frame, 10);

  // Typing animations
  const nameText = typingEffect(mockData.viewer.name, frame - 30, 3);
  const emailText = typingEffect(mockData.viewer.email, frame - 60, 2);

  // Checkbox checked
  const checkboxChecked = frame > 80;

  // Button appears
  const buttonOpacity = interpolate(frame, [90, 100], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

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
          }}
        >
          {/* Presentation Info */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: theme.colors.mutedSteel, marginBottom: 8 }}>
              Phishing Prevention Training
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: theme.colors.charcoal, margin: '0 0 8px' }}>
              {mockData.presentation.title}
            </h1>
            <p style={{ fontSize: 14, color: theme.colors.mutedSteel, margin: 0 }}>
              {mockData.presentation.slideCount} slides • Created by {mockData.user.name}
            </p>
          </div>

          {/* Gate Form - Combined password + email gate */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Password field (shown since presentation has password) */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: theme.colors.charcoal, marginBottom: 6, display: 'block' }}>
                Password
              </label>
              <div
                style={{
                  padding: '10px 12px',
                  border: `1px solid ${theme.colors.zinc200}`,
                  borderRadius: theme.radius.md,
                  fontSize: 14,
                  color: theme.colors.charcoal,
                  minHeight: 20,
                }}
              >
                ••••••••
              </div>
            </div>

            {/* Name */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: theme.colors.charcoal, marginBottom: 6, display: 'block' }}>
                Your Name
              </label>
              <div
                style={{
                  padding: '10px 12px',
                  border: `1px solid ${theme.colors.zinc200}`,
                  borderRadius: theme.radius.md,
                  fontSize: 14,
                  color: theme.colors.charcoal,
                  minHeight: 20,
                }}
              >
                {nameText}
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: theme.colors.charcoal, marginBottom: 6, display: 'block' }}>
                Email Address
              </label>
              <div
                style={{
                  padding: '10px 12px',
                  border: `1px solid ${theme.colors.zinc200}`,
                  borderRadius: theme.radius.md,
                  fontSize: 14,
                  color: theme.colors.charcoal,
                  minHeight: 20,
                }}
              >
                {emailText}
              </div>
            </div>

            {/* Consent Checkbox */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  border: `1px solid ${theme.colors.zinc300}`,
                  borderRadius: 3,
                  marginTop: 2,
                  background: checkboxChecked ? theme.colors.charcoal : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {checkboxChecked && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 12, color: theme.colors.mutedSteel, lineHeight: 1.5 }}>
                I confirm I am watching this myself and not on behalf of another person.
              </span>
            </label>

            {/* Info Banner */}
            <div
              style={{
                background: theme.colors.blue50,
                border: `1px solid ${theme.colors.blue500}40`,
                borderRadius: theme.radius.md,
                padding: '10px 12px',
                fontSize: 12,
                color: theme.colors.charcoal,
                lineHeight: 1.5,
              }}
            >
              We will send a verification email to your address to confirm your identity.
            </div>

            {/* Submit Button */}
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
                opacity: buttonOpacity,
                border: `1px solid ${theme.colors.charcoal}B3`,
                fontFamily: theme.fonts.sans,
                width: '100%',
              }}
            >
              Send Verification Link
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};