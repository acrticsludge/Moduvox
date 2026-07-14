import React from 'react';
import { theme } from '../../styles/theme';

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        background: theme.colors.charcoal,
        padding: '64px 32px',
        color: '#FFFFFF',
        fontFamily: theme.fonts.sans,
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 32,
        }}
      >
        {/* Column 1: Brand */}
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Moduvox</div>
          <div style={{ fontSize: 14, color: theme.colors.mutedSteel, lineHeight: 1.6 }}>
            Turn slides into narrated training, in your voice.
          </div>
        </div>

        {/* Column 2: Product */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Product</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a
              href="/features"
              style={{
                color: '#FFFFFF',
                fontSize: 13,
                textDecoration: 'none',
                fontFamily: theme.fonts.sans,
              }}
            >
              Features
            </a>
            <span
              style={{
                color: theme.colors.zinc600,
                fontSize: 13,
                cursor: 'not-allowed',
                fontFamily: theme.fonts.sans,
                userSelect: 'none',
              }}
            >
              Smart Update
            </span>
            <span
              style={{
                color: theme.colors.zinc600,
                fontSize: 13,
                cursor: 'not-allowed',
                fontFamily: theme.fonts.sans,
                userSelect: 'none',
              }}
            >
              Viewer Tracking
            </span>
          </div>
        </div>

        {/* Column 3: Company */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Company</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a
              href="/about"
              style={{
                color: '#FFFFFF',
                fontSize: 13,
                textDecoration: 'none',
                fontFamily: theme.fonts.sans,
              }}
            >
              About
            </a>
            <a
              href="/security"
              style={{
                color: '#FFFFFF',
                fontSize: 13,
                textDecoration: 'none',
                fontFamily: theme.fonts.sans,
              }}
            >
              Security
            </a>
            <a
              href="/privacy"
              style={{
                color: '#FFFFFF',
                fontSize: 13,
                textDecoration: 'none',
                fontFamily: theme.fonts.sans,
              }}
            >
              Privacy
            </a>
            <a
              href="/terms"
              style={{
                color: '#FFFFFF',
                fontSize: 13,
                textDecoration: 'none',
                fontFamily: theme.fonts.sans,
              }}
            >
              Terms
            </a>
          </div>
        </div>

        {/* Column 4: Connect */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Connect</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a
              href="mailto:anubhavrai100@gmail.com"
              style={{
                color: '#FFFFFF',
                fontSize: 13,
                textDecoration: 'none',
                fontFamily: theme.fonts.sans,
              }}
            >
              Email
            </a>
            <span
              style={{
                color: theme.colors.zinc600,
                fontSize: 13,
                cursor: 'not-allowed',
                fontFamily: theme.fonts.sans,
                userSelect: 'none',
              }}
            >
              Twitter / X
            </span>
            <span
              style={{
                color: theme.colors.zinc600,
                fontSize: 13,
                cursor: 'not-allowed',
                fontFamily: theme.fonts.sans,
                userSelect: 'none',
              }}
            >
              LinkedIn
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        style={{
          maxWidth: 1400,
          margin: '48px auto 0',
          paddingTop: 24,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          color: theme.colors.mutedSteel,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
          <span>2026 Moduvox. All rights reserved.</span>
          <span>Powered by Gemini AI and VoxCPM</span>
        </div>
        <span
          style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '2px 8px',
            borderRadius: theme.radius.sm,
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          MVP v1.0.0
        </span>
      </div>
    </footer>
  );
};