import React from 'react';
import { theme } from '../styles/theme';

interface SlideViewerProps {
  slideNumber: number;
  title: string;
  bullets: string[];
  isModified?: boolean;
}

export const SlideViewer: React.FC<SlideViewerProps> = ({
  slideNumber,
  title,
  bullets,
  isModified = false,
}) => {
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '4 / 3',
        background: theme.colors.surface,
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.colors.zinc200}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Slide Number Badge */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span
          style={{
            background: theme.colors.charcoal,
            color: '#FFFFFF',
            padding: '4px 10px',
            borderRadius: theme.radius.sm,
            fontSize: 11,
            fontWeight: 600,
            fontFamily: theme.fonts.sans,
          }}
        >
          Slide {slideNumber}
        </span>
        {isModified && (
          <span
            style={{
              background: theme.colors.amber100,
              color: theme.colors.amber700,
              padding: '2px 8px',
              borderRadius: theme.radius.sm,
              fontSize: 10,
              fontWeight: 500,
              fontFamily: theme.fonts.sans,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            Modified
          </span>
        )}
      </div>

      {/* Slide Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 48px 32px',
        }}
      >
        <h2
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: theme.colors.charcoal,
            margin: '0 0 24px',
            fontFamily: theme.fonts.sans,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}
        >
          {title}
        </h2>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {bullets.map((bullet, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                fontSize: 16,
                color: theme.colors.zinc600,
                fontFamily: theme.fonts.sans,
                lineHeight: 1.5,
              }}
            >
              <span
                style={{
                  color: theme.colors.charcoal,
                  fontWeight: 500,
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                •
              </span>
              {bullet}
            </li>
          ))}
        </ul>
      </div>

      {/* Slide Footer */}
      <div
        style={{
          padding: '12px 24px',
          borderTop: `1px solid ${theme.colors.zinc100}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: theme.colors.mutedSteel,
          fontFamily: theme.fonts.sans,
        }}
      >
        <span>Phishing Prevention Training</span>
        <span>Slide {slideNumber} of 12</span>
      </div>
    </div>
  );
};