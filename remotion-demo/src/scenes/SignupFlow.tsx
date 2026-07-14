import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { theme } from '../styles/theme';
import { Navbar } from '../components/Navbar';
import { fadeIn, typingEffect, easeOut } from '../lib/animations';
import { mockData } from '../lib/mockData';

export const SignupFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pageOpacity = fadeIn(frame, 10);
  const pageY = interpolate(easeOut(frame, fps), [0, 1], [20, 0]);

  // Typing animations
  const nameText = typingEffect(mockData.user.name, frame - 30, 3);
  const emailText = typingEffect(mockData.user.email, frame - 60, 2);
  const passwordText = typingEffect('••••••••', frame - 90, 2);

  // Checkbox checked
  const checkboxChecked = frame > 100;

  // Button appears
  const buttonOpacity = interpolate(frame, [110, 120], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Success state
  const showSuccess = frame > 140;
  const successOpacity = showSuccess ? fadeIn(frame - 140, 20) : 0;

  return (
    <div
      style={{
        background: theme.colors.canvas,
        minHeight: '100vh',
        fontFamily: theme.fonts.sans,
        opacity: pageOpacity,
        transform: `translateY(${pageY}px)`,
      }}
    >
      <Navbar isLoggedIn={false} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '80px 32px',
        }}
      >
        <div
          style={{
            width: 400,
            background: theme.colors.surface,
            borderRadius: theme.radius.xl,
            padding: 32,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        >
          {!showSuccess ? (
            <>
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: theme.colors.charcoal,
                  margin: '0 0 8px',
                  textAlign: 'center',
                }}
              >
                Create your account
              </h1>
              <p
                style={{
                  fontSize: 14,
                  color: theme.colors.mutedSteel,
                  margin: '0 0 24px',
                  textAlign: 'center',
                }}
              >
                Start creating narrated presentations for free.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Name */}
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: theme.colors.charcoal,
                      marginBottom: 6,
                      display: 'block',
                    }}
                  >
                    Name
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
                    {nameText.length < mockData.user.name.length && (
                      <span style={{ borderRight: `2px solid ${theme.colors.charcoal}`, marginLeft: 1, animation: 'blink 1s infinite' }} />
                    )}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: theme.colors.charcoal,
                      marginBottom: 6,
                      display: 'block',
                    }}
                  >
                    Email
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

                {/* Password */}
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: theme.colors.charcoal,
                      marginBottom: 6,
                      display: 'block',
                    }}
                  >
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
                    {passwordText}
                  </div>
                </div>

                {/* Checkbox */}
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
                  <span style={{ fontSize: 13, color: theme.colors.mutedSteel, lineHeight: 1.5 }}>
                    I agree to the
                    <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: theme.colors.charcoal, textDecoration: 'underline' }}>
                      Terms of Service
                    </a>{' '}
                    and
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: theme.colors.charcoal, textDecoration: 'underline' }}>
                      Privacy Policy
                    </a>
                  </span>
                </label>

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
                    marginTop: 8,
                    border: `1px solid ${theme.colors.charcoal}B3`,
                    fontFamily: theme.fonts.sans,
                    width: '100%',
                    transition: `transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), background 200ms`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.background = theme.colors.charcoalHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.background = theme.colors.charcoal;
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.98)';
                  }}
                >
                  Create account
                </button>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1, height: 1, background: theme.colors.zinc200 }} />
                  <span style={{ fontSize: 12, color: theme.colors.mutedSteel }}>or</span>
                  <div style={{ flex: 1, height: 1, background: theme.colors.zinc200 }} />
                </div>

                {/* Google Button */}
                <button
                  style={{
                    border: `1px solid ${theme.colors.zinc200}`,
                    padding: '10px 16px',
                    borderRadius: theme.radius.md,
                    fontSize: 14,
                    fontWeight: 500,
                    textAlign: 'center',
                    cursor: 'pointer',
                    color: theme.colors.charcoal,
                    background: theme.colors.surface,
                    width: '100%',
                    fontFamily: theme.fonts.sans,
                  }}
                >
                  Continue with Google
                </button>
              </div>

              <style>{`
                @keyframes blink {
                  0%, 50% { opacity: 1; }
                  51%, 100% { opacity: 0; }
                }
              `}</style>
            </>
          ) : (
            /* Success State */
            <div style={{ textAlign: 'center', opacity: successOpacity }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: theme.colors.green100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: 24,
                }}
              >
                ✓
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: theme.colors.charcoal, margin: '0 0 8px' }}>
                Welcome to Moduvox!
              </h2>
              <p style={{ fontSize: 14, color: theme.colors.mutedSteel, margin: 0 }}>
                Redirecting to your dashboard...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};