import React from 'react';
import { theme } from '../styles/theme';

interface AudioPlayerProps {
  currentTime?: string;
  duration?: string;
  progress?: number;
  isPlaying?: boolean;
  muted?: boolean;
  volume?: number;
  speed?: number;
  versionStatus?: 'synced' | 'outdated';
  onPlayPause?: () => void;
  onSeek?: (progress: number) => void;
  onSpeedChange?: () => void;
  onVolumeChange?: (volume: number) => void;
  onMuteToggle?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  currentTime = '0:00',
  duration = '2:30',
  progress = 0,
  isPlaying = false,
  muted = false,
  volume = 1,
  speed = 1,
  versionStatus = 'synced',
}) => {
  return (
    <div
      style={{
        background: theme.colors.surface,
        border: `1px solid ${theme.colors.zinc200}`,
        borderRadius: theme.radius.lg,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Primary Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Skip Back 10s */}
        <button
          style={{
            width: theme.touchTarget.default,
            height: theme.touchTarget.default,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.zinc200}`,
            borderRadius: theme.radius.full,
            cursor: 'pointer',
            color: theme.colors.charcoal,
            transition: `background ${theme.animation.fast}ms`,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = theme.colors.zinc100)}
          onMouseLeave={(e) => (e.currentTarget.style.background = theme.colors.surface)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="19 20 9 12 19 4 19 20" />
            <line x1="5" y1="19" x2="5" y2="5" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          style={{
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: theme.colors.charcoal,
            border: 'none',
            borderRadius: theme.radius.full,
            cursor: 'pointer',
            color: '#FFFFFF',
            transition: `transform ${theme.animation.fast}ms ${theme.animation.spring}`,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        {/* Skip Forward 10s */}
        <button
          style={{
            width: theme.touchTarget.default,
            height: theme.touchTarget.default,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.zinc200}`,
            borderRadius: theme.radius.full,
            cursor: 'pointer',
            color: theme.colors.charcoal,
            transition: `background ${theme.animation.fast}ms`,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = theme.colors.zinc100)}
          onMouseLeave={(e) => (e.currentTarget.style.background = theme.colors.surface)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>

        {/* Elapsed Time */}
        <span
          style={{
            fontSize: 11,
            color: theme.colors.mutedSteel,
            fontFamily: theme.fonts.mono,
            fontVariantNumeric: 'tabular-nums',
            minWidth: 40,
          }}
        >
          {currentTime}
        </span>

        {/* Progress Bar */}
        <div
          style={{
            flex: 1,
            height: 4,
            background: theme.colors.zinc200,
            borderRadius: 2,
            position: 'relative',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${progress}%`,
              background: theme.colors.charcoal,
              borderRadius: 2,
            }}
          />
          {/* Thumb */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: `${progress}%`,
              transform: 'translate(-50%, -50%)',
              width: 12,
              height: 12,
              background: theme.colors.charcoal,
              borderRadius: '50%',
              opacity: 0,
              transition: 'opacity 150ms',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Duration */}
        <span
          style={{
            fontSize: 11,
            color: theme.colors.mutedSteel,
            fontFamily: theme.fonts.mono,
            fontVariantNumeric: 'tabular-nums',
            minWidth: 40,
            textAlign: 'right',
          }}
        >
          {duration}
        </span>
      </div>

      {/* Secondary Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
        {/* Speed Selector */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.zinc200}`,
            borderRadius: theme.radius.sm,
            fontSize: 12,
            color: theme.colors.charcoal,
            cursor: 'pointer',
          }}
        >
          <span>{speed}x</span>
        </div>

        {/* Volume */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            style={{
              width: theme.touchTarget.default,
              height: theme.touchTarget.default,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: theme.colors.surface,
              border: `1px solid ${theme.colors.zinc200}`,
              borderRadius: theme.radius.full,
              cursor: 'pointer',
              color: theme.colors.charcoal,
            }}
          >
            {muted || volume === 0 ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : volume < 0.5 ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
        </div>

        {/* Version Badge */}
        <div
          style={{
            padding: '4px 10px',
            borderRadius: theme.radius.sm,
            fontSize: 11,
            fontWeight: 500,
            fontFamily: theme.fonts.sans,
            ...(versionStatus === 'synced'
              ? {
                  background: theme.colors.green50,
                  border: `1px solid ${theme.colors.green500}40`,
                  color: theme.colors.green700,
                }
              : {
                  background: theme.colors.amber50,
                  border: `1px solid ${theme.colors.amber700}40`,
                  color: theme.colors.amber700,
                }),
          }}
        >
          {versionStatus === 'synced' ? '✓ Up to date' : '⟳ Changes detected — Refresh'}
        </div>
      </div>
    </div>
  );
};