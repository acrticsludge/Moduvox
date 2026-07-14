import React from 'react';
import { theme } from '../styles/theme';

export const EditorMockup: React.FC = () => {
  return (
    <div
      style={{
        background: theme.colors.surface,
        borderRadius: theme.radius.xl,
        border: `1px solid ${theme.colors.zinc200}`,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        width: '100%',
        maxWidth: 600,
      }}
    >
      {/* Title Bar */}
      <div
        style={{
          height: 40,
          background: theme.colors.zinc100,
          borderBottom: `1px solid ${theme.colors.zinc200}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 8,
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
      </div>

      {/* Mockup Content */}
      <div style={{ padding: 20, display: 'flex', gap: 16, minHeight: 300 }}>
        {/* Sidebar Mock */}
        <div style={{ width: 120, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                height: 32,
                background: i === 2 ? theme.colors.zinc200 : theme.colors.zinc100,
                borderRadius: theme.radius.md,
                border: i === 2 ? `2px solid ${theme.colors.charcoal}` : 'none',
              }}
            />
          ))}
        </div>

        {/* Main Area Mock */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Slide Preview */}
          <div
            style={{
              aspectRatio: '4 / 3',
              background: theme.colors.zinc100,
              borderRadius: theme.radius.md,
              border: `1px solid ${theme.colors.zinc200}`,
              position: 'relative',
            }}
          >
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: theme.colors.charcoal,
                  margin: 0,
                  fontFamily: theme.fonts.sans,
                }}
              >
                Security Training Q3
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: 12,
                      background: i === 1 ? theme.colors.zinc300 : theme.colors.zinc200,
                      borderRadius: 2,
                      width: i === 1 ? '60%' : i === 2 ? '40%' : '80%',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Narration Editor Mock */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: theme.colors.charcoal,
                  fontFamily: theme.fonts.sans,
                }}
              >
                Narration
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: theme.colors.white,
                  background: theme.colors.blue500,
                  padding: '2px 6px',
                  borderRadius: theme.radius.sm,
                }}
              >
                Calm
              </span>
            </div>
            <div
              style={{
                background: theme.colors.surface,
                border: `1px solid ${theme.colors.zinc200}`,
                borderRadius: theme.radius.md,
                padding: 12,
                minHeight: 80,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 12,
                    background: i <= 2 ? theme.colors.zinc300 : theme.colors.zinc200,
                    borderRadius: 2,
                    width: i === 1 ? '90%' : i === 2 ? '70%' : i === 3 ? '50%' : '30%',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  color: theme.colors.mutedSteel,
                  fontFamily: theme.fonts.sans,
                }}
              >
                5 of 12 slides
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${theme.colors.zinc200}`,
                    background: theme.colors.surface,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: theme.colors.charcoal,
                  }}
                >
                  ←
                </button>
                <button
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${theme.colors.zinc200}`,
                    background: theme.colors.surface,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: theme.colors.charcoal,
                  }}
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};