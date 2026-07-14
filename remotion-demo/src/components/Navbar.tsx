import React from 'react';
import { theme } from '../styles/theme';
import { Button } from './Button';

interface NavbarProps {
  isLoggedIn?: boolean;
  showDashboard?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ isLoggedIn = false }) => {
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: theme.spacing.navbarHeight,
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(4px)',
        borderBottom: `1px solid ${theme.colors.borderFaint}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1400,
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo - SVG Wordmark */}
        <a
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
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
        </a>

        {/* Navigation */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {!isLoggedIn && (
            <>
              <a
                href="/features"
                style={{
                  color: theme.colors.charcoal,
                  fontSize: 14,
                  textDecoration: 'none',
                  fontFamily: theme.fonts.sans,
                  fontWeight: 500,
                }}
              >
                Features
              </a>
              <a
                href="/pricing"
                style={{
                  color: theme.colors.charcoal,
                  fontSize: 14,
                  textDecoration: 'none',
                  fontFamily: theme.fonts.sans,
                  fontWeight: 500,
                }}
              >
                Pricing
              </a>
              <a
                href="/feedback"
                style={{
                  color: theme.colors.charcoal,
                  fontSize: 14,
                  textDecoration: 'none',
                  fontFamily: theme.fonts.sans,
                  fontWeight: 500,
                }}
              >
                Feedback
              </a>
            </>
          )}

          {/* Auth CTAs */}
          {isLoggedIn ? (
            <Button variant="primary" size="md" style={{ transition: `transform ${theme.animation.fast}ms ${theme.animation.spring}` }}>
              Dashboard
            </Button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <a
                href="/login"
                style={{
                  color: theme.colors.charcoal,
                  fontSize: 14,
                  textDecoration: 'none',
                  fontFamily: theme.fonts.sans,
                  fontWeight: 500,
                }}
              >
                Log in
              </a>
              <Button variant="secondary" size="md" asChild>
                <a href="/signup" style={{ textDecoration: 'none', color: 'inherit' }}>
                  Start free
                </a>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};