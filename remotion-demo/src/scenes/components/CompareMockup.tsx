import React from 'react';
import { theme } from '../../styles/theme';

export const CompareMockup: React.FC = () => {
  return (
    <div
      style={{
        background: theme.colors.surface,
        borderRadius: theme.radius.xl,
        padding: 24,
        border: `1px solid ${theme.colors.zinc200}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: theme.colors.charcoal,
              fontFamily: theme.fonts.sans,
            }}
          >
            Slide 7
          </span>
        </div>
        <span
          style={{
            background: theme.colors.amber100,
            color: theme.colors.amber700,
            padding: '4px 10px',
            borderRadius: theme.radius.sm,
            fontSize: 11,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
          }}
        >
          New policy: phishing prevention
        </span>
      </div>

      {/* Side by Side Comparison */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Old Slide */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              padding: '8px 12px',
              background: theme.colors.zinc100,
              borderRadius: theme.radius.md,
              fontSize: 12,
              fontWeight: 500,
              color: theme.colors.mutedSteel,
              textAlign: 'center',
              fontFamily: theme.fonts.sans,
            }}
          >
            Old
          </div>
          <div
            style={{
              flex: 1,
              aspectRatio: '4 / 3',
              background: theme.colors.zinc50,
              border: `2px solid ${theme.colors.zinc200}`,
              borderRadius: theme.radius.lg,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <h4
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: theme.colors.charcoal,
                margin: 0,
                fontFamily: theme.fonts.sans,
              }}
            >
              Phishing Prevention
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: theme.colors.zinc600 }}>
                <span style={{ color: theme.colors.charcoal, fontWeight: 500 }}>•</span>
                What is phishing?
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: theme.colors.zinc600 }}>
                <span style={{ color: theme.colors.charcoal, fontWeight: 500 }}>•</span>
                Common tactics
              </li>
            </ul>
          </div>
        </div>

        {/* Arrow */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.mutedSteel,
            fontSize: 24,
          }}
        >
          →
        </div>

        {/* Updated Slide */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              padding: '8px 12px',
              background: theme.colors.green50,
              borderRadius: theme.radius.md,
              fontSize: 12,
              fontWeight: 500,
              color: theme.colors.green700,
              textAlign: 'center',
              fontFamily: theme.fonts.sans,
            }}
          >
            Updated
          </div>
          <div
            style={{
              flex: 1,
              aspectRatio: '4 / 3',
              background: theme.colors.zinc50,
              border: `2px solid ${theme.colors.green500}`,
              borderRadius: theme.radius.lg,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <h4
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: theme.colors.charcoal,
                margin: 0,
                fontFamily: theme.fonts.sans,
              }}
            >
              Phishing Prevention
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: theme.colors.zinc600 }}>
                <span style={{ color: theme.colors.charcoal, fontWeight: 500 }}>•</span>
                What is phishing?
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: theme.colors.zinc600 }}>
                <span style={{ color: theme.colors.charcoal, fontWeight: 500 }}>•</span>
                Common tactics
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: theme.colors.green700, fontWeight: 500 }}>
                <span style={{ color: theme.colors.green500 }}>•</span>
                New policy: phishing prevention
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
        <span
          style={{
            fontSize: 13,
            color: theme.colors.mutedSteel,
            fontFamily: theme.fonts.sans,
          }}
        >
          Only 1 of 12 slides changed
        </span>
        <button
          style={{
            padding: '10px 16px',
            borderRadius: theme.radius.md,
            background: theme.colors.charcoal,
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 500,
            border: `1px solid ${theme.colors.charcoal}B3`,
            cursor: 'pointer',
            fontFamily: theme.fonts.sans,
          }}
        >
          Update presentation
        </button>
      </div>
    </div>
  );
};