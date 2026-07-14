import React from 'react';
import { theme } from '../styles/theme';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  width?: number;
  maxHeight?: string;
  showClose?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  title,
  children,
  isOpen,
  onClose,
  width = 480,
  maxHeight = '90vh',
  showClose = true,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: `${theme.colors.charcoal}66`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '20px',
        animation: `fadeIn ${theme.animation.fast}ms ease-out`,
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <div
        style={{
          background: theme.colors.surface,
          borderRadius: theme.radius.xl,
          width,
          maxWidth: '100%',
          maxHeight,
          overflow: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          animation: `slideUp ${theme.animation.slideUpDuration}ms ${theme.animation.slideUp}`,
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${theme.colors.borderFaint}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: theme.colors.charcoal,
              margin: 0,
              fontFamily: theme.fonts.sans,
            }}
          >
            {title}
          </h2>
          {showClose && onClose && (
            <button
              onClick={onClose}
              style={{
                width: theme.touchTarget.default,
                height: theme.touchTarget.default,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: theme.colors.mutedSteel,
                fontSize: 20,
                borderRadius: theme.radius.md,
                transition: `background ${theme.animation.fast}ms`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = theme.colors.zinc100)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              ×
            </button>
          )}
        </div>
        <div style={{ padding: '20px 24px' }}>{children}</div>
      </div>
    </div>
  );
};