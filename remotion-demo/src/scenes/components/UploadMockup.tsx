import React from 'react';
import { theme } from '../../styles/theme';

export const UploadMockup: React.FC = () => {
  return (
    <div
      style={{
        background: theme.colors.surface,
        borderRadius: theme.radius.xl,
        padding: 24,
        border: `1px solid ${theme.colors.zinc200}`,
      }}
    >
      {/* Drop Zone */}
      <div
        style={{
          border: `2px dashed ${theme.colors.zinc300}`,
          borderRadius: theme.radius.lg,
          padding: 32,
          textAlign: 'center',
          color: theme.colors.mutedSteel,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
        <div style={{ fontSize: 16, color: theme.colors.charcoal, fontWeight: 500, marginBottom: 4 }}>
          Drop your PPTX here
        </div>
        <div style={{ fontSize: 13, color: theme.colors.mutedSteel }}>
          or click to browse (max 50MB)
        </div>
      </div>

      {/* Voice Sample Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', background: theme.colors.zinc50, borderRadius: theme.radius.lg }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: theme.radius.md,
            background: theme.colors.charcoal,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: theme.colors.charcoal, fontFamily: theme.fonts.sans }}>
            Voice Sample
          </div>
          <div style={{ display: 'flex', gap: 4, height: 20 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: i <= 5 ? theme.colors.zinc300 : theme.colors.zinc200,
                  borderRadius: 1,
                  maxHeight: Math.floor(Math.random() * 20) + 4,
                }}
              />
            ))}
          </div>
        </div>
        <button
          style={{
            padding: '8px 16px',
            borderRadius: theme.radius.md,
            background: theme.colors.charcoal,
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 500,
            border: `1px solid ${theme.colors.charcoal}B3`,
            cursor: 'pointer',
            fontFamily: theme.fonts.sans,
            whiteSpace: 'nowrap',
          }}
        >
          Replace
        </button>
      </div>

      {/* Consent Checkbox */}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 16, cursor: 'pointer' }}>
        <div
          style={{
            width: 16,
            height: 16,
            border: `1px solid ${theme.colors.zinc300}`,
            borderRadius: 3,
            marginTop: 2,
            background: theme.colors.charcoal,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <span style={{ fontSize: 13, color: theme.colors.mutedSteel, lineHeight: 1.5 }}>
          I confirm this is my own voice
        </span>
      </label>

      {/* Generate Button */}
      <div style={{ marginTop: 20, textAlign: 'right' }}>
        <button
          style={{
            padding: '12px 24px',
            borderRadius: theme.radius.lg,
            background: theme.colors.charcoal,
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 500,
            border: `1px solid ${theme.colors.charcoal}B3`,
            cursor: 'pointer',
            fontFamily: theme.fonts.sans,
          }}
        >
          Generate Narration
        </button>
      </div>
    </div>
  );
};